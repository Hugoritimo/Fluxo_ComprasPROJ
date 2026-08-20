"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  Building2,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  FileCheck2,
  FileText,
  Hash,
  LoaderCircle,
  Plus,
  Receipt,
  Store,
  Trash2,
  UploadCloud,
  UserRound,
  UserRoundCheck,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  submitExternalCardReturn,
  type ExternalReturnDocument,
  type ExternalReturnDocumentCategory,
  type ExternalReturnPurchase,
} from "./actions";

type ExternalReturnFormProps = {
  token: string;

  requestId: string;

  requestNumber: string;

  requesterName: string;

  requesterEmail: string;

  cardName: string;

  cardBankName:
    | string
    | null;

  cardLastFourDigits: string;

  approvedAmount: number;

  additionsTotal: number;

  authorizedTotal: number;

  expectedReturnDate:
    | string
    | null;
};

type PurchaseItem = {
  id: string;

  supplierName: string;

  amount: string;

  purchaseDate: string;

  notes: string;
};

const BUCKET =
  "card-documents";

const MAX_FILE_SIZE =
  8 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const inputClasses =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-100";

const textareaClasses =
  "w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-100";

export default function ExternalReturnForm({
  token,
  requestId,
  requestNumber,
  requesterName,
  requesterEmail,
  cardName,
  cardBankName,
  cardLastFourDigits,
  approvedAmount,
  additionsTotal,
  authorizedTotal,
  expectedReturnDate,
}: ExternalReturnFormProps) {
  const [
    siengeRequestNumber,
    setSiengeRequestNumber,
  ] = useState("");

  const [
    receivedByName,
    setReceivedByName,
  ] = useState("");

  const [
    returnNotes,
    setReturnNotes,
  ] = useState("");

  const [
    purchases,
    setPurchases,
  ] =
    useState<PurchaseItem[]>(
      () => [
        {
          id:
            crypto.randomUUID(),

          supplierName:
            "",

          amount:
            "",

          purchaseDate:
            "",

          notes:
            "",
        },
      ]
    );

  const [
    invoiceFiles,
    setInvoiceFiles,
  ] =
    useState<File[]>([]);

  const [
    receiptFiles,
    setReceiptFiles,
  ] =
    useState<File[]>([]);

  const [
    otherFiles,
    setOtherFiles,
  ] =
    useState<File[]>([]);

  const [
    pending,
    setPending,
  ] = useState(false);

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
  ] = useState(false);

  const totalUsed =
    useMemo(
      () =>
        purchases.reduce(
          (
            total,
            purchase
          ) =>
            total +
            parseMoney(
              purchase.amount
            ),

          0
        ),

      [purchases]
    );

  const balance =
    authorizedTotal -
    totalUsed;

  function addPurchase() {
    setPurchases(
      (current) => [
        ...current,

        {
          id:
            crypto.randomUUID(),

          supplierName:
            "",

          amount:
            "",

          purchaseDate:
            "",

          notes:
            "",
        },
      ]
    );
  }

  function removePurchase(
    id: string
  ) {
    setPurchases(
      (current) =>
        current.length === 1
          ? current
          : current.filter(
              (purchase) =>
                purchase.id !==
                id
            )
    );
  }

  function updatePurchase(
    id: string,

    field:
      | "supplierName"
      | "amount"
      | "purchaseDate"
      | "notes",

    value: string
  ) {
    setPurchases(
      (current) =>
        current.map(
          (purchase) =>
            purchase.id ===
            id
              ? {
                  ...purchase,

                  [field]:
                    value,
                }
              : purchase
        )
    );
  }

  async function submit(
    event:
      React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setError(null);

    if (
      !siengeRequestNumber.trim()
    ) {
      setError(
        "Informe o número da solicitação no Sienge."
      );

      return;
    }

    if (
      !receivedByName.trim()
    ) {
      setError(
        "Informe quem recebeu o cartão."
      );

      return;
    }

    const normalizedPurchases:
      ExternalReturnPurchase[] =
      [];

    for (
      let index = 0;
      index <
      purchases.length;
      index++
    ) {
      const purchase =
        purchases[index];

      const amount =
        parseMoney(
          purchase.amount
        );

      if (
        !purchase.supplierName.trim()
      ) {
        setError(
          `Informe o fornecedor da compra ${index + 1}.`
        );

        return;
      }

      if (
        !Number.isFinite(
          amount
        ) ||
        amount <= 0
      ) {
        setError(
          `Informe um valor válido para a compra ${index + 1}.`
        );

        return;
      }

      normalizedPurchases.push(
        {
          supplierName:
            purchase.supplierName.trim(),

          amount,

          purchaseDate:
            purchase.purchaseDate ||
            null,

          notes:
            purchase.notes.trim() ||
            null,
        }
      );
    }

    if (
      invoiceFiles.length ===
      0
    ) {
      setError(
        "Adicione pelo menos uma Nota Fiscal ou Cupom Fiscal."
      );

      return;
    }

    if (
      receiptFiles.length ===
      0
    ) {
      setError(
        "Adicione pelo menos um comprovante da transação."
      );

      return;
    }

    const allFiles = [
      ...invoiceFiles.map(
        (file) => ({
          file,

          category:
            "invoice" as const,
        })
      ),

      ...receiptFiles.map(
        (file) => ({
          file,

          category:
            "payment_receipt" as const,
        })
      ),

      ...otherFiles.map(
        (file) => ({
          file,

          category:
            "other" as const,
        })
      ),
    ];

    for (
      const item
      of allFiles
    ) {
      const validation =
        validateFile(
          item.file
        );

      if (validation) {
        setError(
          validation
        );

        return;
      }
    }

    setPending(true);

    const supabase =
      createClient();

    const uploadedPaths:
      string[] = [];

    try {
      const documents:
        ExternalReturnDocument[] =
        [];

      for (
        const item
        of allFiles
      ) {
        const uploaded =
          await uploadExternalFile(
            {
              supabase,

              token,

              requestId,

              file:
                item.file,

              category:
                item.category,
            }
          );

        if (
          !uploaded.document
        ) {
          throw new Error(
            uploaded.error ??
              "Não foi possível enviar um dos arquivos."
          );
        }

        documents.push(
          uploaded.document
        );

        uploadedPaths.push(
          uploaded.document
            .storagePath
        );
      }

      const result =
        await submitExternalCardReturn(
          {
            token,

            siengeRequestNumber,

            receivedByName,

            returnNotes,

            purchases:
              normalizedPurchases,

            documents,
          }
        );

      if (
        !result.success
      ) {
        await cleanupFiles(
          supabase,
          uploadedPaths
        );

        setError(
          result.error ??
            "Não foi possível registrar a devolução."
        );

        return;
      }

      setSuccess(true);

      window.scrollTo({
        top: 0,

        behavior:
          "smooth",
      });
    } catch (err) {
      await cleanupFiles(
        supabase,
        uploadedPaths
      );

      console.error(
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível registrar a devolução."
      );
    } finally {
      setPending(false);
    }
  }

  if (success) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2 bg-[#AF1B1B]" />

        <div className="p-8 text-center sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2
              size={30}
            />
          </div>

          <h1 className="mt-5 text-2xl font-bold text-slate-950">
            Devolução registrada
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Sua prestação de
            contas foi enviada
            para conferência do
            Financeiro.
          </p>

          <div className="mx-auto mt-7 max-w-md rounded-xl border border-slate-200 bg-slate-50 p-5 text-left">
            <InfoRow
              label="Solicitação"
              value={
                requestNumber
              }
            />

            <InfoRow
              label="Solicitante"
              value={
                requesterName
              }
            />

            <InfoRow
              label="Total utilizado"
              value={formatCurrency(
                totalUsed
              )}
            />
          </div>
        </div>
      </section>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-5"
    >
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2 bg-[#AF1B1B]" />

        <div className="p-6 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#AF1B1B]">
            Projeta Compras
          </p>

          <h1 className="mt-2 text-2xl font-bold text-slate-950">
            Devolução de
            Cartão de Crédito
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Registre as compras
            realizadas e envie os
            documentos para
            prestação de contas.
          </p>
        </div>
      </section>

      {/* =====================================================
          SOLICITAÇÃO
      ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-950">
          Dados da solicitação
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <ReadOnlyCard
            icon={FileText}
            label="Solicitação"
            value={
              requestNumber
            }
          />

          <ReadOnlyCard
            icon={UserRound}
            label="Solicitante"
            value={
              requesterName
            }
            secondary={
              requesterEmail
            }
          />

          <ReadOnlyCard
            icon={CreditCard}
            label="Cartão utilizado"
            value={
              `${cardName} •••• ${cardLastFourDigits}`
            }
            secondary={
              cardBankName ??
              undefined
            }
          />

          <ReadOnlyCard
            icon={CalendarDays}
            label="Previsão de devolução"
            value={
              expectedReturnDate
                ? formatDate(
                    expectedReturnDate
                  )
                : "Não informada"
            }
          />
        </div>
      </section>

      {/* =====================================================
          VALORES
      ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-950">
          Valores autorizados
        </h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <ValueCard
            label="Valor aprovado"
            value={
              approvedAmount
            }
          />

          <ValueCard
            label="Compras adicionais"
            value={
              additionsTotal
            }
          />

          <ValueCard
            label="Total autorizado"
            value={
              authorizedTotal
            }
            highlight
          />
        </div>
      </section>

      {/* ERRO */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          {error}
        </div>
      )}

      {/* =====================================================
          DADOS DA DEVOLUÇÃO
      ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-base font-semibold text-slate-950">
          Dados da devolução
        </h2>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Nº da solicitação
              no Sienge *
            </label>

            <div className="relative">
              <Hash
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={
                  siengeRequestNumber
                }
                onChange={(
                  event
                ) =>
                  setSiengeRequestNumber(
                    event.target.value
                  )
                }
                disabled={
                  pending
                }
                required
                placeholder="Ex.: 18542"
                className={`${inputClasses} pl-11`}
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Recebido por *
            </label>

            <div className="relative">
              <UserRoundCheck
                size={17}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
              />

              <input
                value={
                  receivedByName
                }
                onChange={(
                  event
                ) =>
                  setReceivedByName(
                    event.target.value
                  )
                }
                disabled={
                  pending
                }
                required
                placeholder="Nome de quem recebeu o cartão"
                className={`${inputClasses} pl-11`}
              />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          COMPRAS
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Compras realizadas
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Informe cada
              fornecedor e o
              valor utilizado.
            </p>
          </div>

          <button
            type="button"
            onClick={
              addPurchase
            }
            disabled={
              pending
            }
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#AF1B1B]/30 bg-[#AF1B1B]/[0.04] px-4 text-xs font-semibold text-[#AF1B1B] transition hover:bg-[#AF1B1B]/10"
          >
            <Plus
              size={16}
            />

            Adicionar fornecedor
          </button>
        </div>

        <div className="space-y-4 p-5 sm:p-6">
          {purchases.map(
            (
              purchase,
              index
            ) => (
              <div
                key={
                  purchase.id
                }
                className="rounded-2xl border border-slate-200 p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      Compra{" "}
                      {index + 1}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-500">
                      Fornecedor e
                      valor efetivamente
                      utilizado
                    </p>
                  </div>

                  {purchases.length >
                    1 && (
                    <button
                      type="button"
                      onClick={() =>
                        removePurchase(
                          purchase.id
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600"
                    >
                      <Trash2
                        size={16}
                      />
                    </button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-700">
                      Fornecedor *
                    </label>

                    <div className="relative">
                      <Store
                        size={17}
                        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                      />

                      <input
                        value={
                          purchase.supplierName
                        }
                        onChange={(
                          event
                        ) =>
                          updatePurchase(
                            purchase.id,
                            "supplierName",
                            event.target.value
                          )
                        }
                        disabled={
                          pending
                        }
                        placeholder="Nome do fornecedor"
                        className={`${inputClasses} pl-11`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-700">
                      Valor utilizado *
                    </label>

                    <div className="relative">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-600">
                        R$
                      </span>

                      <input
                        value={
                          purchase.amount
                        }
                        onChange={(
                          event
                        ) =>
                          updatePurchase(
                            purchase.id,
                            "amount",
                            event.target.value
                          )
                        }
                        inputMode="decimal"
                        disabled={
                          pending
                        }
                        placeholder="0,00"
                        className={`${inputClasses} pl-11`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-700">
                      Data da compra
                    </label>

                    <input
                      type="date"
                      value={
                        purchase.purchaseDate
                      }
                      onChange={(
                        event
                      ) =>
                        updatePurchase(
                          purchase.id,
                          "purchaseDate",
                          event.target.value
                        )
                      }
                      disabled={
                        pending
                      }
                      className={`${inputClasses} [color-scheme:light]`}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold text-slate-700">
                      Observação
                    </label>

                    <input
                      value={
                        purchase.notes
                      }
                      onChange={(
                        event
                      ) =>
                        updatePurchase(
                          purchase.id,
                          "notes",
                          event.target.value
                        )
                      }
                      disabled={
                        pending
                      }
                      placeholder="Opcional"
                      className={
                        inputClasses
                      }
                    />
                  </div>
                </div>
              </div>
            )
          )}

          <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
            <SummaryValue
              label="Total autorizado"
              value={
                authorizedTotal
              }
            />

            <SummaryValue
              label="Total utilizado"
              value={
                totalUsed
              }
            />

            <SummaryValue
              label={
                balance >= 0
                  ? "Saldo não utilizado"
                  : "Valor excedente"
              }
              value={
                Math.abs(
                  balance
                )
              }
              alert={
                balance < 0
              }
            />
          </div>
        </div>
      </section>

      {/* =====================================================
          DOCUMENTOS
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <h2 className="text-base font-semibold text-slate-950">
            Documentos
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Anexe todos os
            documentos relacionados
            às compras.
          </p>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-2">
          <FileField
            icon={FileText}
            title="Notas Fiscais / Cupons"
            description="Obrigatório · PDF, JPG, PNG ou WEBP"
            files={
              invoiceFiles
            }
            setFiles={
              setInvoiceFiles
            }
            disabled={
              pending
            }
          />

          <FileField
            icon={Receipt}
            title="Comprovantes das transações"
            description="Obrigatório · comprovantes do cartão"
            files={
              receiptFiles
            }
            setFiles={
              setReceiptFiles
            }
            disabled={
              pending
            }
          />

          <div className="lg:col-span-2">
            <FileField
              icon={
                UploadCloud
              }
              title="Outros documentos"
              description="Opcional"
              files={
                otherFiles
              }
              setFiles={
                setOtherFiles
              }
              disabled={
                pending
              }
            />
          </div>
        </div>
      </section>

      {/* OBSERVAÇÕES */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <label className="mb-2 block text-sm font-semibold text-slate-800">
          Observações
        </label>

        <textarea
          value={
            returnNotes
          }
          onChange={(
            event
          ) =>
            setReturnNotes(
              event.target.value
            )
          }
          disabled={
            pending
          }
          rows={4}
          placeholder="Informações adicionais sobre a devolução..."
          className={
            textareaClasses
          }
        />
      </section>

      <button
        type="submit"
        disabled={
          pending
        }
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#921717] disabled:opacity-60"
      >
        {pending ? (
          <>
            <LoaderCircle
              size={18}
              className="animate-spin"
            />

            Enviando...
          </>
        ) : (
          <>
            <CheckCircle2
              size={18}
            />

            Registrar devolução
          </>
        )}
      </button>
    </form>
  );
}

function ReadOnlyCard({
  icon: Icon,
  label,
  value,
  secondary,
}: {
  icon: React.ElementType;

  label: string;

  value: string;

  secondary?: string;
}) {
  return (
    <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <Icon
        size={18}
        className="mt-0.5 shrink-0 text-[#AF1B1B]"
      />

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-950">
          {value}
        </p>

        {secondary && (
          <p className="mt-0.5 text-xs text-slate-500">
            {secondary}
          </p>
        )}
      </div>
    </div>
  );
}

function ValueCard({
  label,
  value,
  highlight = false,
}: {
  label: string;

  value: number;

  highlight?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-4",

        highlight
          ? "border-[#AF1B1B]/30 bg-[#AF1B1B]/[0.05]"
          : "border-slate-200 bg-slate-50",
      ].join(" ")}
    >
      <p className="text-xs font-semibold text-slate-600">
        {label}
      </p>

      <p className="mt-2 text-lg font-bold text-slate-950">
        {formatCurrency(
          value
        )}
      </p>
    </div>
  );
}

function SummaryValue({
  label,
  value,
  alert = false,
}: {
  label: string;

  value: number;

  alert?: boolean;
}) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-slate-500">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-base font-bold",

          alert
            ? "text-red-700"
            : "text-slate-950",
        ].join(" ")}
      >
        {formatCurrency(
          value
        )}
      </p>
    </div>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-200 py-3 last:border-0">
      <span className="text-xs text-slate-500">
        {label}
      </span>

      <strong className="text-right text-sm font-semibold text-slate-950">
        {value}
      </strong>
    </div>
  );
}

function FileField({
  icon: Icon,
  title,
  description,
  files,
  setFiles,
  disabled,
}: {
  icon: React.ElementType;

  title: string;

  description: string;

  files: File[];

  setFiles:
    React.Dispatch<
      React.SetStateAction<
        File[]
      >
    >;

  disabled: boolean;
}) {
  function addFiles(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      Array.from(
        event.target.files ??
          []
      );

    for (
      const file
      of selected
    ) {
      const validation =
        validateFile(file);

      if (validation) {
        window.alert(
          validation
        );

        event.target.value =
          "";

        return;
      }
    }

    setFiles(
      (current) => [
        ...current,
        ...selected,
      ]
    );

    event.target.value =
      "";
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
      <Icon
        size={21}
        className="text-[#AF1B1B]"
      />

      <p className="mt-3 text-sm font-semibold text-slate-950">
        {title}
      </p>

      <p className="mt-1 text-xs text-slate-600">
        {description}
      </p>

      <label className="mt-4 inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800">
        <UploadCloud
          size={16}
        />

        Adicionar arquivos

        <input
          type="file"
          multiple
          disabled={
            disabled
          }
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={
            addFiles
          }
          className="hidden"
        />
      </label>

      {files.length >
        0 && (
        <div className="mt-4 space-y-2">
          {files.map(
            (
              file,
              index
            ) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
              >
                <FileCheck2
                  size={16}
                  className="shrink-0 text-emerald-600"
                />

                <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-700">
                  {file.name}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setFiles(
                      (
                        current
                      ) =>
                        current.filter(
                          (
                            _,
                            itemIndex
                          ) =>
                            itemIndex !==
                            index
                        )
                    )
                  }
                  className="text-slate-400 hover:text-red-600"
                >
                  <Trash2
                    size={15}
                  />
                </button>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

async function uploadExternalFile({
  supabase,
  token,
  requestId,
  file,
  category,
}: {
  supabase:
    ReturnType<
      typeof createClient
    >;

  token: string;

  requestId: string;

  file: File;

  category:
    ExternalReturnDocumentCategory;
}): Promise<{
  error:
    | string
    | null;

  document:
    | ExternalReturnDocument
    | null;
}> {
  const extension =
    getExtension(
      file.type
    );

  const path =
    `external/${token}/${requestId}/${category}/${crypto.randomUUID()}.${extension}`;

  const {
    error,
  } =
    await supabase.storage
      .from(BUCKET)
      .upload(
        path,
        file,
        {
          upsert:
            false,

          contentType:
            file.type,

          cacheControl:
            "3600",
        }
      );

  if (error) {
    return {
      error:
        error.message,

      document:
        null,
    };
  }

  return {
    error: null,

    document: {
      category,

      fileName:
        file.name,

      storagePath:
        path,

      mimeType:
        file.type,

      fileSize:
        file.size,
    },
  };
}

async function cleanupFiles(
  supabase:
    ReturnType<
      typeof createClient
    >,

  paths: string[]
) {
  if (!paths.length) {
    return;
  }

  await supabase.storage
    .from(BUCKET)
    .remove(paths);
}

function validateFile(
  file: File
) {
  if (
    !ACCEPTED_TYPES.includes(
      file.type
    )
  ) {
    return `"${file.name}" possui formato não permitido.`;
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    return `"${file.name}" excede o limite de 8 MB.`;
  }

  return null;
}

function getExtension(
  mimeType: string
) {
  switch (
    mimeType
  ) {
    case "application/pdf":
      return "pdf";

    case "image/jpeg":
      return "jpg";

    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    default:
      return "bin";
  }
}

function parseMoney(
  value: string
) {
  let input =
    value
      .trim()
      .replace(/\s/g, "")
      .replace("R$", "");

  if (
    input.includes(".") &&
    input.includes(",")
  ) {
    input =
      input
        .replace(
          /\./g,
          ""
        )
        .replace(
          ",",
          "."
        );
  } else {
    input =
      input.replace(
        ",",
        "."
      );
  }

  const parsed =
    Number(input);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
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

function formatDate(
  value: string
) {
  const date =
    new Date(
      `${value}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "pt-BR"
  ).format(date);
}