"use client";

import type {
  FormEvent,
} from "react";

import {
  useState,
  useTransition,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  LockKeyhole,
  Save,
  UserRound,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  updateDeliveryConfirmation,
} from "./actions";

// ============================================================
// TIPOS
// ============================================================

type DeliveryConfirmationFormProps = {
  itemId: string;

  requestKey: string;

  currentStatus:
    | string
    | null;

  currentDate:
    | string
    | null;

  currentReceivedBy:
    | string
    | null;

  currentInvoiceNumber:
    | string
    | null;

  disabled?: boolean;
};

// ============================================================
// STATUS
// ============================================================

const DELIVERY_STATUS_OPTIONS = [
  "Aguardando entrega",
  "Em transporte",
  "Entregue parcialmente",
  "Entregue",
] as const;

// ============================================================
// COMPONENTE
// ============================================================

export default function DeliveryConfirmationForm({
  itemId,
  requestKey,
  currentStatus,
  currentDate,
  currentReceivedBy,
  currentInvoiceNumber,
  disabled = false,
}: DeliveryConfirmationFormProps) {
  const router =
    useRouter();

  // =========================================================
  // STATUS INICIAL
  // =========================================================

  const validInitialStatus =
    DELIVERY_STATUS_OPTIONS.includes(
      currentStatus as
        (typeof DELIVERY_STATUS_OPTIONS)[number]
    )
      ? currentStatus ?? ""
      : "";

  // =========================================================
  // ESTADOS
  // =========================================================

  const [
    deliveryStatus,
    setDeliveryStatus,
  ] =
    useState(
      validInitialStatus
    );

  const [
    deliveryDate,
    setDeliveryDate,
  ] =
    useState(
      currentDate ?? ""
    );

  const [
    receivedBy,
    setReceivedBy,
  ] =
    useState(
      currentReceivedBy ?? ""
    );

  const [
    invoiceNumber,
    setInvoiceNumber,
  ] =
    useState(
      currentInvoiceNumber ?? ""
    );

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  // =========================================================
  // JÁ EXISTE RECEBIMENTO?
  // =========================================================

  const isReceiptStatus =
    deliveryStatus ===
      "Entregue" ||
    deliveryStatus ===
      "Entregue parcialmente";

  // =========================================================
  // ALTERAR STATUS
  // =========================================================

  function handleStatusChange(
    value: string
  ) {
    setDeliveryStatus(
      value
    );

    setError(
      null
    );

    setSuccess(
      null
    );

    const isReceipt =
      value ===
        "Entregue" ||
      value ===
        "Entregue parcialmente";

    // ========================================================
    // RECEBIMENTO
    // ========================================================

    if (
      isReceipt
    ) {
      if (
        !deliveryDate
      ) {
        setDeliveryDate(
          getTodayInputValue()
        );
      }

      return;
    }

    // ========================================================
    // AINDA NÃO RECEBIDO
    //
    // Evita manter dados antigos quando o usuário voltar
    // para "Aguardando entrega" ou "Em transporte".
    // ========================================================

    setDeliveryDate(
      ""
    );

    setReceivedBy(
      ""
    );

    setInvoiceNumber(
      ""
    );
  }

  // =========================================================
  // SUBMIT
  // =========================================================

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      disabled ||
      isPending
    ) {
      return;
    }

    setError(
      null
    );

    setSuccess(
      null
    );

    const formData =
      new FormData(
        event.currentTarget
      );

    startTransition(
      async () => {
        const result =
          await updateDeliveryConfirmation(
            formData
          );

        if (
          !result.success
        ) {
          setError(
            result.error ??
              "Não foi possível salvar as informações de recebimento."
          );

          return;
        }

        setSuccess(
          result.message ??
            "Informações de recebimento atualizadas."
        );

        // ====================================================
        // ATUALIZA CONTADOR DE PENDÊNCIAS
        // ====================================================

        window.dispatchEvent(
          new Event(
            "projeta:pending-refresh"
          )
        );

        router.refresh();
      }
    );
  }

  // =========================================================
  // BLOQUEADO
  // =========================================================

  if (
    disabled
  ) {
    return (
      <div className="rounded-xl border border-yellow-300/70 bg-white/70 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-yellow-100 text-yellow-700">
            <LockKeyhole
              size={
                15
              }
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-800">
              Aguardando liberação para recebimento
            </p>

            <p className="mt-1 max-w-2xl text-[10px] leading-5 text-slate-500">
              A confirmação será liberada quando o pedido estiver
              comprado ou entrar no processo de entrega.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // FORM
  // =========================================================

  return (
    <form
      onSubmit={
        handleSubmit
      }
    >
      {/* =====================================================
          IDS
      ====================================================== */}

      <input
        type="hidden"
        name="itemId"
        value={
          itemId
        }
      />

      <input
        type="hidden"
        name="requestKey"
        value={
          requestKey
        }
      />

      {/* =====================================================
          ORIENTAÇÃO
      ====================================================== */}

      <div className="mb-4 flex items-start gap-3 rounded-xl border border-yellow-300/60 bg-white/70 px-4 py-3">
        <Info
          size={
            15
          }
          className="mt-0.5 shrink-0 text-yellow-700"
        />

        <p className="text-[10px] leading-5 text-slate-500">
          Esta etapa é de responsabilidade do solicitante. Atualize
          as informações conforme o recebimento físico do material.
        </p>
      </div>

      {/* =====================================================
          CAMPOS
      ====================================================== */}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* ===================================================
            STATUS
        ==================================================== */}

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <CheckCircle2
              size={
                11
              }
              className="text-yellow-700"
            />

            Status da Entrega
          </span>

          <select
            name="deliveryStatus"
            value={
              deliveryStatus
            }
            onChange={(
              event
            ) =>
              handleStatusChange(
                event.target.value
              )
            }
            disabled={
              isPending
            }
            required
            className="h-11 w-full rounded-xl border border-yellow-300/70 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition hover:border-yellow-400 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-400/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">
              Selecione...
            </option>

            {DELIVERY_STATUS_OPTIONS.map(
              (
                status
              ) => (
                <option
                  key={
                    status
                  }
                  value={
                    status
                  }
                >
                  {status}
                </option>
              )
            )}
          </select>
        </label>

        {/* ===================================================
            DATA
        ==================================================== */}

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <CalendarDays
              size={
                11
              }
              className="text-yellow-700"
            />

            Data
          </span>

          <input
            type="date"
            name="deliveryDate"
            value={
              deliveryDate
            }
            onChange={(
              event
            ) => {
              setDeliveryDate(
                event.target.value
              );

              setError(
                null
              );

              setSuccess(
                null
              );
            }}
            disabled={
              !isReceiptStatus ||
              isPending
            }
            required={
              isReceiptStatus
            }
            max={
              getTodayInputValue()
            }
            className="h-11 w-full rounded-xl border border-yellow-300/70 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition hover:border-yellow-400 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-400/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
          />
        </label>

        {/* ===================================================
            RECEBIDO POR
        ==================================================== */}

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <UserRound
              size={
                11
              }
              className="text-yellow-700"
            />

            Recebido por
          </span>

          <input
            type="text"
            name="receivedBy"
            value={
              receivedBy
            }
            onChange={(
              event
            ) => {
              setReceivedBy(
                event.target.value
              );

              setError(
                null
              );

              setSuccess(
                null
              );
            }}
            disabled={
              !isReceiptStatus ||
              isPending
            }
            required={
              isReceiptStatus
            }
            maxLength={
              150
            }
            placeholder="Nome de quem recebeu"
            className="h-11 w-full rounded-xl border border-yellow-300/70 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-300 hover:border-yellow-400 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-400/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
          />
        </label>

        {/* ===================================================
            NOTA FISCAL
        ==================================================== */}

        <label className="block">
          <span className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
            <FileText
              size={
                11
              }
              className="text-yellow-700"
            />

            Nota Fiscal
          </span>

          <input
            type="text"
            name="invoiceNumber"
            value={
              invoiceNumber
            }
            onChange={(
              event
            ) => {
              setInvoiceNumber(
                event.target.value
              );

              setError(
                null
              );

              setSuccess(
                null
              );
            }}
            disabled={
              !isReceiptStatus ||
              isPending
            }
            required={
              deliveryStatus ===
              "Entregue"
            }
            maxLength={
              100
            }
            placeholder={
              deliveryStatus ===
              "Entregue"
                ? "Informe o número da NF"
                : "Número da NF"
            }
            className="h-11 w-full rounded-xl border border-yellow-300/70 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition placeholder:text-slate-300 hover:border-yellow-400 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-400/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100"
          />
        </label>
      </div>

      {/* =====================================================
          AJUDA
      ====================================================== */}

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[9px] text-slate-400">
        {!isReceiptStatus ? (
          <span>
            Data, recebido por e nota fiscal serão liberados quando
            houver recebimento.
          </span>
        ) : (
          <>
            <span>
              Data e recebido por são obrigatórios.
            </span>

            {deliveryStatus ===
              "Entregue" && (
              <span>
                A Nota Fiscal é obrigatória para concluir a entrega.
              </span>
            )}
          </>
        )}
      </div>

      {/* =====================================================
          RODAPÉ
      ====================================================== */}

      <div className="mt-5 flex flex-col gap-3 border-t border-yellow-300/50 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-[10px] font-semibold text-red-700">
                {error}
              </p>
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-[10px] font-semibold text-emerald-700">
                {success}
              </p>
            </div>
          )}

          {!error &&
            !success && (
              <p className="text-[9px] leading-4 text-slate-400">
                As informações serão registradas somente para este
                item do pedido.
              </p>
            )}
        </div>

        <button
          type="submit"
          disabled={
            isPending ||
            !deliveryStatus
          }
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#171717] px-5 text-[10px] font-semibold text-white shadow-sm transition hover:bg-[#AF1B1B] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? (
            <>
              <Loader2
                size={
                  13
                }
                className="animate-spin"
              />

              Salvando...
            </>
          ) : (
            <>
              <Save
                size={
                  13
                }
              />

              Salvar recebimento
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ============================================================
// DATA LOCAL
// ============================================================

function getTodayInputValue() {
  const date =
    new Date();

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() +
        1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;
}