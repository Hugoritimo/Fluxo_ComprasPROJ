"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  CheckCircle2,
  Clock3,
  Loader2,
  LockKeyhole,
  ShieldCheck,
  Undo2,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  releaseReceipt,
  revokeReceipt,
} from "./actions";

type Props = {
  itemId: string;

  requestKey: string;

  eligible: boolean;

  released: boolean;

  releasedAt:
    | string
    | null;

  releasedByName:
    | string
    | null;

  canManage: boolean;

  hasConfirmation: boolean;
};

export default function ReceiptReleaseControl({
  itemId,
  requestKey,
  eligible,
  released,
  releasedAt,
  releasedByName,
  canManage,
  hasConfirmation,
}: Props) {
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  function execute(
    action:
      (
        formData:
          FormData
      ) => Promise<{
        success:
          boolean;

        error:
          string | null;
      }>
  ) {
    setError(
      null
    );

    const formData =
      new FormData();

    formData.set(
      "itemId",
      itemId
    );

    formData.set(
      "requestKey",
      requestKey
    );

    startTransition(
      async () => {
        const result =
          await action(
            formData
          );

        if (
          !result.success
        ) {
          setError(
            result.error ??
              "Não foi possível concluir a operação."
          );

          return;
        }

        window.dispatchEvent(
          new Event(
            "projeta:pending-refresh"
          )
        );

        router.refresh();
      }
    );
  }

  if (
    released
  ) {
    return (
      <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600">
            <CheckCircle2
              size={
                18
              }
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-emerald-900">
              Recebimento liberado
            </p>

            <p className="mt-1 text-[10px] leading-5 text-emerald-800">
              {releasedByName
                ? `Liberado por ${releasedByName}`
                : "Liberação registrada pelo Financeiro"}
              {releasedAt
                ? ` em ${formatDateTime(
                    releasedAt
                  )}.`
                : "."}
            </p>

            {hasConfirmation && (
              <p className="mt-1 text-[10px] font-semibold text-emerald-700">
                O solicitante já registrou informações de recebimento.
              </p>
            )}
          </div>

          {canManage &&
            !hasConfirmation && (
            <button
              type="button"
              disabled={
                isPending
              }
              onClick={() =>
                execute(
                  revokeReceipt
                )
              }
              className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 text-[10px] font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-40"
            >
              {isPending ? (
                <Loader2
                  size={
                    13
                  }
                  className="animate-spin"
                />
              ) : (
                <Undo2
                  size={
                    13
                  }
                />
              )}

              Revogar liberação
            </button>
          )}
        </div>

        {error && (
          <p className="mt-3 text-[10px] font-semibold text-red-600">
            {
              error
            }
          </p>
        )}
      </div>
    );
  }

  if (
    !eligible
  ) {
    return (
      <div className="mb-5 flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400">
          <LockKeyhole
            size={
              15
            }
          />
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-700">
            Recebimento ainda indisponível
          </p>

          <p className="mt-1 text-[10px] leading-5 text-slate-500">
            O pedido ainda não atingiu uma etapa que permita a liberação do recebimento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600">
          {canManage ? (
            <ShieldCheck
              size={
                17
              }
            />
          ) : (
            <Clock3
              size={
                17
              }
            />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-amber-900">
            Aguardando liberação do Financeiro
          </p>

          <p className="mt-1 text-[10px] leading-5 text-amber-800">
            O pedido já está em uma etapa compatível, mas o recebimento ainda precisa ser liberado no sistema.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            disabled={
              isPending
            }
            onClick={() =>
              execute(
                releaseReceipt
              )
            }
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-[10px] font-semibold text-white transition hover:bg-[#921717] disabled:opacity-40"
          >
            {isPending ? (
              <>
                <Loader2
                  size={
                    13
                  }
                  className="animate-spin"
                />

                Liberando...
              </>
            ) : (
              <>
                <ShieldCheck
                  size={
                    13
                  }
                />

                Liberar recebimento
              </>
            )}
          </button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-[10px] font-semibold text-red-600">
          {
            error
          }
        </p>
      )}
    </div>
  );
}

function formatDateTime(
  value:
    string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle:
        "short",

      timeStyle:
        "short",

      timeZone:
        "America/Sao_Paulo",
    }
  ).format(
    date
  );
}