import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  CreditCard,
  ShieldCheck,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import CardForm from "./card-form";

export default async function NewCardPage() {
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

  const roles = (
    roleRows ?? []
  ).map(
    (item) => item.role
  );

  const canManage =
    roles.includes("finance") ||
    roles.includes("admin") ||
    roles.includes(
      "superadmin"
    );

  if (!canManage) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/financeiro/cartoes"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft size={16} />

        Voltar para cartões
      </Link>

      <div className="mb-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#AF1B1B]/10 text-[#AF1B1B]">
          <CreditCard
            size={22}
          />
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
          Novo Cartão Corporativo
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          Cadastre um cartão para que ele
          possa ser utilizado nas
          solicitações aprovadas.
        </p>
      </div>

      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
        <ShieldCheck
          size={20}
          className="mt-0.5 shrink-0 text-emerald-600"
        />

        <div>
          <p className="text-sm font-semibold text-emerald-800">
            Cadastro seguro
          </p>

          <p className="mt-1 text-xs leading-5 text-emerald-700">
            Informe somente os últimos quatro
            dígitos. Não cadastre número
            completo, validade, senha ou CVV.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <CardForm />
      </section>
    </div>
  );
}