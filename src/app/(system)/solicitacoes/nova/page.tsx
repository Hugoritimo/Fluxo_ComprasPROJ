import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowLeft,
  CreditCard,
} from "lucide-react";

import { createClient } from "@/lib/supabase/server";

import CardRequestForm from "./card-request-form";

export default async function NewCardRequestPage() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: profile, error } =
    await supabase
      .from("profiles")
      .select(
        `
        full_name,
        email
        `
      )
      .eq("id", userId)
      .single();

  if (error || !profile) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-[1200px]">
      <Link
        href="/dashboard"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft size={16} />
        Voltar ao Dashboard
      </Link>

      <div className="mb-7">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#AF1B1B] text-white">
            <CreditCard size={22} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#AF1B1B]">
              Solicitação
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Solicitar Cartão
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              O pedido deve estar previamente
              cadastrado no Sienge.
            </p>
          </div>
        </div>
      </div>

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