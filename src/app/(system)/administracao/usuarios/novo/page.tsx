import Link from "next/link";

import {
  ArrowLeft,
  MailPlus,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import InviteForm from "./invite-form";

export default async function NewUserPage() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const {
    data: roleRows,
  } =
    await supabase
      .from("user_roles")
      .select("role")
      .eq(
        "user_id",
        userId
      );

  const roles =
    (
      roleRows ??
      []
    ).map(
      (item) =>
        item.role
    );

  const isAdmin =
    roles.includes(
      "admin"
    );

  const isSuperadmin =
    roles.includes(
      "superadmin"
    );

  if (
    !isAdmin &&
    !isSuperadmin
  ) {
    redirect(
      "/dashboard"
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/administracao/usuarios"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft
          size={16}
        />

        Voltar para usuários
      </Link>

      <div className="mb-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#AF1B1B]/10 text-[#AF1B1B]">
          <MailPlus
            size={22}
          />
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
          Novo Usuário
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Cadastre o colaborador e envie
          um convite para criação da senha
          de acesso ao Projeta Compras.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <InviteForm
          actorIsSuperadmin={
            isSuperadmin
          }
        />
      </section>
    </div>
  );
}