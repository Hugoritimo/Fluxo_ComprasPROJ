"use client";

import {
  useActionState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";

import {
  reviewReturn,
  type ReviewReturnState,
} from "./actions";

type ReviewFormProps = {
  requestId: string;
  status: string;
  previousNotes:
    string | null;
};

const initialState: ReviewReturnState = {
  error: null,
  success: null,
};

export default function ReviewForm({
  requestId,
  status,
  previousNotes,
}: ReviewFormProps) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    reviewReturn,
    initialState
  );

  if (
    status === "completed"
  ) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex gap-3">
          <CheckCircle2
            size={19}
            className="mt-0.5 shrink-0 text-emerald-600"
          />

          <div>
            <p className="text-sm font-semibold text-emerald-800">
              Prestação aprovada
            </p>

            <p className="mt-1 text-xs leading-5 text-emerald-700">
              Este processo já foi
              conferido e concluído.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      <input
        type="hidden"
        name="request_id"
        value={requestId}
      />

      {/* ERRO */}

      {state.error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle
            size={16}
            className="mt-0.5 shrink-0"
          />

          {state.error}
        </div>
      )}

      {/* SUCESSO */}

      {state.success && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          <CheckCircle2
            size={16}
            className="mt-0.5 shrink-0"
          />

          {state.success}
        </div>
      )}

      {/* OBSERVAÇÕES */}

      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-600">
          Observação da conferência
        </label>

        <textarea
          name="review_notes"
          rows={5}
          disabled={pending}
          defaultValue={
            previousNotes ??
            ""
          }
          placeholder="Informe observações da conferência. Para solicitar correção, descreva obrigatoriamente o que deve ser corrigido."
          className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
        />

        <p className="mt-2 text-[11px] leading-5 text-slate-400">
          A observação é opcional
          para aprovação e obrigatória
          quando houver solicitação de
          correção.
        </p>
      </div>

      {/* APROVAR */}

      <button
        type="submit"
        name="decision"
        value="approve"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
      >
        {pending ? (
          <LoaderCircle
            size={17}
            className="animate-spin"
          />
        ) : (
          <ShieldCheck
            size={17}
          />
        )}

        Aprovar prestação de contas
      </button>

      {/* CORREÇÃO */}

      <button
        type="submit"
        name="decision"
        value="correction"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        <RotateCcw
          size={17}
        />

        Solicitar correção
      </button>
    </form>
  );
}