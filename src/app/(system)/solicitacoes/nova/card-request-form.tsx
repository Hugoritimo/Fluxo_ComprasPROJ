"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  AlertCircle,
  Building2,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  LoaderCircle,
  Mail,
  Send,
  Store,
  User,
} from "lucide-react";

import {
  createCardRequest,
  type CardRequestState,
} from "../actions";

type CardRequestFormProps = {
  profile: {
    fullName: string;
    email: string;
  };
};

const initialState: CardRequestState = {
  error: null,
};

const inputBaseClasses =
  "h-11 w-full rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:placeholder:text-slate-400";

const textareaBaseClasses =
  "w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 disabled:placeholder:text-slate-400";

export default function CardRequestForm({
  profile,
}: CardRequestFormProps) {
  const [state, formAction, pending] =
    useActionState(
      createCardRequest,
      initialState
    );

  const [
    purchaseReason,
    setPurchaseReason,
  ] = useState("");

  const today =
    new Intl.DateTimeFormat(
      "pt-BR"
    ).format(new Date());

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      {/* =====================================================
          ERRO
      ====================================================== */}

      {state.error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <span>{state.error}</span>
        </div>
      )}

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2 bg-[#AF1B1B]" />

        <div className="border-b border-slate-100 p-6 sm:p-7">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#AF1B1B]/10 text-[#AF1B1B]">
              <CreditCard size={24} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#AF1B1B]">
                Cartão de Crédito
              </p>

              <h1 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">
                Solicitação de Compra
              </h1>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-semibold text-amber-950">
              Atenção
            </p>

            <p className="mt-2 text-xs leading-5 text-amber-900">
              O número do pedido no Sienge não
              é necessário nesta etapa. Ele
              será obrigatório somente no
              momento da devolução e prestação
              de contas do cartão.
            </p>

            <p className="mt-2 text-xs leading-5 text-amber-800">
              Após a utilização do cartão,
              também será obrigatório anexar
              a Nota Fiscal ou Cupom Fiscal e
              o comprovante da transação.
            </p>
          </div>
        </div>

        <div className="grid gap-5 p-6 sm:p-7 md:grid-cols-3">
          <ReadOnlyField
            icon={Mail}
            label="E-mail"
            value={profile.email}
          />

          <ReadOnlyField
            icon={CalendarDays}
            label="Data da solicitação"
            value={today}
          />

          <ReadOnlyField
            icon={User}
            label="Responsável / Solicitante"
            value={profile.fullName}
          />
        </div>
      </section>

      {/* =====================================================
          DADOS DA COMPRA
      ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Dados da compra
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-600">
            Informe os dados iniciais da
            compra que será realizada com o
            cartão corporativo.
          </p>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          {/* =================================================
              CENTRO DE CUSTO
          ================================================= */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Centro de custo ou Obra *
            </label>

            <div className="relative">
              <Building2
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                name="cost_center_or_site"
                required
                disabled={pending}
                placeholder="Informe o centro de custo ou obra"
                className={`${inputBaseClasses} pl-10 pr-4`}
              />
            </div>
          </div>

          {/* =================================================
              FORNECEDOR
          ================================================= */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Fornecedor(es) *
            </label>

            <div className="relative">
              <Store
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                name="suppliers_text"
                required
                disabled={pending}
                placeholder="Informe onde será realizada a compra"
                className={`${inputBaseClasses} pl-10 pr-4`}
              />
            </div>
          </div>

          {/* =================================================
              VALOR
          ================================================= */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Valor previsto da compra *
            </label>

            <div className="relative">
              <CircleDollarSign
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                name="estimated_amount"
                inputMode="decimal"
                required
                disabled={pending}
                placeholder="0,00"
                className={`${inputBaseClasses} pl-10 pr-4`}
              />
            </div>
          </div>

          {/* =================================================
              FORMA DE PAGAMENTO
          ================================================= */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Tipo de pagamento
            </label>

            <div className="flex h-11 items-center gap-3 rounded-xl border border-[#AF1B1B]/25 bg-[#AF1B1B]/[0.04] px-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#AF1B1B]/10 text-[#AF1B1B]">
                <CreditCard size={17} />
              </div>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  Cartão de crédito
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          JUSTIFICATIVA
      ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="text-lg font-semibold text-slate-950">
            Justificativa
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-600">
            Explique por que a compra será
            realizada com cartão.
          </p>
        </div>

        <div className="space-y-6 p-6">
          {/* =================================================
              MOTIVO
          ================================================= */}

          <div>
            <label className="mb-3 block text-sm font-semibold text-slate-800">
              Motivo da compra por cartão de
              crédito *
            </label>

            <div className="grid gap-3 md:grid-cols-3">
              <ReasonOption
                label="Emergencial"
                value="emergency"
                checked={
                  purchaseReason ===
                  "emergency"
                }
                onChange={
                  setPurchaseReason
                }
              />

              <ReasonOption
                label="Sem fornecedor cadastrado"
                value="supplier_not_registered"
                checked={
                  purchaseReason ===
                  "supplier_not_registered"
                }
                onChange={
                  setPurchaseReason
                }
              />

              <ReasonOption
                label="Outro"
                value="other"
                checked={
                  purchaseReason ===
                  "other"
                }
                onChange={
                  setPurchaseReason
                }
              />
            </div>

            {purchaseReason ===
              "other" && (
              <input
                name="purchase_reason_other"
                required
                disabled={pending}
                placeholder="Informe o motivo..."
                className={`${inputBaseClasses} mt-3 px-4`}
              />
            )}
          </div>

          {/* =================================================
              FINALIDADE
          ================================================= */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Onde será usado? Qual a
              finalidade? *
            </label>

            <textarea
              name="purpose"
              required
              disabled={pending}
              rows={5}
              placeholder="Informe onde será utilizado, o tipo de material e qual a necessidade da compra."
              className={
                textareaBaseClasses
              }
            />
          </div>

          {/* =================================================
              OBSERVAÇÕES
          ================================================= */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Observações adicionais
            </label>

            <textarea
              name="notes"
              disabled={pending}
              rows={3}
              placeholder="Informações complementares, caso necessário."
              className={
                textareaBaseClasses
              }
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          BOTÃO
      ====================================================== */}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 min-w-48 items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#921717] focus:outline-none focus:ring-4 focus:ring-[#AF1B1B]/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
          ) : (
            <Send size={18} />
          )}

          {pending
            ? "Enviando..."
            : "Enviar solicitação"}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// CAMPO SOMENTE LEITURA
// ============================================================

function ReadOnlyField({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 text-slate-600">
        <Icon size={15} />

        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          {label}
        </span>
      </div>

      <p className="mt-2 break-words text-sm font-semibold text-slate-900">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// OPÇÃO DE MOTIVO
// ============================================================

function ReasonOption({
  label,
  value,
  checked,
  onChange,
}: {
  label: string;
  value: string;
  checked: boolean;
  onChange: (
    value: string
  ) => void;
}) {
  return (
    <label
      className={[
        "flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition",
        checked
          ? "border-[#AF1B1B] bg-[#AF1B1B]/[0.05] shadow-sm"
          : "border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50",
      ].join(" ")}
    >
      <input
        type="radio"
        name="purchase_reason"
        value={value}
        required
        checked={checked}
        onChange={() =>
          onChange(value)
        }
        className="h-4 w-4 accent-[#AF1B1B]"
      />

      <span
        className={[
          "text-sm font-semibold",
          checked
            ? "text-slate-950"
            : "text-slate-800",
        ].join(" ")}
      >
        {label}
      </span>
    </label>
  );
}