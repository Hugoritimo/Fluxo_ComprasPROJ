"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FileCheck2,
  FileText,
  Hash,
  LoaderCircle,
  Plus,
  Receipt,
  RotateCcw,
  Store,
  Trash2,
  UploadCloud,
  UserRoundCheck,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  submitCardReturn,
  type ReturnDocumentCategory,
  type ReturnPurchase,
  type UploadedReturnDocument,
} from "./actions";

// ============================================================
// PROPS
// ============================================================

type ReturnFormProps = {
  requestId: string;
  userId: string;

  defaultValues?: {
    actualAmount?: string;
    purchaseDate?: string;
    supplierName?: string;
    returnNotes?: string;

    siengeRequestNumber?: string;
    receivedByName?: string;
  };
};

// ============================================================
// TIPOS
// ============================================================

type PurchaseFormItem = {
  id: string;
  supplierName: string;
  amount: string;
  purchaseDate: string;
  notes: string;
};

// ============================================================
// CONFIGURAÇÕES
// ============================================================

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
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600";

const textareaClasses =
  "w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600";

// ============================================================
// COMPONENTE
// ============================================================

export default function ReturnForm({
  requestId,
  userId,
  defaultValues,
}: ReturnFormProps) {
  const router =
    useRouter();

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
  ] =
    useState(false);

  const [
    siengeRequestNumber,
    setSiengeRequestNumber,
  ] = useState(
    defaultValues
      ?.siengeRequestNumber ??
      ""
  );

  const [
    receivedByName,
    setReceivedByName,
  ] = useState(
    defaultValues
      ?.receivedByName ??
      ""
  );

  const [
    returnNotes,
    setReturnNotes,
  ] = useState(
    defaultValues
      ?.returnNotes ??
      ""
  );

  // ==========================================================
  // COMPRAS
  // ==========================================================

  const [
    purchases,
    setPurchases,
  ] = useState<
    PurchaseFormItem[]
  >([
    {
      id:
        crypto.randomUUID(),

      supplierName:
        defaultValues
          ?.supplierName ??
        "",

      amount:
        defaultValues
          ?.actualAmount ??
        "",

      purchaseDate:
        defaultValues
          ?.purchaseDate ??
        "",

      notes: "",
    },
  ]);

  // ==========================================================
  // ARQUIVOS
  // ==========================================================

  const [
    invoiceFiles,
    setInvoiceFiles,
  ] = useState<File[]>(
    []
  );

  const [
    receiptFiles,
    setReceiptFiles,
  ] = useState<File[]>(
    []
  );

  const [
    otherFiles,
    setOtherFiles,
  ] = useState<File[]>(
    []
  );

  // ==========================================================
  // TOTAL
  // ==========================================================

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

  // ==========================================================
  // COMPRAS DINÂMICAS
  // ==========================================================

  function addPurchase() {
    setPurchases(
      (current) => [
        ...current,
        {
          id:
            crypto.randomUUID(),
          supplierName: "",
          amount: "",
          purchaseDate: "",
          notes: "",
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

  // ==========================================================
  // ENVIO
  // ==========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setError(null);
    setSuccess(false);

    // ========================================================
    // SIENGE
    // ========================================================

    if (
      !siengeRequestNumber.trim()
    ) {
      setError(
        "Informe o número da solicitação no Sienge."
      );

      return;
    }

    // ========================================================
    // RECEBEDOR
    // ========================================================

    if (
      !receivedByName.trim()
    ) {
      setError(
        "Informe quem recebeu o cartão na devolução."
      );

      return;
    }

    // ========================================================
    // COMPRAS
    // ========================================================

    const normalizedPurchases: ReturnPurchase[] =
      [];

    for (
      let index = 0;
      index <
      purchases.length;
      index++
    ) {
      const purchase =
        purchases[index];

      const supplierName =
        purchase.supplierName.trim();

      const amount =
        parseMoney(
          purchase.amount
        );

      if (!supplierName) {
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

      if (
        purchase.purchaseDate &&
        purchase.purchaseDate >
          new Date()
            .toISOString()
            .split("T")[0]
      ) {
        setError(
          `A data da compra ${index + 1} não pode ser futura.`
        );

        return;
      }

      normalizedPurchases.push(
        {
          supplierName,
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

    // ========================================================
    // DOCUMENTOS
    // ========================================================

    if (
      invoiceFiles.length ===
      0
    ) {
      setError(
        "Anexe pelo menos uma Nota Fiscal ou Cupom Fiscal."
      );

      return;
    }

    if (
      receiptFiles.length ===
      0
    ) {
      setError(
        "Anexe pelo menos um comprovante da transação."
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
      const {
        file,
      } of allFiles
    ) {
      const validation =
        validateFile(file);

      if (validation) {
        setError(
          validation
        );

        return;
      }
    }

    // ========================================================
    // UPLOAD
    // ========================================================

    setPending(true);

    const supabase =
      createClient();

    const uploadedPaths:
      string[] = [];

    try {
      const documents: UploadedReturnDocument[] =
        [];

      for (
        const item
        of allFiles
      ) {
        const result =
          await uploadDocument(
            {
              supabase,

              file:
                item.file,

              userId,

              requestId,

              category:
                item.category,
            }
          );

        if (
          result.error ||
          !result.document
        ) {
          throw new Error(
            result.error ??
              "Não foi possível enviar um dos documentos."
          );
        }

        documents.push(
          result.document
        );

        uploadedPaths.push(
          result.document
            .storagePath
        );
      }

      // ======================================================
      // REGISTRA NO BANCO
      // ======================================================

      const result =
        await submitCardReturn(
          {
            requestId,

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
            "Não foi possível registrar a prestação de contas."
        );

        return;
      }

      setSuccess(true);

      router.push(
        `/solicitacoes/${requestId}`
      );

      router.refresh();
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
          : "Não foi possível concluir a prestação de contas."
      );
    } finally {
      setPending(false);
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-7"
    >
      {/* =====================================================
          ALERTA
      ====================================================== */}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0 text-amber-700"
          />

          <div>
            <p className="text-sm font-semibold text-amber-950">
              Prestação de contas
              obrigatória
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-900">
              Informe todas as compras
              realizadas, o número do
              Sienge e anexe as Notas
              Fiscais/Cupons Fiscais e
              os comprovantes das
              transações.
            </p>

            <p className="mt-2 text-xs font-medium leading-5 text-amber-800">
              Os documentos devem estar
              legíveis e não devem
              encobrir informações da
              compra.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          ERRO
      ====================================================== */}

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
          SUCESSO
      ====================================================== */}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          Prestação de contas
          registrada com sucesso.
        </div>
      )}

      {/* =====================================================
          DADOS DA DEVOLUÇÃO
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-950">
            Dados da devolução
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            Complete as informações
            necessárias para devolver o
            cartão.
          </p>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-2">
          {/* SIENGE */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Nº da solicitação no
              Sienge *
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
                    event.target
                      .value
                  )
                }
                required
                disabled={
                  pending
                }
                placeholder="Ex.: 18542"
                className={`${inputClasses} pl-11`}
              />
            </div>

            <p className="mt-2 text-[11px] leading-5 text-slate-600">
              O número do Sienge é
              obrigatório somente nesta
              etapa.
            </p>
          </div>

          {/* RECEBEDOR */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-800">
              Recebedor do cartão *
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
                    event.target
                      .value
                  )
                }
                required
                disabled={
                  pending
                }
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

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Compras realizadas
            </h2>

            <p className="mt-1 text-xs text-slate-600">
              Informe separadamente cada
              fornecedor e o respectivo
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
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-[#AF1B1B]/30 bg-[#AF1B1B]/[0.04] px-4 text-xs font-semibold text-[#AF1B1B] transition hover:bg-[#AF1B1B]/10 disabled:opacity-50"
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
              <PurchaseCard
                key={
                  purchase.id
                }
                index={
                  index
                }
                purchase={
                  purchase
                }
                disabled={
                  pending
                }
                canRemove={
                  purchases.length >
                  1
                }
                onChange={
                  updatePurchase
                }
                onRemove={
                  removePurchase
                }
              />
            )
          )}

          {/* TOTAL */}

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#AF1B1B] shadow-sm">
                <CircleDollarSign
                  size={19}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-600">
                  Total utilizado
                </p>

                <p className="text-[11px] text-slate-500">
                  Soma de todos os
                  fornecedores
                </p>
              </div>
            </div>

            <p className="text-xl font-bold text-slate-950">
              {formatCurrency(
                totalUsed
              )}
            </p>
          </div>
        </div>
      </section>

      {/* =====================================================
          DOCUMENTOS
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4 sm:px-6">
          <h2 className="text-base font-semibold text-slate-950">
            Documentos
          </h2>

          <p className="mt-1 text-xs text-slate-600">
            É possível adicionar vários
            arquivos em cada categoria.
          </p>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 xl:grid-cols-2">
          <MultipleDocumentField
            icon={FileText}
            title="Nota Fiscal / Cupom Fiscal"
            description="Obrigatório · PDF, JPG, PNG ou WEBP · máximo 8 MB por arquivo"
            files={
              invoiceFiles
            }
            setFiles={
              setInvoiceFiles
            }
            disabled={
              pending
            }
            required
          />

          <MultipleDocumentField
            icon={Receipt}
            title="Comprovantes das transações"
            description="Obrigatório · adicione todos os comprovantes das compras"
            files={
              receiptFiles
            }
            setFiles={
              setReceiptFiles
            }
            disabled={
              pending
            }
            required
          />

          <div className="xl:col-span-2">
            <MultipleDocumentField
              icon={
                UploadCloud
              }
              title="Outros documentos"
              description="Opcional · orçamentos, autorizações ou outros documentos relacionados"
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

      {/* =====================================================
          OBSERVAÇÕES
      ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
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
          rows={4}
          disabled={
            pending
          }
          placeholder="Informe alguma observação importante sobre as compras ou sobre a devolução do cartão..."
          className={
            textareaClasses
          }
        />
      </section>

      {/* =====================================================
          CONFIRMAÇÃO
      ====================================================== */}

      <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <FileCheck2
          size={19}
          className="mt-0.5 shrink-0 text-slate-600"
        />

        <p className="text-xs leading-5 text-slate-700">
          Após o envio, a solicitação
          passará para{" "}
          <strong className="font-semibold text-slate-950">
            Prestação de contas
          </strong>{" "}
          e ficará disponível para
          conferência do Financeiro.
        </p>
      </div>

      {/* =====================================================
          SUBMIT
      ====================================================== */}

      <button
        type="submit"
        disabled={
          pending
        }
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#921717] focus:outline-none focus:ring-4 focus:ring-[#AF1B1B]/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <LoaderCircle
              size={18}
              className="animate-spin"
            />

            Enviando prestação...
          </>
        ) : (
          <>
            <RotateCcw
              size={18}
            />

            Registrar devolução
          </>
        )}
      </button>
    </form>
  );
}

// ============================================================
// COMPRA / FORNECEDOR
// ============================================================

function PurchaseCard({
  purchase,
  index,
  disabled,
  canRemove,
  onChange,
  onRemove,
}: {
  purchase: PurchaseFormItem;
  index: number;
  disabled: boolean;
  canRemove: boolean;

  onChange: (
    id: string,
    field:
      | "supplierName"
      | "amount"
      | "purchaseDate"
      | "notes",
    value: string
  ) => void;

  onRemove: (
    id: string
  ) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            Compra {index + 1}
          </p>

          <p className="mt-1 text-[11px] text-slate-500">
            Fornecedor e valor
            efetivamente utilizado
          </p>
        </div>

        {canRemove && (
          <button
            type="button"
            onClick={() =>
              onRemove(
                purchase.id
              )
            }
            disabled={
              disabled
            }
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-50"
            title="Remover compra"
          >
            <Trash2
              size={16}
            />
          </button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* FORNECEDOR */}

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
                onChange(
                  purchase.id,
                  "supplierName",
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="Nome do fornecedor"
              className={`${inputClasses} pl-11`}
            />
          </div>
        </div>

        {/* VALOR */}

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
                onChange(
                  purchase.id,
                  "amount",
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              inputMode="decimal"
              placeholder="0,00"
              className={`${inputClasses} pl-11`}
            />
          </div>
        </div>

        {/* DATA */}

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-700">
            Data da compra
          </label>

          <div className="relative">
            <CalendarDays
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-slate-500"
            />

            <input
              type="date"
              value={
                purchase.purchaseDate
              }
              onChange={(
                event
              ) =>
                onChange(
                  purchase.id,
                  "purchaseDate",
                  event.target
                    .value
                )
              }
              max={
                new Date()
                  .toISOString()
                  .split("T")[0]
              }
              disabled={
                disabled
              }
              className={`${inputClasses} pl-11 [color-scheme:light]`}
            />
          </div>
        </div>

        {/* OBSERVAÇÃO */}

        <div>
          <label className="mb-2 block text-xs font-semibold text-slate-700">
            Observação da compra
          </label>

          <input
            value={
              purchase.notes
            }
            onChange={(
              event
            ) =>
              onChange(
                purchase.id,
                "notes",
                event.target.value
              )
            }
            disabled={
              disabled
            }
            placeholder="Opcional"
            className={
              inputClasses
            }
          />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MÚLTIPLOS DOCUMENTOS
// ============================================================

function MultipleDocumentField({
  icon: Icon,
  title,
  description,
  files,
  setFiles,
  disabled,
  required = false,
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
  required?: boolean;
}) {
  function addFiles(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      Array.from(
        event.target.files ??
          []
      );

    if (
      selected.length === 0
    ) {
      return;
    }

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

    // permite escolher novamente o mesmo arquivo
    event.target.value =
      "";
  }

  function removeFile(
    index: number
  ) {
    setFiles(
      (current) =>
        current.filter(
          (
            _,
            currentIndex
          ) =>
            currentIndex !==
            index
        )
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm">
        <Icon
          size={20}
        />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-950">
        {title}
        {required
          ? " *"
          : ""}
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-600">
        {description}
      </p>

      <label
        className={[
          "mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-800 shadow-sm transition",
          disabled
            ? "cursor-not-allowed opacity-60"
            : "cursor-pointer hover:border-[#AF1B1B]/40 hover:bg-slate-50",
        ].join(" ")}
      >
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
          accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
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
                key={`${file.name}-${file.size}-${index}`}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3"
              >
                <FileCheck2
                  size={17}
                  className="shrink-0 text-emerald-600"
                />

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-800">
                    {
                      file.name
                    }
                  </p>

                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {formatFileSize(
                      file.size
                    )}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeFile(
                      index
                    )
                  }
                  disabled={
                    disabled
                  }
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title="Remover arquivo"
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

      {files.length ===
        0 && (
        <p className="mt-4 text-[11px] text-slate-500">
          Nenhum arquivo
          selecionado.
        </p>
      )}
    </div>
  );
}

// ============================================================
// VALOR
// ============================================================

function parseMoney(
  value: string
) {
  let input =
    value
      .trim()
      .replace(/\s/g, "")
      .replace("R$", "");

  if (!input) {
    return 0;
  }

  if (
    input.includes(".") &&
    input.includes(",")
  ) {
    input = input
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (
    input.includes(",")
  ) {
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

// ============================================================
// VALIDAÇÃO DO ARQUIVO
// ============================================================

function validateFile(
  file: File
) {
  if (
    !ACCEPTED_TYPES.includes(
      file.type
    )
  ) {
    return `"${file.name}": formato não permitido. Utilize PDF, JPG, PNG ou WEBP.`;
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    return `"${file.name}": o arquivo excede o limite de 8 MB.`;
  }

  return null;
}

// ============================================================
// UPLOAD
// ============================================================

async function uploadDocument({
  supabase,
  file,
  userId,
  requestId,
  category,
}: {
  supabase:
    ReturnType<
      typeof createClient
    >;

  file: File;

  userId: string;
  requestId: string;

  category:
    ReturnDocumentCategory;
}): Promise<{
  error: string | null;

  document:
    | UploadedReturnDocument
    | null;
}> {
  const extension =
    getExtension(
      file.type
    );

  const fileId =
    crypto.randomUUID();

  const path =
    `${userId}/${requestId}/${category}/${fileId}.${extension}`;

  const { error } =
    await supabase.storage
      .from(BUCKET)
      .upload(
        path,
        file,
        {
          cacheControl:
            "3600",

          upsert:
            false,

          contentType:
            file.type,
        }
      );

  if (error) {
    console.error(
      "Erro no upload:",
      error
    );

    return {
      error:
        `Não foi possível enviar "${file.name}": ${error.message}`,

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

// ============================================================
// LIMPEZA
// ============================================================

async function cleanupFiles(
  supabase:
    ReturnType<
      typeof createClient
    >,

  paths: string[]
) {
  if (
    paths.length === 0
  ) {
    return;
  }

  try {
    await supabase.storage
      .from(BUCKET)
      .remove(paths);
  } catch (
    cleanupError
  ) {
    console.error(
      "Erro ao remover uploads após falha:",
      cleanupError
    );
  }
}

// ============================================================
// EXTENSÃO
// ============================================================

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

// ============================================================
// FORMATADORES
// ============================================================

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

function formatFileSize(
  bytes: number
) {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    bytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}