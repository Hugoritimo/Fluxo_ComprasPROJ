import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  ArrowLeft,
  CreditCard,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import CardRequestForm from "./card-request-form";

import RequestLinkButton from "./request-link-button";

// ============================================================
// PÁGINA
// ============================================================

export default async function NewCardRequestPage() {
  const supabase =
    await createClient();

  // =========================================================
  // AUTENTICAÇÃO
  // =========================================================

  const {
    data:
      claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (
    !userId
  ) {
    redirect(
      "/login"
    );
  }

  // =========================================================
  // PERFIL
  // =========================================================

  const {
    data:
      profile,
    error,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(
        `
        full_name,
        email
        `
      )
      .eq(
        "id",
        userId
      )
      .single();

  if (
    error ||
    !profile
  ) {
    redirect(
      "/dashboard"
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div className="mx-auto max-w-[1200px]">
      {/* =====================================================
          VOLTAR
      ====================================================== */}

      <Link
        href="/dashboard"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft
          size={
            16
          }
        />

        Voltar ao Dashboard
      </Link>

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="mb-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          {/* =================================================
              TÍTULO
          ================================================== */}

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#AF1B1B] text-white shadow-[0_10px_30px_rgba(175,27,27,0.18)]">
              <CreditCard
                size={
                  22
                }
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-[#AF1B1B]">
                Solicitação
              </p>

              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
                Solicitar Cartão
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                O pedido deve estar previamente cadastrado no Sienge.
              </p>
            </div>
          </div>

          {/* =================================================
              GERAR LINK
          ================================================== */}

          <div className="shrink-0 sm:self-start">
            <RequestLinkButton />
          </div>
        </div>
      </div>

      {/* =====================================================
          FORMULÁRIO
      ====================================================== */}

      <CardRequestForm
        profile={{
          fullName:
            profile.full_name,

          email:
            profile.email,
        }}
      />
    </div>
  );
}