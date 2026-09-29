import {
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import ActivateAccessForm from "./activate-access-form";

type ActivationType =
  | "invite"
  | "magiclink"
  | "email";

type PageProps = {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
  }>;
};

// ============================================================
// VALIDAR TIPO DE LINK
// ============================================================

function isValidActivationType(
  value:
    | string
    | undefined
): value is ActivationType {
  return (
    value === "invite" ||
    value === "magiclink" ||
    value === "email"
  );
}

// ============================================================
// PAGE
// ============================================================

export default async function ActivateAccessPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  // ==========================================================
  // TOKEN
  // ==========================================================

  const tokenHash =
    params.token_hash
      ?.trim() ||
    null;

  // ==========================================================
  // TIPO
  // ==========================================================

  const rawType =
    params.type
      ?.trim()
      .toLowerCase();

  const activationType:
    ActivationType | null =
    isValidActivationType(
      rawType
    )
      ? rawType
      : null;

  // ==========================================================
  // LINK VÁLIDO
  // ==========================================================

  const hasValidLink =
    Boolean(
      tokenHash &&
      activationType
    );

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F7F8] px-6 py-12">
      {/* ======================================================
          FUNDO
      ====================================================== */}

      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[#AF1B1B]/[0.04] blur-3xl" />

      <div className="pointer-events-none absolute -bottom-48 -right-32 h-[480px] w-[480px] rounded-full bg-[#AF1B1B]/[0.035] blur-3xl" />

      <div className="relative w-full max-w-[480px]">
        {/* ====================================================
            MARCA
        ==================================================== */}

        <div className="mb-8 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171717] text-lg font-bold text-white shadow-xl">
            P
          </div>
        </div>

        {/* ====================================================
            CARD
        ==================================================== */}

        <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
          {/* ==================================================
              HEADER
          ================================================== */}

          <div className="border-b border-slate-100 px-7 py-7 sm:px-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#AF1B1B]/10 text-[#AF1B1B]">
              <KeyRound
                size={
                  20
                }
              />
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#AF1B1B]">
              Projeta Compras
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-slate-950">
              Ativação de acesso
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Você recebeu um acesso ao sistema corporativo da
              Projeta. Confirme abaixo para continuar com a
              configuração da sua conta.
            </p>
          </div>

          {/* ==================================================
              CONTEÚDO
          ================================================== */}

          <div className="px-7 py-7 sm:px-8">
            {hasValidLink &&
            tokenHash &&
            activationType ? (
              <>
                {/* ============================================
                    INFORMAÇÃO DE SEGURANÇA
                ============================================ */}

                <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex gap-3">
                    <ShieldCheck
                      size={
                        18
                      }
                      className="mt-0.5 shrink-0 text-slate-500"
                    />

                    <p className="text-xs leading-5 text-slate-500">
                      O link somente será validado após você clicar
                      em{" "}
                      <strong className="text-slate-700">
                        Ativar meu acesso
                      </strong>
                      . Em seguida, será solicitado que você defina
                      sua senha pessoal.
                    </p>
                  </div>
                </div>

                {/* ============================================
                    FORMULÁRIO
                ============================================ */}

                <ActivateAccessForm
                  tokenHash={
                    tokenHash
                  }
                  type={
                    activationType
                  }
                />
              </>
            ) : (
              /* ==============================================
                  LINK MALFORMADO
              ============================================== */

              <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                <div className="flex gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-red-600">
                    <TriangleAlert
                      size={
                        18
                      }
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-red-800">
                      Link de ativação inválido
                    </p>

                    <p className="mt-1 text-xs leading-5 text-red-700">
                      Este endereço está incompleto ou não possui
                      os dados necessários para ativar sua conta.
                      Solicite um novo link ao administrador.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ====================================================
            FOOTER
        ==================================================== */}

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
          <LockKeyhole
            size={
              13
            }
          />

          Link individual e de uso único
        </div>
      </div>
    </main>
  );
}