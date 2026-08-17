"use client";

import { useActionState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  Save,
} from "lucide-react";

import {
  type FinanceWorkflowState,
  updateFinanceWorkflow,
} from "./actions";

type CardOption = {
  id: string;
  name: string;
  bank_name: string | null;
  last_four_digits: string;
  status: string;
  active: boolean;
};

type WorkflowFormProps = {
  request: {
    id: string;
    status: string;

    estimated_amount:
      | number
      | string;

    approved_amount:
      | number
      | string
      | null;

    assigned_card_id:
      | string
      | null;

    expected_return_date:
      | string
      | null;

    finance_notes:
      | string
      | null;
  };

  cards: CardOption[];
};

type StatusOption = {
  value: string;
  label: string;
};

const initialState: FinanceWorkflowState = {
  error: null,
  success: null,
};

const statusLabels: Record<
  string,
  string
> = {
  draft: "Rascunho",
  submitted: "Solicitação enviada",
  under_review: "Em análise",
  awaiting_information:
    "Aguardando informações",
  awaiting_approval:
    "Aguardando aprovação",
  approved: "Aprovado",
  rejected: "Reprovado",
  card_reserved: "Cartão reservado",
  card_delivered: "Cartão liberado",
  in_use: "Em utilização",
  awaiting_return:
    "Aguardando devolução",
  returned: "Devolvido",
  accountability_review:
    "Em conferência",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const cardStatusLabels: Record<
  string,
  string
> = {
  available: "Disponível",
  reserved: "Reservado",
  in_use: "Em uso",
  blocked: "Bloqueado",
  inactive: "Inativo",
};

const workflowTransitions: Record<
  string,
  StatusOption[]
> = {
  draft: [
    {
      value: "submitted",
      label: "Solicitação enviada",
    },
    {
      value: "cancelled",
      label: "Cancelar solicitação",
    },
  ],

  submitted: [
    {
      value: "under_review",
      label: "Iniciar análise",
    },
    {
      value: "awaiting_information",
      label: "Aguardar informações",
    },
    {
      value: "cancelled",
      label: "Cancelar solicitação",
    },
  ],

  under_review: [
    {
      value: "awaiting_information",
      label: "Solicitar informações",
    },
    {
      value: "awaiting_approval",
      label: "Enviar para aprovação",
    },
    {
      value: "rejected",
      label: "Reprovar",
    },
    {
      value: "cancelled",
      label: "Cancelar solicitação",
    },
  ],

  awaiting_information: [
    {
      value: "under_review",
      label: "Retomar análise",
    },
    {
      value: "cancelled",
      label: "Cancelar solicitação",
    },
  ],

  awaiting_approval: [
    {
      value: "approved",
      label: "Aprovar solicitação",
    },
    {
      value: "rejected",
      label: "Reprovar solicitação",
    },
    {
      value: "under_review",
      label: "Retornar para análise",
    },
    {
      value: "cancelled",
      label: "Cancelar solicitação",
    },
  ],

  approved: [
    {
      value: "card_reserved",
      label: "Reservar cartão",
    },
    {
      value: "cancelled",
      label: "Cancelar solicitação",
    },
  ],

  card_reserved: [
    {
      value: "card_delivered",
      label: "Liberar cartão",
    },
    {
      value: "approved",
      label: "Desfazer reserva",
    },
    {
      value: "cancelled",
      label: "Cancelar solicitação",
    },
  ],

  card_delivered: [
    {
      value: "in_use",
      label:
        "Marcar como em utilização",
    },
    {
      value: "awaiting_return",
      label: "Aguardar devolução",
    },
  ],

  in_use: [
    {
      value: "awaiting_return",
      label: "Aguardar devolução",
    },
  ],

  awaiting_return: [],

  returned: [
    {
      value:
        "accountability_review",
      label: "Iniciar conferência",
    },
  ],

  accountability_review: [
    {
      value: "completed",
      label:
        "Concluir prestação de contas",
    },
    {
      value: "returned",
      label: "Retornar devolução",
    },
  ],

  completed: [],
  rejected: [],
  cancelled: [],
};

const fieldClasses =
  "h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600";

const textareaClasses =
  "w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600";

export default function WorkflowForm({
  request,
  cards,
}: WorkflowFormProps) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    updateFinanceWorkflow,
    initialState
  );

  const nextStatuses =
    workflowTransitions[
      request.status
    ] ?? [];

  const isTerminal =
    nextStatuses.length === 0;

  const requiresApprovedAmount =
    [
      "awaiting_approval",
      "approved",
      "card_reserved",
      "card_delivered",
      "in_use",
      "awaiting_return",
      "returned",
      "accountability_review",
      "completed",
    ].includes(request.status);

  const requiresCard =
    [
      "approved",
      "card_reserved",
      "card_delivered",
      "in_use",
      "awaiting_return",
      "returned",
      "accountability_review",
      "completed",
    ].includes(request.status);

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      <input
        type="hidden"
        name="request_id"
        value={request.id}
      />

      {/* =====================================================
          ERRO
      ====================================================== */}

      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0"
          />

          <span>
            {state.error}
          </span>
        </div>
      )}

      {/* =====================================================
          SUCESSO
      ====================================================== */}

      {state.success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-700">
          <CheckCircle2
            size={16}
            className="mt-0.5 shrink-0"
          />

          <span>
            {state.success}
          </span>
        </div>
      )}

      {/* =====================================================
          STATUS ATUAL
      ====================================================== */}

      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-700">
          Status atual
        </label>

        <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">
            {statusLabels[
              request.status
            ] ??
              request.status}
          </p>
        </div>
      </div>

      {/* =====================================================
          PRÓXIMO STATUS
      ====================================================== */}

      {!isTerminal ? (
        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-700">
            Próximo andamento
          </label>

          <select
            name="status"
            defaultValue=""
            required
            disabled={pending}
            className={fieldClasses}
          >
            <option
              value=""
              disabled
              className="text-slate-500"
            >
              Selecione o próximo andamento
            </option>

            {nextStatuses.map(
              (status) => (
                <option
                  key={
                    status.value
                  }
                  value={
                    status.value
                  }
                  className="bg-white text-slate-900"
                >
                  {status.label}
                </option>
              )
            )}
          </select>

          <p className="mt-2 text-[11px] leading-5 text-slate-600">
            O sistema exibe somente os
            próximos status permitidos
            para esta etapa.
          </p>
        </div>
      ) : (
        <input
          type="hidden"
          name="status"
          value={request.status}
        />
      )}

      {/* =====================================================
          VALOR SOLICITADO
      ====================================================== */}

      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-700">
          Valor solicitado
        </label>

        <div className="rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">
          {formatCurrency(
            Number(
              request.estimated_amount
            )
          )}
        </div>
      </div>

      {/* =====================================================
          VALOR APROVADO
      ====================================================== */}

      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-700">
          Valor aprovado
        </label>

        <input
          name="approved_amount"
          type="number"
          min="0"
          step="0.01"
          defaultValue={
            request.approved_amount ??
            request.estimated_amount
          }
          disabled={
            pending ||
            isTerminal
          }
          className={fieldClasses}
        />

        {!requiresApprovedAmount && (
          <p className="mt-2 text-[11px] leading-5 text-slate-600">
            O valor pode ser ajustado
            durante a análise antes da
            aprovação.
          </p>
        )}
      </div>

      {/* =====================================================
          CARTÃO
      ====================================================== */}

      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-700">
          Cartão
        </label>

        <div className="relative">
          <CreditCard
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
          />

          <select
            name="assigned_card_id"
            defaultValue={
              request.assigned_card_id ??
              ""
            }
            disabled={
              pending ||
              isTerminal
            }
            className={`${fieldClasses} pl-10`}
          >
            <option
              value=""
              className="bg-white text-slate-700"
            >
              Nenhum cartão selecionado
            </option>

            {cards.map(
              (card) => (
                <option
                  key={card.id}
                  value={card.id}
                  disabled={
                    !card.active ||
                    card.status ===
                      "blocked" ||
                    card.status ===
                      "inactive" ||
                    (
                      card.status !==
                        "available" &&
                      card.id !==
                        request.assigned_card_id
                    )
                  }
                  className="bg-white text-slate-900"
                >
                  {card.name}
                  {" · "}
                  {card.bank_name ??
                    "Banco não informado"}
                  {" · •••• "}
                  {
                    card.last_four_digits
                  }
                  {" · "}
                  {cardStatusLabels[
                    card.status
                  ] ??
                    card.status}
                </option>
              )
            )}
          </select>
        </div>

        {cards.length === 0 && (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-[11px] leading-5 text-amber-800">
              Nenhum cartão corporativo
              cadastrado. É possível
              analisar e aprovar, mas
              será necessário cadastrar
              um cartão antes de
              reservar.
            </p>
          </div>
        )}

        {!requiresCard && (
          <p className="mt-2 text-[11px] leading-5 text-slate-600">
            O cartão só será obrigatório
            quando a solicitação chegar
            à etapa de reserva.
          </p>
        )}
      </div>

      {/* =====================================================
          PREVISÃO DE DEVOLUÇÃO
      ====================================================== */}

      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-700">
          Previsão de devolução
        </label>

        <input
          type="date"
          name="expected_return_date"
          defaultValue={
            request.expected_return_date ??
            ""
          }
          disabled={
            pending ||
            isTerminal
          }
          className={`${fieldClasses} [color-scheme:light]`}
        />

        <p className="mt-2 text-[11px] leading-5 text-slate-600">
          Será obrigatória antes da
          liberação do cartão.
        </p>
      </div>

      {/* =====================================================
          OBSERVAÇÕES
      ====================================================== */}

      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-700">
          Observações do Financeiro
        </label>

        <textarea
          name="finance_notes"
          defaultValue={
            request.finance_notes ??
            ""
          }
          disabled={
            pending ||
            isTerminal
          }
          rows={5}
          placeholder="Informações internas sobre análise, aprovação ou liberação..."
          className={textareaClasses}
        />
      </div>

      {/* =====================================================
          ETAPA FINAL
      ====================================================== */}

      {isTerminal ? (
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-800">
            Nenhuma movimentação financeira
            disponível nesta etapa.
          </p>

          <p className="mt-1 text-[11px] leading-5 text-slate-600">
            O processo está aguardando uma
            ação de outra etapa do sistema
            ou já foi encerrado.
          </p>
        </div>
      ) : (
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#921717] focus:outline-none focus:ring-4 focus:ring-[#AF1B1B]/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle
              size={17}
              className="animate-spin"
            />
          ) : (
            <Save size={17} />
          )}

          {pending
            ? "Atualizando..."
            : "Atualizar solicitação"}
        </button>
      )}
    </form>
  );
}

function formatCurrency(
  value: number
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(value);
}