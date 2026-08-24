"use client";

import {
  useState,
  useTransition,
} from "react";

import {
  AlertTriangle,
  Loader2,
  Trash2,
  X,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  deleteSystemUser,
  type UserActionState,
} from "./actions";

// ============================================================
// TIPOS
// ============================================================

type DeleteUserButtonProps = {
  userId: string;

  userName: string;

  userEmail:
    | string
    | null;

  isSuperadminUser?: boolean;
};

// ============================================================
// ESTADO INICIAL
// ============================================================

const initialState: UserActionState = {
  success: false,
  error: null,
  message: null,
};

// ============================================================
// COMPONENTE
// ============================================================

export default function DeleteUserButton({
  userId,
  userName,
  userEmail,
  isSuperadminUser = false,
}: DeleteUserButtonProps) {
  const router =
    useRouter();

  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );

  const [
    error,
    setError,
  ] =
    useState<
      string
      | null
    >(
      null
    );

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

  // =========================================================
  // ABRIR
  // =========================================================

  function handleOpen() {
    setError(
      null
    );

    setOpen(
      true
    );
  }

  // =========================================================
  // FECHAR
  // =========================================================

  function handleClose() {
    if (
      isPending
    ) {
      return;
    }

    setError(
      null
    );

    setOpen(
      false
    );
  }

  // =========================================================
  // EXCLUIR
  // =========================================================

  function handleDelete() {
    if (
      isPending
    ) {
      return;
    }

    setError(
      null
    );

    startTransition(
      async () => {
        const formData =
          new FormData();

        formData.set(
          "userId",
          userId
        );

        const result =
          await deleteSystemUser(
            initialState,
            formData
          );

        if (
          !result.success
        ) {
          setError(
            result.error ??
              "Não foi possível excluir o usuário."
          );

          return;
        }

        setOpen(
          false
        );

        router.refresh();
      }
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
          handleOpen
        }
        title="Excluir usuário"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-base-content/25 transition hover:bg-error/10 hover:text-error"
      >
        <Trash2
          size={
            14
          }
        />
      </button>

      {/* =====================================================
          MODAL
      ====================================================== */}

      {open && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          {/* OVERLAY */}

          <button
            type="button"
            aria-label="Fechar confirmação"
            onClick={
              handleClose
            }
            className="absolute inset-0 cursor-default bg-black/35 backdrop-blur-[3px]"
          />

          {/* MODAL */}

          <div className="relative z-10 w-full max-w-[480px] overflow-hidden rounded-[22px] border border-base-300 bg-base-100 shadow-[0_30px_100px_rgba(0,0,0,0.22)]">
            {/* HEADER */}

            <div className="flex items-start justify-between gap-4 border-b border-base-300/70 px-5 py-5 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-error/10 text-error">
                  <Trash2
                    size={
                      18
                    }
                  />
                </div>

                <div>
                  <p className="text-[9px] font-[750] uppercase tracking-[0.14em] text-error">
                    Exclusão definitiva
                  </p>

                  <h2 className="mt-1 text-[18px] font-[750] tracking-[-0.03em] text-base-content">
                    Excluir usuário
                  </h2>

                  <p className="mt-1 text-[10px] leading-5 text-base-content/40">
                    Esta ação remove o acesso do usuário ao sistema.
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={
                  handleClose
                }
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base-content/30 transition hover:bg-base-200 hover:text-base-content disabled:opacity-40"
                aria-label="Fechar"
              >
                <X
                  size={
                    16
                  }
                />
              </button>
            </div>

            {/* CONTEÚDO */}

            <div className="px-5 py-5 sm:px-6">
              <div className="rounded-[16px] border border-base-300 bg-base-200/30 p-4">
                <p className="text-[9px] font-[650] uppercase tracking-[0.1em] text-base-content/30">
                  Usuário
                </p>

                <p className="mt-2 text-[13px] font-[700] text-base-content/80">
                  {userName}
                </p>

                {userEmail && (
                  <p className="mt-0.5 text-[10px] text-base-content/40">
                    {userEmail}
                  </p>
                )}

                {isSuperadminUser && (
                  <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-error/10 px-2.5 py-1.5 text-[9px] font-[700] text-error">
                    <AlertTriangle
                      size={
                        11
                      }
                    />

                    Conta Superadministradora
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-3 rounded-[16px] border border-error/15 bg-error/[0.035] p-4">
                <AlertTriangle
                  size={
                    17
                  }
                  className="mt-0.5 shrink-0 text-error"
                />

                <div>
                  <p className="text-[10px] font-[700] text-base-content/75">
                    Esta ação não pode ser desfeita.
                  </p>

                  <p className="mt-1 text-[9px] leading-5 text-base-content/40">
                    O usuário perderá o acesso ao Projeta Compras e sua
                    conta de autenticação será excluída.
                  </p>
                </div>
              </div>

              {error && (
                <div className="mt-4 rounded-[14px] border border-error/20 bg-error/[0.05] px-4 py-3">
                  <p className="text-[10px] font-[650] leading-5 text-error">
                    {error}
                  </p>
                </div>
              )}
            </div>

            {/* FOOTER */}

            <div className="flex flex-col-reverse gap-2 border-t border-base-300 bg-base-200/30 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={
                  handleClose
                }
                className="btn btn-ghost h-10 rounded-xl px-4 text-[10px]"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={
                  isPending
                }
                onClick={
                  handleDelete
                }
                className="btn btn-error h-10 rounded-xl px-4 text-[10px] text-white"
              >
                {isPending ? (
                  <>
                    <Loader2
                      size={
                        14
                      }
                      className="animate-spin"
                    />

                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2
                      size={
                        14
                      }
                    />

                    Excluir definitivamente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}