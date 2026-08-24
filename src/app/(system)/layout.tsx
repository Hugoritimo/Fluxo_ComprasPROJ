import type {
  ReactNode,
} from "react";

import {
  redirect,
} from "next/navigation";

import SystemSidebar from "@/components/layout/system-sidebar";

import SystemTopbar from "@/components/system/system-topbar";

import {
  createClient,
} from "@/lib/supabase/server";

// ============================================================
// TIPOS
// ============================================================

type SystemLayoutProps = {
  children: ReactNode;
};

type ProfileRow = {
  id: string;

  full_name:
    | string
    | null;

  email:
    | string
    | null;

  department:
    | string
    | null;

  job_title:
    | string
    | null;

  is_active: boolean;

  must_change_password: boolean;
};

// ============================================================
// LAYOUT PROTEGIDO
// ============================================================

export default async function SystemLayout({
  children,
}: Readonly<SystemLayoutProps>) {
  const supabase =
    await createClient();

  // =========================================================
  // 1. AUTENTICAÇÃO
  // =========================================================

  const {
    data:
      claimsData,
    error:
      claimsError,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (
    claimsError ||
    !userId
  ) {
    redirect(
      "/login"
    );
  }

  // =========================================================
  // 2. PERFIL + ROLES EM PARALELO
  // =========================================================
  //
  // Antes:
  // perfil -> aguarda -> roles
  //
  // Agora:
  // perfil + roles simultaneamente.
  // =========================================================

  const [
    profileResult,
    rolesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "profiles"
        )
        .select(
          `
          id,
          full_name,
          email,
          department,
          job_title,
          is_active,
          must_change_password
          `
        )
        .eq(
          "id",
          userId
        )
        .maybeSingle(),

      supabase
        .from(
          "user_roles"
        )
        .select(
          "role"
        )
        .eq(
          "user_id",
          userId
        ),
    ]);

  const profile =
    profileResult.data as
      | ProfileRow
      | null;

  // =========================================================
  // 3. PROFILE INVÁLIDO
  // =========================================================

  if (
    profileResult.error ||
    !profile
  ) {
    console.error(
      "[SYSTEM LAYOUT] Perfil não encontrado:",
      profileResult.error
    );

    await supabase.auth.signOut();

    redirect(
      "/login"
    );
  }

  // =========================================================
  // 4. CONTA DESATIVADA
  // =========================================================

  if (
    profile.is_active ===
    false
  ) {
    await supabase.auth.signOut();

    redirect(
      "/login"
    );
  }

  // =========================================================
  // 5. TROCA OBRIGATÓRIA DE SENHA
  // =========================================================

  if (
    profile.must_change_password ===
    true
  ) {
    redirect(
      "/primeiro-acesso"
    );
  }

  // =========================================================
  // 6. ROLES
  // =========================================================

  if (
    rolesResult.error
  ) {
    console.error(
      "[SYSTEM LAYOUT] Erro ao carregar roles:",
      rolesResult.error
    );
  }

  const roles =
    (
      rolesResult.data ??
      []
    ).map(
      (
        item
      ) =>
        String(
          item.role
        )
    );

  // =========================================================
  // 7. PERFIL COMPARTILHADO
  // =========================================================

  const fullName =
    profile.full_name?.trim() ||
    "Usuário";

  const email =
    profile.email?.trim() ||
    "";

  const shellProfile = {
    full_name:
      fullName,

    email,
  };

  // =========================================================
  // 8. RENDERIZAÇÃO
  // =========================================================

  return (
    <div className="min-h-screen bg-base-200/55 pb-20 lg:pb-0">
      {/* =====================================================
          SIDEBAR PERSISTENTE
      ====================================================== */}

      <SystemSidebar
        profile={
          shellProfile
        }
        roles={
          roles
        }
      />

      {/* =====================================================
          TOPBAR PERSISTENTE
      ====================================================== */}

      <SystemTopbar
        profile={
          shellProfile
        }
        roles={
          roles
        }
      />

      {/* =====================================================
          CONTEÚDO
      ====================================================== */}

      <div className="min-h-screen lg:pl-[272px]">
        <main className="min-h-screen px-4 pb-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}