"use client";

import {
  FormEvent,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FileText,
  LoaderCircle,
  Receipt,
  RotateCcw,
  Store,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

import {
  submitCardReturn,
  type UploadedReturnDocument,
} from "./actions";

type ReturnFormProps = {
  requestId: string;
  userId: string;

  defaultValues?: {
    actualAmount?: string;
    purchaseDate?: string;
    supplierName?: string;
    returnNotes?: string;
  };
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

// ============================================================
// ESTILOS PADRÃO
// ============================================================

const inputBaseClasses =
  "h-12 w-full rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 disabled:placeholder:text-slate-400";

const textareaBaseClasses =
  "w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-600 disabled:placeholder:text-slate-400";

export default function ReturnForm({
  requestId,
  userId,
  defaultValues,
}: ReturnFormProps) {
  const router =
    useRouter();

  const invoiceRef =
    useRef<HTMLInputElement>(
      null
    );

  const receiptRef =
    useRef<HTMLInputElement>(
      null
    );

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

  // =========================================================
  // ENVIO
  // =========================================================

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (pending) {
      return;
    }

    setError(null);
    setSuccess(false);

    const form =
      event.currentTarget;

    const formData =
      new FormData(form);

    const actualAmount =
      String(
        formData.get(
          "actual_amount"
        ) ?? ""
      ).trim();

    const purchaseDate =
      String(
        formData.get(
          "purchase_date"
        ) ?? ""
      ).trim();

    const supplierName =
      String(
        formData.get(
          "supplier_name"
        ) ?? ""
      ).trim();

    const returnNotes =
      String(
        formData.get(
          "return_notes"
        ) ?? ""
      ).trim();

    const invoice =
      invoiceRef.current
        ?.files?.[0];

    const receipt =
      receiptRef.current
        ?.files?.[0];

    // =======================================================
    // VALIDAÇÕES
    // =======================================================

    if (!actualAmount) {
      setError(
        "Informe o valor efetivamente utilizado."
      );

      return;
    }

    if (!purchaseDate) {
      setError(
        "Informe a data da compra."
      );

      return;
    }

    if (!supplierName) {
      setError(
        "Informe o fornecedor."
      );

      return;
    }

    if (!invoice) {
      setError(
        "Anexe a Nota Fiscal ou Cupom Fiscal."
      );

      return;
    }

    if (!receipt) {
      setError(
        "Anexe o comprovante da transação do cartão."
      );

      return;
    }

    const invoiceValidation =
      validateFile(
        invoice,
        "Nota Fiscal"
      );

    if (
      invoiceValidation
    ) {
      setError(
        invoiceValidation
      );

      return;
    }

    const receiptValidation =
      validateFile(
        receipt,
        "Comprovante"
      );

    if (
      receiptValidation
    ) {
      setError(
        receiptValidation
      );

      return;
    }

    setPending(true);

    const supabase =
      createClient();

    const uploadedPaths:
      string[] = [];

    try {
      // =====================================================
      // NOTA FISCAL
      // =====================================================

      const invoiceDocument =
        await uploadDocument({
          supabase,
          file: invoice,
          userId,
          requestId,
          category:
            "invoice",
        });

      if (
        invoiceDocument.error
      ) {
        throw new Error(
          invoiceDocument.error
        );
      }

      uploadedPaths.push(
        invoiceDocument
          .document!.storagePath
      );

      // =====================================================
      // COMPROVANTE
      // =====================================================

      const receiptDocument =
        await uploadDocument({
          supabase,
          file: receipt,
          userId,
          requestId,
          category:
            "payment_receipt",
        });

      if (
        receiptDocument.error
      ) {
        throw new Error(
          receiptDocument.error
        );
      }

      uploadedPaths.push(
        receiptDocument
          .document!.storagePath
      );

      // =====================================================
      // REGISTRA NO BANCO
      // =====================================================

      const result =
        await submitCardReturn({
          requestId,

          actualAmount,
          purchaseDate,
          supplierName,
          returnNotes,

          invoice:
            invoiceDocument
              .document!,

          paymentReceipt:
            receiptDocument
              .document!,
        });

      if (
        !result.success
      ) {
        await cleanupFiles(
          supabase,
          uploadedPaths
        );

        setError(
          result.error ??
          "Não foi possível concluir a devolução."
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

      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível enviar os documentos."
      );
    } finally {
      setPending(false);
    }
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="space-y-6"
    >
      {/* =====================================================
          ALERTA PRINCIPAL
      ====================================================== */}

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex gap-3">
          <AlertCircle
            size={20}
            className="mt-0.5 shrink-0 text-amber-600"
          />

          <div>
            <p className="text-sm font-semibold text-amber-950">
              Documentos obrigatórios
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              Para concluir a devolução,
              anexe a Nota Fiscal ou Cupom
              Fiscal e também o comprovante
              da transação realizada no
              cartão.
            </p>

            <p className="mt-2 text-xs font-medium leading-5 text-amber-900">
              Os documentos devem estar
              legíveis e não podem encobrir
              informações um do outro.
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

          Devolução registrada
          com sucesso.
        </div>
      )}

      {/* =====================================================
          VALOR UTILIZADO
      ====================================================== */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800">
          Valor efetivamente utilizado *
        </label>

        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-600">
            R$
          </span>

          <input
            name="actual_amount"
            inputMode="decimal"
            required
            disabled={pending}
            defaultValue={
              defaultValues
                ?.actualAmount ??
              ""
            }
            placeholder="0,00"
            className={`${inputBaseClasses} pl-11 pr-4`}
          />
        </div>

        <p className="mt-2 text-[11px] leading-5 text-slate-600">
          Informe o valor total
          efetivamente utilizado no
          cartão.
        </p>
      </div>

      {/* =====================================================
          DATA
      ====================================================== */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800">
          Data da compra *
        </label>

        <div className="relative">
          <CalendarDays
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-slate-600"
          />

          <input
            type="date"
            name="purchase_date"
            required
            disabled={pending}
            max={
              new Date()
                .toISOString()
                .split("T")[0]
            }
            defaultValue={
              defaultValues
                ?.purchaseDate ??
              ""
            }
            className={`${inputBaseClasses} pl-10 pr-4 [color-scheme:light]`}
          />
        </div>
      </div>

      {/* =====================================================
          FORNECEDOR
      ====================================================== */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800">
          Fornecedor *
        </label>

        <div className="relative">
          <Store
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600"
          />

          <input
            name="supplier_name"
            required
            disabled={pending}
            defaultValue={
              defaultValues
                ?.supplierName ??
              ""
            }
            placeholder="Informe o fornecedor da compra"
            className={`${inputBaseClasses} pl-10 pr-4`}
          />
        </div>
      </div>

      {/* =====================================================
          DOCUMENTOS
      ====================================================== */}

      <div className="grid gap-5 md:grid-cols-2">
        {/* NOTA */}

        <DocumentField
          inputRef={
            invoiceRef
          }
          icon={FileText}
          title="Nota Fiscal / Cupom Fiscal"
          description="PDF, JPG, PNG ou WEBP · máximo 8 MB"
          disabled={pending}
        />

        {/* COMPROVANTE */}

        <DocumentField
          inputRef={
            receiptRef
          }
          icon={Receipt}
          title="Comprovante da transação"
          description="Comprovante da máquina/cartão · máximo 8 MB"
          disabled={pending}
        />
      </div>

      {/* =====================================================
          OBSERVAÇÃO
      ====================================================== */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-800">
          Observações
        </label>

        <textarea
          name="return_notes"
          rows={4}
          disabled={pending}
          defaultValue={
            defaultValues
              ?.returnNotes ??
            ""
          }
          placeholder="Informe alguma observação importante sobre a compra ou devolução..."
          className={textareaBaseClasses}
        />
      </div>

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
            Devolvido
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
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#921717] focus:outline-none focus:ring-4 focus:ring-[#AF1B1B]/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <LoaderCircle
              size={18}
              className="animate-spin"
            />

            Enviando documentos...
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
// CAMPO DOCUMENTO
// ============================================================

function DocumentField({
  inputRef,
  icon: Icon,
  title,
  description,
  disabled,
}: {
  inputRef:
    React.RefObject<HTMLInputElement | null>;

  icon:
    React.ElementType;

  title: string;
  description: string;
  disabled: boolean;
}) {
  return (
    <label
      className={[
        "block rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-5 transition",
        disabled
          ? "cursor-not-allowed opacity-70"
          : "cursor-pointer hover:border-[#AF1B1B]/50 hover:bg-[#AF1B1B]/[0.02]",
      ].join(" ")}
    >
      {/* ÍCONE */}

      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm">
        <Icon size={20} />
      </div>

      {/* TÍTULO */}

      <p className="mt-4 text-sm font-semibold text-slate-900">
        {title} *
      </p>

      {/* DESCRIÇÃO */}

      <p className="mt-1 text-xs font-medium leading-5 text-slate-600">
        {description}
      </p>

      {/* INPUT */}

      <input
        ref={inputRef}
        type="file"
        required
        disabled={disabled}
        accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
        className="mt-4 block w-full cursor-pointer text-xs font-medium text-slate-700 file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-2.5 file:text-xs file:font-semibold file:text-slate-800 file:shadow-sm file:transition hover:file:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-400"
      />
    </label>
  );
}

// ============================================================
// VALIDAÇÃO
// ============================================================

function validateFile(
  file: File,
  label: string
) {
  if (
    !ACCEPTED_TYPES.includes(
      file.type
    )
  ) {
    return `${label}: formato não permitido. Utilize PDF, JPG, PNG ou WEBP.`;
  }

  if (
    file.size >
    MAX_FILE_SIZE
  ) {
    return `${label}: o arquivo excede 8 MB.`;
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
    | "invoice"
    | "payment_receipt";
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

  const {
    error,
  } =
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
// LIMPEZA EM CASO DE ERRO
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
      "Erro ao limpar arquivos:",
      cleanupError
    );
  }
}

// ============================================================
// EXTENSÃO SEGURA
// ============================================================

function getExtension(
  mimeType: string
) {
  switch (mimeType) {
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