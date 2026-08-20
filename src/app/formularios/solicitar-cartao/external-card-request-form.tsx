"use client";

import {
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  LoaderCircle,
  Mail,
  Send,
  Store,
  User,
} from "lucide-react";

import {
  createExternalCardRequest,
  identifyExternalRequester,
  type ExternalRequester,
} from "./actions";

const inputClasses =
  "h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-100";

const textareaClasses =
  "w-full resize-none rounded-xl border border-slate-300 bg-white p-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-100";

export default function ExternalCardRequestForm() {
  const emailInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [
    email,
    setEmail,
  ] = useState("");

  const [
    requester,
    setRequester,
  ] =
    useState<ExternalRequester | null>(
      null
    );

  const [
    identifying,
    setIdentifying,
  ] = useState(false);

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
    successRequestId,
    setSuccessRequestId,
  ] =
    useState<string | null>(
      null
    );

  const [
    purchaseReason,
    setPurchaseReason,
  ] = useState("");

  // ==========================================================
  // IDENTIFICAR USUÁRIO
  // ==========================================================

  async function identify() {
    if (identifying) {
      return;
    }

    setError(null);
    setSuccessRequestId(
      null
    );

    // ========================================================
    // IMPORTANTE
    //
    // Lemos diretamente o valor real do input.
    // Isso resolve o problema de autofill do navegador,
    // quando o campo aparece preenchido mas o React ainda
    // mantém email = "".
    // ========================================================

    const typedEmail =
      (
        emailInputRef.current
          ?.value ??
        email
      )
        .trim()
        .toLowerCase();

    if (!typedEmail) {
      setError(
        "Informe seu e-mail corporativo."
      );

      emailInputRef.current?.focus();

      return;
    }

    setEmail(
      typedEmail
    );

    setIdentifying(
      true
    );

    try {
      const result =
        await identifyExternalRequester(
          typedEmail
        );

      if (
        !result.success ||
        !result.requester
      ) {
        setRequester(
          null
        );

        setError(
          result.error ??
            "Usuário não localizado."
        );

        return;
      }

      setRequester(
        result.requester
      );

      setEmail(
        result.requester.email
      );
    } catch (err) {
      console.error(
        "Erro ao identificar usuário:",
        err
      );

      setRequester(
        null
      );

      setError(
        "Não foi possível identificar o usuário."
      );
    } finally {
      setIdentifying(
        false
      );
    }
  }

  // ==========================================================
  // SUBMETER SOLICITAÇÃO
  // ==========================================================

  async function submit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      !requester ||
      pending
    ) {
      return;
    }

    setError(null);
    setPending(true);

    try {
      const formData =
        new FormData(
          event.currentTarget
        );

      const result =
        await createExternalCardRequest(
          {
            email:
              requester.email,

            costCenterOrSite:
              String(
                formData.get(
                  "cost_center_or_site"
                ) ?? ""
              ),

            suppliersText:
              String(
                formData.get(
                  "suppliers_text"
                ) ?? ""
              ),

            estimatedAmount:
              String(
                formData.get(
                  "estimated_amount"
                ) ?? ""
              ),

            purchaseReason:
              String(
                formData.get(
                  "purchase_reason"
                ) ?? ""
              ),

            purchaseReasonOther:
              String(
                formData.get(
                  "purchase_reason_other"
                ) ?? ""
              ),

            purpose:
              String(
                formData.get(
                  "purpose"
                ) ?? ""
              ),

            notes:
              String(
                formData.get(
                  "notes"
                ) ?? ""
              ),
          }
        );

      if (
        !result.success
      ) {
        setError(
          result.error ??
            "Não foi possível enviar a solicitação."
        );

        window.scrollTo({
          top: 0,
          behavior:
            "smooth",
        });

        return;
      }

      setSuccessRequestId(
        result.requestId
      );

      window.scrollTo({
        top: 0,
        behavior:
          "smooth",
      });
    } catch (err) {
      console.error(
        "Erro ao enviar solicitação externa:",
        err
      );

      setError(
        "Não foi possível enviar a solicitação."
      );
    } finally {
      setPending(false);
    }
  }

  // ==========================================================
  // SUCESSO
  // ==========================================================

  if (
    successRequestId
  ) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2 bg-[#AF1B1B]" />

        <div className="p-7 text-center sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2
              size={28}
            />
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-950 sm:text-2xl">
            Solicitação enviada
          </h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Sua solicitação foi
            registrada e encaminhada
            para o Financeiro.
          </p>

          <button
            type="button"
            onClick={() => {
              setSuccessRequestId(
                null
              );

              setRequester(
                null
              );

              setEmail(
                ""
              );

              setPurchaseReason(
                ""
              );

              setError(
                null
              );

              setTimeout(
                () => {
                  if (
                    emailInputRef.current
                  ) {
                    emailInputRef.current.value =
                      "";

                    emailInputRef.current.focus();
                  }
                },
                0
              );
            }}
            className="mt-7 inline-flex h-11 items-center justify-center rounded-xl bg-[#AF1B1B] px-6 text-sm font-semibold text-white transition hover:bg-[#921717]"
          >
            Fazer nova solicitação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* =====================================================
          IDENTIFICAÇÃO
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2 bg-[#AF1B1B]" />

        <div className="p-6 sm:p-7">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#AF1B1B]/10 text-[#AF1B1B]">
              <CreditCard
                size={24}
              />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#AF1B1B]">
                Projeta Compras
              </p>

              <h1 className="mt-1 text-xl font-semibold text-slate-950 sm:text-2xl">
                Solicitação de Cartão
              </h1>
            </div>
          </div>

          {!requester ? (
            <div className="mt-7">
              <label
                htmlFor="external-requester-email"
                className="mb-2 block text-sm font-semibold text-slate-800"
              >
                Seu e-mail corporativo *
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Mail
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    ref={
                      emailInputRef
                    }
                    id="external-requester-email"
                    name="external_requester_email"
                    type="email"
                    defaultValue={
                      email
                    }
                    autoComplete="email"
                    onInput={(
                      event
                    ) => {
                      setEmail(
                        event.currentTarget.value
                      );
                    }}
                    onChange={(
                      event
                    ) => {
                      setEmail(
                        event.currentTarget.value
                      );
                    }}
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        event.preventDefault();

                        void identify();
                      }
                    }}
                    placeholder="nome@projetacs.com"
                    className={`${inputClasses} pl-11`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() =>
                    void identify()
                  }
                  disabled={
                    identifying
                  }
                  className="inline-flex h-12 min-w-[130px] items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-6 text-sm font-semibold text-white transition hover:bg-[#921717] disabled:cursor-wait disabled:opacity-60"
                >
                  {identifying ? (
                    <>
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                      />

                      Verificando...
                    </>
                  ) : (
                    "Continuar"
                  )}
                </button>
              </div>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                Utilize o mesmo e-mail
                cadastrado no sistema.
              </p>
            </div>
          ) : (
            <div className="mt-7 flex flex-col gap-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-emerald-700">
                  <User
                    size={18}
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold text-emerald-700">
                    Usuário
                    identificado
                  </p>

                  <p className="mt-0.5 text-sm font-bold text-slate-950">
                    {
                      requester.fullName
                    }
                  </p>

                  <p className="text-xs text-slate-600">
                    {
                      requester.email
                    }
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRequester(
                    null
                  );

                  setError(
                    null
                  );

                  setTimeout(
                    () => {
                      emailInputRef.current?.focus();
                    },
                    0
                  );
                }}
                className="text-xs font-semibold text-slate-600 hover:text-[#AF1B1B]"
              >
                Trocar e-mail
              </button>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          ERRO
      ====================================================== */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <span>
            {error}
          </span>
        </div>
      )}

      {/* =====================================================
          FORMULÁRIO
      ====================================================== */}

      {requester && (
        <form
          onSubmit={
            submit
          }
          className="space-y-5"
        >
          {/* DADOS DA COMPRA */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Dados da compra
              </h2>

              <p className="mt-1 text-xs text-slate-600">
                Informe o que
                precisa ser
                adquirido.
              </p>
            </div>

            <div className="grid gap-5 p-6 md:grid-cols-2">
              {/* CENTRO CUSTO */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Centro de custo ou
                  Obra *
                </label>

                <div className="relative">
                  <Building2
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    name="cost_center_or_site"
                    required
                    disabled={
                      pending
                    }
                    placeholder="Informe o centro de custo ou obra"
                    className={`${inputClasses} pl-11`}
                  />
                </div>
              </div>

              {/* FORNECEDORES */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Fornecedor(es) *
                </label>

                <div className="relative">
                  <Store
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    name="suppliers_text"
                    required
                    disabled={
                      pending
                    }
                    placeholder="Onde será realizada a compra?"
                    className={`${inputClasses} pl-11`}
                  />
                </div>
              </div>

              {/* VALOR */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Valor previsto *
                </label>

                <div className="relative">
                  <CircleDollarSign
                    size={17}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    name="estimated_amount"
                    inputMode="decimal"
                    required
                    disabled={
                      pending
                    }
                    placeholder="0,00"
                    className={`${inputClasses} pl-11`}
                  />
                </div>
              </div>

              {/* PAGAMENTO */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Pagamento
                </label>

                <div className="flex h-12 items-center gap-3 rounded-xl border border-[#AF1B1B]/20 bg-[#AF1B1B]/[0.04] px-4">
                  <CreditCard
                    size={18}
                    className="text-[#AF1B1B]"
                  />

                  <span className="text-sm font-semibold text-slate-900">
                    Cartão de
                    crédito
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* JUSTIFICATIVA */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Justificativa
              </h2>
            </div>

            <div className="space-y-6 p-6">
              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-800">
                  Motivo da compra *
                </label>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Reason
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

                  <Reason
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

                  <Reason
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
                    disabled={
                      pending
                    }
                    placeholder="Informe o motivo..."
                    className={`${inputClasses} mt-3`}
                  />
                )}
              </div>

              {/* FINALIDADE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Onde será usado?
                  Qual a finalidade?
                  *
                </label>

                <textarea
                  name="purpose"
                  required
                  disabled={
                    pending
                  }
                  rows={5}
                  placeholder="Informe onde será utilizado, o tipo de material e qual a necessidade da compra."
                  className={
                    textareaClasses
                  }
                />
              </div>

              {/* OBSERVAÇÕES */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Observações
                  adicionais
                </label>

                <textarea
                  name="notes"
                  disabled={
                    pending
                  }
                  rows={3}
                  placeholder="Informações complementares, caso necessário."
                  className={
                    textareaClasses
                  }
                />
              </div>
            </div>
          </section>

          {/* SUBMIT */}

          <button
            type="submit"
            disabled={
              pending
            }
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-[#921717] disabled:cursor-not-allowed disabled:opacity-60"
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
                <Send
                  size={18}
                />

                Enviar
                solicitação
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

// ============================================================
// MOTIVO
// ============================================================

function Reason({
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
          ? "border-[#AF1B1B] bg-[#AF1B1B]/[0.05]"
          : "border-slate-300 bg-white hover:bg-slate-50",
      ].join(" ")}
    >
      <input
        type="radio"
        name="purchase_reason"
        value={value}
        required
        checked={
          checked
        }
        onChange={() =>
          onChange(value)
        }
        className="h-4 w-4 accent-[#AF1B1B]"
      />

      <span className="text-sm font-semibold text-slate-800">
        {label}
      </span>
    </label>
  );
}