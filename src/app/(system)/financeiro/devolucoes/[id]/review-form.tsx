"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  MessageSquareWarning,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  approveAccountability,
  requestAccountabilityCorrection,
} from "./actions";

type ReviewFormProps = {
  requestId: string;
};

export default function ReviewForm({
  requestId,
}: ReviewFormProps) {
  const router =
    useRouter();

  const [
    notes,
    setNotes,
  ] = useState("");

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null
    );

  const [
    pending,
    startTransition,
  ] = useTransition();

  function approve() {
    setError(null);
    setSuccess(null);

    startTransition(
      async () => {
        const result =
          await approveAccountability(
            requestId,
            notes
          );

        if (
          !result.success
        ) {
          setError(
            result.error
          );

          return;
        }

        setSuccess(
          "Prestação de contas aprovada. Processo concluído."
        );

        router.refresh();
      }
    );
  }

  function requestCorrection() {
    setError(null);
    setSuccess(null);

    if (
      !notes.trim()
    ) {
      setError(
        "Informe no campo de observações o que precisa ser corrigido."
      );

      return;
    }

    startTransition(
      async () => {
        const result =
          await requestAccountabilityCorrection(
            requestId,
            notes
          );

        if (
          !result.success
        ) {
          setError(
            result.error
          );

          return;
        }

        setSuccess(
          "Correção solicitada. O link externo foi reaberto para o colaborador."
        );

        router.refresh();
      }
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          <AlertCircle
            size={17}
            className="shrink-0"
          />

          {error}
        </div>
      )}

      {success && (
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-medium text-emerald-700">
          <CheckCircle2
            size={17}
            className="shrink-0"
          />

          {success}
        </div>
      )}

      <div>
        <label className="mb-2 block text-xs font-semibold text-slate-700">
          Observações da conferência
        </label>

        <textarea
          value={
            notes
          }
          onChange={(
            event
          ) =>
            setNotes(
              event.target.value
            )
          }
          rows={5}
          disabled={
            pending
          }
          placeholder="Informe divergências, documentos faltantes ou alguma observação sobre a prestação..."
          className="w-full resize-none rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:bg-slate-100"
        />
      </div>

      <button
        type="button"
        onClick={
          requestCorrection
        }
        disabled={
          pending
        }
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 disabled:opacity-50"
      >
        {pending ? (
          <LoaderCircle
            size={17}
            className="animate-spin"
          />
        ) : (
          <MessageSquareWarning
            size={17}
          />
        )}

        Solicitar correção
      </button>

      <button
        type="button"
        onClick={
          approve
        }
        disabled={
          pending
        }
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-4 text-sm font-semibold text-white transition hover:bg-[#921717] disabled:opacity-50"
      >
        {pending ? (
          <LoaderCircle
            size={18}
            className="animate-spin"
          />
        ) : (
          <CheckCircle2
            size={18}
          />
        )}

        Aprovar prestação
      </button>
    </div>
  );
}