"use client";

import {
  Check,
  Copy,
  ExternalLink,
  Link2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

type CopyReturnLinkButtonProps = {
  token: string;
  enabled: boolean;
};

export default function CopyReturnLinkButton({
  token,
  enabled,
}: CopyReturnLinkButtonProps) {
  const [
    copied,
    setCopied,
  ] = useState(false);

  const [
    returnUrl,
    setReturnUrl,
  ] = useState("");

  useEffect(() => {
    if (
      typeof window ===
      "undefined"
    ) {
      return;
    }

    setReturnUrl(
      `${window.location.origin}/formularios/devolucao/${token}`
    );
  }, [token]);

  async function copyLink() {
    if (
      !returnUrl ||
      !enabled
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        returnUrl
      );

      setCopied(true);

      window.setTimeout(
        () => {
          setCopied(false);
        },
        2000
      );
    } catch (error) {
      console.error(
        "Erro ao copiar link:",
        error
      );

      // Fallback para navegadores que
      // bloquearem Clipboard API.
      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value =
        returnUrl;

      textarea.style.position =
        "fixed";

      textarea.style.opacity =
        "0";

      document.body.appendChild(
        textarea
      );

      textarea.select();

      document.execCommand(
        "copy"
      );

      document.body.removeChild(
        textarea
      );

      setCopied(true);

      window.setTimeout(
        () => {
          setCopied(false);
        },
        2000
      );
    }
  }

  function openForm() {
    if (
      !returnUrl ||
      !enabled
    ) {
      return;
    }

    window.open(
      returnUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="rounded-2xl border border-[#AF1B1B]/20 bg-[#AF1B1B]/[0.03] p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#AF1B1B] shadow-sm">
          <Link2
            size={19}
          />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-950">
            Link de devolução
          </p>

          <p className="mt-1 text-xs leading-5 text-slate-600">
            Envie este link ao
            colaborador para que ele
            registre a prestação de
            contas sem acessar o sistema.
          </p>
        </div>
      </div>

      {enabled ? (
        <>
          <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 py-3">
            <p className="break-all text-[11px] leading-5 text-slate-600">
              {returnUrl ||
                "Gerando link..."}
            </p>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <button
              type="button"
              onClick={
                copyLink
              }
              disabled={
                !returnUrl
              }
              className={[
                "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-[#AF1B1B] text-white hover:bg-[#921717]",
              ].join(" ")}
            >
              {copied ? (
                <>
                  <Check
                    size={16}
                  />

                  Link copiado
                </>
              ) : (
                <>
                  <Copy
                    size={16}
                  />

                  Copiar link
                </>
              )}
            </button>

            <button
              type="button"
              onClick={
                openForm
              }
              disabled={
                !returnUrl
              }
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ExternalLink
                size={16}
              />

              Abrir formulário
            </button>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium leading-5 text-amber-800">
            O link externo desta
            solicitação está
            desativado.
          </p>
        </div>
      )}
    </div>
  );
}