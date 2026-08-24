import { redirect } from "next/navigation";

import {
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import FirstAccessForm from "./first-access-form";

// ============================================================
// PAGE
// ============================================================

export default async function FirstAccessPage() {
  const supabase =
    await createClient();

  // =========================================================
  // AUTH
  // =========================================================

  const {
    data: claimsData,
    error: claimsError,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (
    claimsError ||
    !userId
  ) {
    redirect("/login");
  }

  // =========================================================
  // PROFILE
  // =========================================================

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email,
        is_active,
        must_change_password
        `
      )
      .eq(
        "id",
        userId
      )
      .maybeSingle();

  if (
    profileError ||
    !profile
  ) {
    console.error(
      "[PRIMEIRO ACESSO] Erro ao carregar profile:",
      profileError
    );

    redirect("/login");
  }

  // =========================================================
  // INATIVO
  // =========================================================

  if (
    profile.is_active ===
    false
  ) {
    redirect("/login");
  }

  // =========================================================
  // JÁ CONFIGURADO
  // =========================================================

  if (
    profile.must_change_password !==
    true
  ) {
    redirect("/dashboard");
  }

  const firstName =
    profile.full_name
      ?.trim()
      .split(/\s+/)[0] ??
    "Usuário";

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#F7F7F8] px-6 py-12">
      {/* =====================================================
          BACKGROUND
      ====================================================== */}

      <div className="pointer-events-none absolute -left-40 -top-40 h-[420px] w-[420px] rounded-full bg-[#AF1B1B]/[0.045] blur-3xl" />

      <div className="pointer-events-none absolute -bottom-52 -right-32 h-[500px] w-[500px] rounded-full bg-[#AF1B1B]/[0.035] blur-3xl" />

      {/* =====================================================
          CONTEÚDO
      ====================================================== */}

      <div className="relative w-full max-w-[500px]">
        {/* MARCA */}

        <div className="mb-8 flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#171717] text-lg font-bold text-white shadow-xl">
            P
          </div>
        </div>

        {/* CARD */}

        <section className="overflow-hidden rounded-[24px] border border-slate-200/80 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.06)]">
          {/* HEADER */}

          <div className="border-b border-slate-100 px-7 py-7 sm:px-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#AF1B1B]/10 text-[#AF1B1B]">
              <KeyRound
                size={20}
              />
            </div>

            <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-[#AF1B1B]">
              Segurança da conta
            </p>

            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em] text-slate-950">
              Crie sua senha
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Olá,{" "}
              <strong className="font-semibold text-slate-700">
                {firstName}
              </strong>
              . Seu acesso foi validado. Agora defina
              uma senha pessoal para concluir a
              configuração da sua conta.
            </p>
          </div>

          {/* FORM */}

          <div className="px-7 py-7 sm:px-8">
            <FirstAccessForm />
          </div>
        </section>

        {/* FOOTER */}

        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
          <LockKeyhole
            size={13}
          />

          Sua senha não é visível aos administradores
        </div>

        <div className="mt-2 flex items-center justify-center gap-2 text-[10px] text-slate-400">
          <ShieldCheck
            size={12}
          />

          Projeta Compras
        </div>
      </div>
    </main>
  );
}