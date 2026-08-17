"use client";

import {
  useActionState,
} from "react";

import {
  AlertCircle,
  Building2,
  CreditCard,
  Landmark,
  LoaderCircle,
  Save,
} from "lucide-react";

import {
  createCard,
  type CardFormState,
} from "../actions";

const initialState: CardFormState = {
  error: null,
};

export default function CardForm() {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    createCard,
    initialState
  );

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          {state.error}
        </div>
      )}

      {/* IDENTIFICAÇÃO */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Identificação do cartão *
        </label>

        <div className="relative">
          <CreditCard
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            name="name"
            required
            disabled={pending}
            placeholder="Ex.: Corporativo 01"
            className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
          />
        </div>
      </div>

      {/* BANCO */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Banco *
        </label>

        <div className="relative">
          <Landmark
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            name="bank_name"
            required
            disabled={pending}
            placeholder="Ex.: Itaú"
            className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
          />
        </div>
      </div>

      {/* ÚLTIMOS DÍGITOS */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Últimos 4 dígitos *
        </label>

        <input
          name="last_four_digits"
          required
          inputMode="numeric"
          maxLength={4}
          pattern="[0-9]{4}"
          disabled={pending}
          placeholder="0000"
          className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm tracking-[0.3em] outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
        />

        <p className="mt-2 text-xs text-slate-400">
          O sistema não armazena número
          completo nem código de segurança
          do cartão.
        </p>
      </div>

      {/* LIMITE */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Limite do cartão
        </label>

        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
            R$
          </span>

          <input
            name="credit_limit"
            type="number"
            min="0"
            step="0.01"
            disabled={pending}
            placeholder="0,00"
            className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
          />
        </div>
      </div>

      {/* OBSERVAÇÕES */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Observações
        </label>

        <textarea
          name="notes"
          rows={4}
          disabled={pending}
          placeholder="Informações internas sobre este cartão..."
          className="w-full resize-none rounded-xl border border-slate-200 p-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
        />
      </div>

      {/* INFORMAÇÃO */}

      <div className="flex gap-3 rounded-xl bg-slate-50 p-4">
        <Building2
          size={18}
          className="mt-0.5 shrink-0 text-slate-400"
        />

        <p className="text-xs leading-5 text-slate-500">
          Após o cadastro, o cartão ficará
          automaticamente com status{" "}
          <strong className="text-slate-700">
            Disponível
          </strong>{" "}
          e poderá ser vinculado às
          solicitações aprovadas.
        </p>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white transition hover:bg-[#921717] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <LoaderCircle
            size={18}
            className="animate-spin"
          />
        ) : (
          <Save size={18} />
        )}

        {pending
          ? "Cadastrando..."
          : "Cadastrar cartão"}
      </button>
    </form>
  );
}