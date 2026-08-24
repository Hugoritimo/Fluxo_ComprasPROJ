"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  CheckCircle2,
  Clipboard,
  KeyRound,
  LoaderCircle,
  RefreshCcw,
  X,
} from "lucide-react";

import {
  generateFirstAccessLink,
  type FirstAccessLinkState,
} from "./actions";

const initialState: FirstAccessLinkState = {
  success: false,
  error: null,
};

export default function FirstAccessLinkButton({
  userId,
}: {
  userId: string;
}) {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      generateFirstAccessLink,
      initialState
    );

  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    copied,
    setCopied,
  ] =
    useState(false);

  async function copyLink() {
    if (
      !state.invitationLink
    ) {
      return;
    }

    await navigator.clipboard.writeText(
      state.invitationLink
    );

    setCopied(true);

    window.setTimeout(
      () =>
        setCopied(false),
      2000
    );
  }

  return (
    <>
      <form
        action={async (
          formData
        ) => {
          await formAction(
            formData
          );

          setOpen(true);
        }}
      >
        <input
          type="hidden"
          name="userId"
          value={userId}
        />

        <button
          type="submit"
          disabled={pending}
          title="Gerar novo link de primeiro acesso"
          className="btn btn-ghost btn-sm gap-2 rounded-xl text-warning"
        >
          {pending ? (
            <LoaderCircle
              size={15}
              className="animate-spin"
            />
          ) : (
            <KeyRound
              size={15}
            />
          )}

          <span className="hidden 2xl:inline">
            Link de acesso
          </span>
        </button>
      </form>

      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <button
            type="button"
            aria-label="Fechar"
            onClick={() =>
              setOpen(false)
            }
            className="absolute inset-0"
          />

          <div className="relative z-10 w-full max-w-lg rounded-[24px] border border-base-300 bg-base-100 p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-warning/10 text-warning">
                <RefreshCcw
                  size={19}
                />
              </div>

              <button
                type="button"
                onClick={() =>
                  setOpen(false)
                }
                className="btn btn-ghost btn-circle btn-sm"
              >
                <X size={16} />
              </button>
            </div>

            {state.error ? (
              <>
                <h2 className="mt-5 text-xl font-semibold">
                  Não foi possível gerar
                </h2>

                <div className="mt-4 rounded-xl border border-error/20 bg-error/5 p-4 text-sm text-error">
                  {state.error}
                </div>
              </>
            ) : (
              <>
                <h2 className="mt-5 text-xl font-semibold">
                  Novo link gerado
                </h2>

                <p className="mt-2 text-sm leading-6 text-base-content/50">
                  Um novo link de primeiro acesso foi
                  gerado para:
                </p>

                <p className="mt-1 text-sm font-semibold">
                  {state.email}
                </p>

                <button
                  type="button"
                  onClick={copyLink}
                  className="btn btn-primary mt-5 w-full gap-2 rounded-xl"
                >
                  {copied ? (
                    <CheckCircle2
                      size={16}
                    />
                  ) : (
                    <Clipboard
                      size={16}
                    />
                  )}

                  {copied
                    ? "Link copiado"
                    : "Copiar novo link"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}