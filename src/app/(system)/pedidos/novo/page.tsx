import Link from "next/link";

import {
  ArrowLeft,
  FilePlus2,
} from "lucide-react";

import PurchaseRequestForm from "./purchase-request-form";

import { createClient } from "@/lib/supabase/server";

export default async function NewPurchaseRequestPage() {
  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub ?? null;

  const [
    companiesResult,
    departmentsResult,
    projectsResult,
    costCentersResult,
    profileResult,
  ] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name")
      .eq("active", true)
      .order("name"),

    supabase
      .from("departments")
      .select("id, name")
      .eq("active", true)
      .order("name"),

    supabase
      .from("projects")
      .select("id, name")
      .eq("active", true)
      .order("name"),

    supabase
      .from("cost_centers")
      .select("id, name, code")
      .eq("active", true)
      .order("name"),

    userId
      ? supabase
          .from("profiles")
          .select(
            "company_id, department_id"
          )
          .eq("id", userId)
          .single()
      : Promise.resolve({
          data: null,
          error: null,
        }),
  ]);

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="mb-8">
        <Link
          href="/pedidos"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
        >
          <ArrowLeft size={16} />
          Voltar para pedidos
        </Link>

        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#AF1B1B] text-white">
            <FilePlus2 size={22} />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#AF1B1B]">
              Pedido de Compra
            </p>

            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Nova solicitação
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Cadastre os itens necessários e
              envie a solicitação para o fluxo de
              compras.
            </p>
          </div>
        </div>
      </div>

      <PurchaseRequestForm
        companies={
          companiesResult.data ?? []
        }
        departments={
          departmentsResult.data ?? []
        }
        projects={
          projectsResult.data ?? []
        }
        costCenters={
          costCentersResult.data ?? []
        }
        defaults={{
          companyId:
            profileResult.data?.company_id ??
            null,

          departmentId:
            profileResult.data
              ?.department_id ?? null,
        }}
      />
    </div>
  );
}