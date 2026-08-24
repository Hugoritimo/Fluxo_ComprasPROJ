import {
  redirect,
} from "next/navigation";

import {
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import ActivateAccessForm from "./activate-access-form";

type PageProps = {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
  }>;
};

export default async function ActivateAccessPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const tokenHash =
    params.token_hash?.trim();

  const type =
    params.type?.trim();

  if (!tokenHash) {
    redirect(
      "/link-invalido"
    );
  }

  if (
    type !== "invite" &&
    type !== "magiclink"
  ) {
    redirect(
      "/link-invalido"
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F7F8] px-6 py-12">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[#AF1B1B]/[0.04] blur-3xl" />

      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[480px] w-[480px] rounded-full bg-[#AF1B1B]/[0.035] blur-3xl" />

      <div className="relative w-full max-w-[480px]">
        {/* MARCA */}

        <div className="mb-8 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171717] text-lg font-bold text-white shadow-xl">
            P
          </div>
        </div>

        {/* CARD */}

        <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
          <div className="border-b border-slate-100 px-7 py-7 sm:px-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#AF1B1B]/10 text-[#AF1B1B]">
              <KeyRound
                size={20}
              />
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#AF1B1B]">
              Projeta Compras
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-slate-950">
              Ativação de acesso
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Você recebeu um acesso ao sistema
              corporativo da Projeta. Confirme abaixo
              para continuar com a configuração da sua
              conta.
            </p>
          </div>

          <div className="px-7 py-7 sm:px-8">
            <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex gap-3">
                <ShieldCheck
                  size={18}
                  className="mt-0.5 shrink-0 text-slate-500"
                />

                <p className="text-xs leading-5 text-slate-500">
                  O link somente será validado após você
                  clicar em{" "}
                  <strong className="text-slate-700">
                    Ativar meu acesso
                  </strong>
                  . Em seguida, será solicitado que você
                  defina sua senha pessoal.
                </p>
              </div>
            </div>

            <ActivateAccessForm
              tokenHash={
                tokenHash
              }
              type={type}
            />
          </div>
        </section>

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
          <LockKeyhole
            size={13}
          />

          Link individual e de uso único
        </div>
      </div>
    </main>
  );
}