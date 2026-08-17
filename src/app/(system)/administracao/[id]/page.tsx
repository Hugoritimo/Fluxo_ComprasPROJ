import Link from "next/link";

import {
  ArrowLeft,
  Mail,
  ShieldCheck,
  UserCog,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import UserForm from "./user-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function UserDetailsPage({
  params,
}: PageProps) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  // =========================================================
  // AUTENTICAÇÃO
  // =========================================================

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const currentUserId =
    claimsData?.claims?.sub;

  if (!currentUserId) {
    redirect("/login");
  }

  // =========================================================
  // PERMISSÃO DO ATOR
  // =========================================================

  const {
    data: actorRoleRows,
  } = await supabase
    .from("user_roles")
    .select("role")
    .eq(
      "user_id",
      currentUserId
    );

  const actorRoles =
    (
      actorRoleRows ??
      []
    ).map(
      (item) =>
        item.role
    );

  const actorIsAdmin =
    actorRoles.includes(
      "admin"
    );

  const actorIsSuperadmin =
    actorRoles.includes(
      "superadmin"
    );

  if (
    !actorIsAdmin &&
    !actorIsSuperadmin
  ) {
    redirect("/dashboard");
  }

  // =========================================================
  // USUÁRIO
  // =========================================================

  const [
    profileResult,
    rolesResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email,
        job_title,
        active,
        created_at,
        updated_at
        `
      )
      .eq(
        "id",
        id
      )
      .single(),

    supabase
      .from("user_roles")
      .select("role")
      .eq(
        "user_id",
        id
      ),
  ]);

  if (
    profileResult.error ||
    !profileResult.data
  ) {
    notFound();
  }

  const profile =
    profileResult.data;

  const roles =
    (
      rolesResult.data ??
      []
    ).map(
      (item) =>
        item.role
    );

  const targetIsSuperadmin =
    roles.includes(
      "superadmin"
    );

  const canEditTarget =
    actorIsSuperadmin ||
    !targetIsSuperadmin;

  return (
    <div className="mx-auto max-w-4xl">
      {/* VOLTAR */}

      <Link
        href="/administracao/usuarios"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft
          size={16}
        />

        Voltar para usuários
      </Link>

      {/* HEADER */}

      <div className="mb-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#AF1B1B]/10 text-[#AF1B1B]">
          <UserCog
            size={22}
          />
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
          {profile.full_name}
        </h1>

        <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-slate-500">
          <span className="inline-flex items-center gap-2">
            <Mail
              size={15}
            />

            {profile.email}
          </span>

          {targetIsSuperadmin && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#AF1B1B]/10 px-2.5 py-1 text-xs font-semibold text-[#AF1B1B]">
              <ShieldCheck
                size={13}
              />

              Superadmin
            </span>
          )}

          <span
            className={[
              "rounded-full px-2.5 py-1 text-xs font-semibold",
              profile.active
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-600",
            ].join(
              " "
            )}
          >
            {profile.active
              ? "Ativo"
              : "Inativo"}
          </span>
        </div>
      </div>

      {/* FORM */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <UserForm
          user={{
            id:
              profile.id,

            full_name:
              profile.full_name,

            email:
              profile.email,

            job_title:
              profile.job_title,

            active:
              profile.active,

            roles,
          }}
          currentUserId={
            currentUserId
          }
          actorIsSuperadmin={
            actorIsSuperadmin
          }
          canEditTarget={
            canEditTarget
          }
        />
      </section>
    </div>
  );
}