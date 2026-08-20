"use client";

import {
  useActionState,
  useRef,
} from "react";

import {
  AlertCircle,
  Check,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileCheck2,
  LoaderCircle,
  MessageSquareWarning,
  ShieldCheck,
  XCircle,
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

type WorkflowAction =
  | "approve_release"
  | "request_adjustment"
  | "reject";

const initialState: FinanceWorkflowState = {
  error: null,
  success: null,
};

const visibleStages = [
  {
    number: 1,
    label: "Solicitado",
  },
  {
    number: 2,
    label: "Cartão liberado",
  },
  {
    number: 3,
    label: "Prestação de contas",
  },
  {
    number: 4,
    label: "Concluído",
  },
];

const approvalStatuses = [
  "draft",
  "submitted",
  "under_review",
  "awaiting_information",
  "awaiting_approval",
  "approved",
  "card_reserved",
];

const cardReleasedStatuses = [
  "card_delivered",
  "in_use",
  "awaiting_return",
];

const accountabilityStatuses = [
  "returned",
  "accountability_review",
];

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

  const formRef =
    useRef<HTMLFormElement>(
      null
    );

  const workflowActionRef =
    useRef<HTMLInputElement>(
      null
    );

  // ==========================================================
  // SUBMISSÃO CONTROLADA
  //
  // 1. Grava a ação no hidden
  // 2. Confirma que o valor foi gravado
  // 3. Só então envia o formulário
  // ==========================================================

  function submitWorkflowAction(
    action: WorkflowAction
  ) {
    if (
      !workflowActionRef.current ||
      !formRef.current
    ) {
      return;
    }

    workflowActionRef.current.value =
      action;

    formRef.current.requestSubmit();
  }

  const currentStage =
    getCurrentStage(
      request.status
    );

  const canApprove =
    approvalStatuses.includes(
      request.status
    );

  const cardReleased =
    cardReleasedStatuses.includes(
      request.status
    );

  const accountability =
    accountabilityStatuses.includes(
      request.status
    );

  const completed =
    request.status ===
    "completed";

  const rejected =
    request.status ===
    "rejected";

  const cancelled =
    request.status ===
    "cancelled";

  const awaitingAdjustment =
    request.status ===
    "awaiting_information";

  const currentCardAvailable =
    request.assigned_card_id
      ? cards.some(
          (card) =>
            card.id ===
            request.assigned_card_id
        )
      : false;

  const hasSelectableCard =
    currentCardAvailable ||
    cards.some(
      (card) =>
        card.active &&
        card.status ===
          "available"
    );

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-6"
    >
      {/* CAMPOS INTERNOS */}

      <input
        type="hidden"
        name="request_id"
        value={request.id}
      />

      <input
        ref={
          workflowActionRef
        }
        type="hidden"
        name="workflow_action"
        defaultValue=""
      />

      {/* ERRO */}

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

      {/* SUCESSO */}

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
          FLUXO COM 4 ETAPAS
      ====================================================== */}

      <div>
        <div className="mb-3">
          <p className="text-xs font-semibold text-slate-800">
            Andamento da solicitação
          </p>

          <p className="mt-1 text-[11px] text-slate-500">
            O processo possui apenas
            quatro etapas principais.
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {visibleStages.map(
            (stage) => {
              const done =
                currentStage >
                stage.number;

              const active =
                currentStage ===
                stage.number;

              return (
                <div
                  key={
                    stage.number
                  }
                  className="min-w-0"
                >
                  <div
                    className={[
                      "flex h-9 w-full items-center justify-center rounded-lg border transition",
                      done
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : active
                          ? "border-[#AF1B1B]/30 bg-[#AF1B1B]/[0.06] text-[#AF1B1B]"
                          : "border-slate-200 bg-slate-50 text-slate-400",
                    ].join(
                      " "
                    )}
                  >
                    {done ? (
                      <Check
                        size={15}
                      />
                    ) : (
                      <span className="text-xs font-bold">
                        {
                          stage.number
                        }
                      </span>
                    )}
                  </div>

                  <p
                    className={[
                      "mt-2 truncate text-center text-[10px] font-semibold",
                      active
                        ? "text-slate-900"
                        : done
                          ? "text-emerald-700"
                          : "text-slate-400",
                    ].join(
                      " "
                    )}
                    title={
                      stage.label
                    }
                  >
                    {
                      stage.label
                    }
                  </p>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* AGUARDANDO AJUSTE */}

      {awaitingAdjustment && (
        <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <MessageSquareWarning
            size={18}
            className="mt-0.5 shrink-0 text-amber-700"
          />

          <div>
            <p className="text-xs font-semibold text-amber-900">
              Aguardando ajuste do
              solicitante
            </p>

            <p className="mt-1 text-[11px] leading-5 text-amber-800">
              A solicitação continua na
              etapa Solicitado.
            </p>
          </div>
        </div>
      )}

      {/* REPROVADO */}

      {rejected && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <XCircle
            size={18}
            className="mt-0.5 shrink-0 text-red-700"
          />

          <div>
            <p className="text-xs font-semibold text-red-900">
              Solicitação reprovada
            </p>

            <p className="mt-1 text-[11px] leading-5 text-red-700">
              O processo foi encerrado
              pelo Financeiro.
            </p>
          </div>
        </div>
      )}

      {/* CANCELADO */}

      {cancelled && (
        <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
          <p className="text-xs font-semibold text-slate-800">
            Solicitação cancelada
          </p>

          <p className="mt-1 text-[11px] leading-5 text-slate-600">
            Não existem novas ações
            disponíveis.
          </p>
        </div>
      )}

      {/* =====================================================
          SOLICITAÇÃO / APROVAÇÃO
      ====================================================== */}

      {canApprove &&
        !rejected &&
        !cancelled && (
          <>
            <div className="rounded-xl border border-[#AF1B1B]/20 bg-[#AF1B1B]/[0.03] p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck
                  size={19}
                  className="mt-0.5 shrink-0 text-[#AF1B1B]"
                />

                <div>
                  <p className="text-xs font-semibold text-slate-900">
                    Decisão do Financeiro
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-slate-600">
                    A aprovação e a
                    liberação do cartão
                    são realizadas em uma
                    única ação.
                  </p>
                </div>
              </div>
            </div>

            {/* VALOR SOLICITADO */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">
                Valor solicitado
              </label>

              <div className="flex items-center gap-3 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3">
                <CircleDollarSign
                  size={17}
                  className="text-slate-500"
                />

                <span className="text-sm font-semibold text-slate-900">
                  {formatCurrency(
                    Number(
                      request.estimated_amount
                    )
                  )}
                </span>
              </div>
            </div>

            {/* VALOR APROVADO */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">
                Valor aprovado *
              </label>

              <input
                name="approved_amount"
                type="number"
                min="0.01"
                step="0.01"
                defaultValue={
                  request.approved_amount ??
                  request.estimated_amount
                }
                disabled={
                  pending
                }
                className={
                  fieldClasses
                }
              />
            </div>

            {/* CARTÃO */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">
                Cartão que será
                liberado *
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
                    pending
                  }
                  className={`${fieldClasses} pl-10`}
                >
                  <option value="">
                    Selecione um cartão
                  </option>

                  {cards.map(
                    (card) => (
                      <option
                        key={
                          card.id
                        }
                        value={
                          card.id
                        }
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
                      >
                        {
                          card.name
                        }
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

              {!hasSelectableCard && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-[11px] leading-5 text-amber-800">
                    Nenhum cartão
                    corporativo está
                    disponível.
                  </p>
                </div>
              )}
            </div>

            {/* DATA DEVOLUÇÃO */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">
                Previsão de devolução *
              </label>

              <input
                type="date"
                name="expected_return_date"
                defaultValue={
                  request.expected_return_date ??
                  ""
                }
                disabled={
                  pending
                }
                className={`${fieldClasses} [color-scheme:light]`}
              />
            </div>

            {/* OBSERVAÇÕES */}

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-700">
                Observações do
                Financeiro
              </label>

              <textarea
                name="finance_notes"
                defaultValue={
                  request.finance_notes ??
                  ""
                }
                disabled={
                  pending
                }
                rows={4}
                placeholder="Use este campo para orientações, solicitação de ajustes ou motivo da reprovação..."
                className={
                  textareaClasses
                }
              />
            </div>

            {/* =================================================
                APROVAR
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                submitWorkflowAction(
                  "approve_release"
                )
              }
              disabled={
                pending ||
                !hasSelectableCard
              }
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#921717] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? (
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                />
              ) : (
                <ShieldCheck
                  size={18}
                />
              )}

              {pending
                ? "Processando..."
                : "Aprovar e liberar cartão"}
            </button>

            {/* =================================================
                AJUSTE / REPROVAÇÃO
            ================================================= */}

            <div className="grid gap-3 sm:grid-cols-2">
              {!awaitingAdjustment && (
                <button
                  type="button"
                  onClick={() =>
                    submitWorkflowAction(
                      "request_adjustment"
                    )
                  }
                  disabled={
                    pending
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <MessageSquareWarning
                    size={16}
                  />

                  Solicitar ajuste
                </button>
              )}

              <button
                type="button"
                onClick={() =>
                  submitWorkflowAction(
                    "reject"
                  )
                }
                disabled={
                  pending
                }
                className={[
                  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50",
                  awaitingAdjustment
                    ? "sm:col-span-2"
                    : "",
                ].join(
                  " "
                )}
              >
                <XCircle
                  size={16}
                />

                Reprovar solicitação
              </button>
            </div>
          </>
        )}

      {/* =====================================================
          CARTÃO LIBERADO
      ====================================================== */}

      {cardReleased && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex gap-3">
            <CreditCard
              size={20}
              className="mt-0.5 shrink-0 text-emerald-700"
            />

            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Cartão liberado
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-800">
                A aprovação foi
                concluída. O próximo
                passo é a prestação de
                contas pelo solicitante.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          PRESTAÇÃO
      ====================================================== */}

      {accountability && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex gap-3">
            <FileCheck2
              size={20}
              className="mt-0.5 shrink-0 text-blue-700"
            />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Prestação de contas
                recebida
              </p>

              <p className="mt-1 text-xs leading-5 text-blue-800">
                A conferência deve ser
                realizada em Devoluções
                do Financeiro.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          CONCLUÍDO
      ====================================================== */}

      {completed && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex gap-3">
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0 text-emerald-700"
            />

            <div>
              <p className="text-sm font-semibold text-emerald-900">
                Processo concluído
              </p>

              <p className="mt-1 text-xs leading-5 text-emerald-800">
                A compra e a prestação
                de contas foram
                finalizadas.
              </p>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function getCurrentStage(
  status: string
) {
  if (
    status ===
    "completed"
  ) {
    return 4;
  }

  if (
    accountabilityStatuses.includes(
      status
    )
  ) {
    return 3;
  }

  if (
    cardReleasedStatuses.includes(
      status
    )
  ) {
    return 2;
  }

  return 1;
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