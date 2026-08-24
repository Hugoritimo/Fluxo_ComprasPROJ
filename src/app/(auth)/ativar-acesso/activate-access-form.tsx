"use client";

import {
  useActionState,
} from "react";

import {
  ArrowRight,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import {
  activateAccess,
  type ActivateAccessState,
} from "./actions";

const initialState: ActivateAccessState = {
  error: null,
};

export default function ActivateAccessForm({
  tokenHash,
  type,
}: {
  tokenHash: string;
  type:
    | "invite"
    | "magiclink";
}) {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      activateAccess,
      initialState
    );

  return (
    <form
      action={formAction}
      className="space-y-4"
    >
      <input
        type="hidden"
        name="tokenHash"
        value={tokenHash}
      />

      <input
        type="hidden"
        name="type"
        value={type}
      />

      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
        >
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(175,27,27,0.18)] transition hover:bg-[#941717] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <>
            <LoaderCircle
              size={18}
              className="animate-spin"
            />

            Validando acesso...
          </>
        ) : (
          <>
            <ShieldCheck
              size={17}
            />

            Ativar meu acesso

            <ArrowRight
              size={16}
            />
          </>
        )}
      </button>
    </form>
  );
}