"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Link2,
  X,
} from "lucide-react";

// ============================================================
// CONFIGURAÇÃO
// ============================================================

const REQUEST_PATH =
  "/solicitacoes/nova";

// ============================================================
// COMPONENTE
// ============================================================

export default function RequestLinkButton() {
  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );

  const [
    currentOrigin,
    setCurrentOrigin,
  ] =
    useState(
      ""
    );

  const [
    copied,
    setCopied,
  ] =
    useState(
      false
    );

  // =========================================================
  // URL ATUAL
  // =========================================================

  useEffect(
    () => {
      if (
        typeof window ===
        "undefined"
      ) {
        return;
      }

      setCurrentOrigin(
        window.location.origin
      );
    },
    []
  );

  // =========================================================
  // URL OFICIAL
  // =========================================================

  const requestUrl =
    useMemo(
      () => {
        // =====================================================
        // 1. URL DEFINIDA MANUALMENTE
        // =====================================================

        const configuredUrl =
          process.env
            .NEXT_PUBLIC_APP_URL
            ?.trim();

        if (
          configuredUrl
        ) {
          return `${normalizeBaseUrl(
            configuredUrl
          )}${REQUEST_PATH}`;
        }

        // =====================================================
        // 2. FALLBACK PARA O AMBIENTE ATUAL
        // =====================================================

        if (
          currentOrigin
        ) {
          return `${normalizeBaseUrl(
            currentOrigin
          )}${REQUEST_PATH}`;
        }

        return "";
      },
      [
        currentOrigin,
      ]
    );

  // =========================================================
  // IDENTIFICA PREVIEW DA VERCEL
  // =========================================================

  const usingVercelPreview =
    useMemo(
      () => {
        if (
          !currentOrigin
        ) {
          return false;
        }

        const configuredUrl =
          process.env
            .NEXT_PUBLIC_APP_URL
            ?.trim();

        // Se existe URL oficial configurada,
        // não importa se o administrador está
        // acessando um Preview.
        if (
          configuredUrl
        ) {
          return false;
        }

        try {
          const url =
            new URL(
              currentOrigin
            );

          return (
            url.hostname.endsWith(
              ".vercel.app"
            ) &&
            url.hostname.includes(
              "-"
            )
          );
        } catch {
          return false;
        }
      },
      [
        currentOrigin,
      ]
    );

  // =========================================================
  // ESC
  // =========================================================

  useEffect(
    () => {
      if (
        !open
      ) {
        return;
      }

      const handleKeyDown =
        (
          event:
            KeyboardEvent
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            setOpen(
              false
            );
          }
        };

      window.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      open,
    ]
  );

  // =========================================================
  // RESET COPIADO
  // =========================================================

  useEffect(
    () => {
      if (
        !open
      ) {
        setCopied(
          false
        );
      }
    },
    [
      open,
    ]
  );

  // =========================================================
  // COPIAR
  // =========================================================

  async function handleCopy() {
    if (
      !requestUrl
    ) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        requestUrl
      );

      setCopied(
        true
      );

      window.setTimeout(
        () => {
          setCopied(
            false
          );
        },
        2200
      );
    } catch (
      error
    ) {
      console.error(
        "Não foi possível copiar o link:",
        error
      );
    }
  }

  // =========================================================
  // ABRIR
  // =========================================================

  function handleOpen() {
    if (
      !requestUrl
    ) {
      return;
    }

    window.open(
      requestUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      {/* =====================================================
          BOTÃO
      ====================================================== */}

      <button
        type="button"
        onClick={
          () =>
            setOpen(
              true
            )
        }
        className="group inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[12px] font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#AF1B1B]/25 hover:bg-[#AF1B1B]/[0.025] hover:text-[#AF1B1B] hover:shadow-md"
      >
        <Link2
          size={
            15
          }
          className="transition-transform duration-200 group-hover:rotate-[-8deg]"
        />

        Gerar link
      </button>

      {/* =====================================================
          MODAL
      ====================================================== */}

      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          {/* =================================================
              OVERLAY
          ================================================== */}

          <button
            type="button"
            aria-label="Fechar"
            onClick={
              () =>
                setOpen(
                  false
                )
            }
            className="absolute inset-0 cursor-default bg-black/30 backdrop-blur-[3px]"
          />

          {/* =================================================
              CONTEÚDO
          ================================================== */}

          <div className="relative z-10 w-full max-w-[560px] overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_30px_100px_rgba(0,0,0,0.18)]">
            {/* ===============================================
                HEADER
            ================================================ */}

            <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#AF1B1B]/10 text-[#AF1B1B]">
                  <Link2
                    size={
                      17
                    }
                  />
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#AF1B1B]">
                    Compartilhamento
                  </p>

                  <h2 className="mt-1 text-[17px] font-semibold tracking-[-0.025em] text-slate-950">
                    Link de solicitação
                  </h2>

                  <p className="mt-1 max-w-[390px] text-[11px] leading-5 text-slate-500">
                    Compartilhe este endereço para acessar diretamente
                    a solicitação de compra.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  () =>
                    setOpen(
                      false
                    )
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fechar"
              >
                <X
                  size={
                    16
                  }
                />
              </button>
            </div>

            {/* ===============================================
                LINK
            ================================================ */}

            <div className="px-5 py-5 sm:px-6">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Endereço para compartilhar
              </p>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-2">
                <div className="min-w-0 flex-1 px-2">
                  <p
                    title={
                      requestUrl
                    }
                    className="truncate text-[11px] font-medium text-slate-600"
                  >
                    {requestUrl ||
                      "Preparando endereço..."}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={
                    !requestUrl
                  }
                  onClick={
                    handleCopy
                  }
                  className={[
                    "flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold transition",
                    copied
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:text-[#AF1B1B]",
                    !requestUrl
                      ? "cursor-not-allowed opacity-50"
                      : "",
                  ].join(
                    " "
                  )}
                >
                  {copied ? (
                    <>
                      <Check
                        size={
                          13
                        }
                      />

                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy
                        size={
                          13
                        }
                      />

                      Copiar
                    </>
                  )}
                </button>
              </div>

              {/* =============================================
                  AVISO DE PREVIEW
              ============================================== */}

              {usingVercelPreview && (
                <div className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                  <AlertTriangle
                    size={
                      16
                    }
                    className="mt-0.5 shrink-0 text-red-600"
                  />

                  <div>
                    <p className="text-[10px] font-bold text-red-800">
                      URL de Preview detectada
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-red-700/80">
                      Este endereço pode estar protegido pela Vercel.
                      Configure NEXT_PUBLIC_APP_URL com o domínio
                      oficial de produção antes de compartilhar este
                      link.
                    </p>
                  </div>
                </div>
              )}

              {/* =============================================
                  AVISO DE LOGIN
              ============================================== */}

              <div className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3">
                <p className="text-[10px] leading-5 text-amber-900/75">
                  O usuário que receber este endereço precisará estar
                  autenticado no Projeta Compras para acessar a
                  solicitação.
                </p>
              </div>

              {/* =============================================
                  URL CONFIGURADA
              ============================================== */}

              {!usingVercelPreview &&
                process.env
                  .NEXT_PUBLIC_APP_URL && (
                  <div className="mt-3 flex items-center gap-2 text-[9px] font-medium text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

                    Link utilizando o ambiente oficial de produção
                  </div>
                )}
            </div>

            {/* ===============================================
                FOOTER
            ================================================ */}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50/50 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={
                  () =>
                    setOpen(
                      false
                    )
                }
                className="inline-flex h-10 items-center justify-center rounded-xl px-4 text-[11px] font-semibold text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                Fechar
              </button>

              <button
                type="button"
                disabled={
                  !requestUrl
                }
                onClick={
                  handleOpen
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#171717] px-4 text-[11px] font-semibold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ExternalLink
                  size={
                    13
                  }
                />

                Abrir formulário
              </button>

              <button
                type="button"
                disabled={
                  !requestUrl
                }
                onClick={
                  handleCopy
                }
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-4 text-[11px] font-semibold text-white shadow-sm transition hover:bg-[#941717] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? (
                  <Check
                    size={
                      13
                    }
                  />
                ) : (
                  <Copy
                    size={
                      13
                    }
                  />
                )}

                {copied
                  ? "Link copiado"
                  : "Copiar link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// NORMALIZA URL
// ============================================================

function normalizeBaseUrl(
  value: string
) {
  let url =
    value.trim();

  while (
    url.endsWith(
      "/"
    )
  ) {
    url =
      url.slice(
        0,
        -1
      );
  }

  return url;
}