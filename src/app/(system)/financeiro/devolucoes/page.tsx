import type { ElementType } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Receipt,
  RotateCcw,
} from "lucide-react";

import CardRequestStatus from "@/components/cards/card-request-status";
import { createClient } from "@/lib/supabase/server";

function formatCurrency(
  value: number | string | null
) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "pt-BR"
  ).format(
    new Date(`${value}T12:00:00`)
  );
}

export default async function FinanceReturnsPage() {
  const supabase =
    await createClient();

  // =========================================================
  // AUTENTICAÇÃO
  // =========================================================

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  // =========================================================
  // PERMISSÕES
  // =========================================================

  const {
    data: roleRows,
  } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles =
    (roleRows ?? []).map(
      (item) => item.role
    );

  const canAccess =
    roles.includes("finance") ||
    roles.includes("admin") ||
    roles.includes("superadmin");

  if (!canAccess) {
    redirect("/dashboard");
  }

  // =========================================================
  // SOLICITAÇÕES COM PRESTAÇÃO DE CONTAS
  // =========================================================

  const {
    data: requests,
    error,
  } = await supabase
    .from("card_requests")
    .select(
      `
      id,
      request_number,
      requester_id,

      sienge_request_number,
      cost_center_or_site,
      suppliers_text,

      estimated_amount,
      approved_amount,

      status,

      returned_at,
      completed_at,
      updated_at
      `
    )
    .is("deleted_at", null)
    .in("status", [
      "returned",
      "accountability_review",
      "completed",
    ])
    .order("updated_at", {
      ascending: false,
    });

  if (error) {
    console.error(
      "Erro ao carregar devoluções:",
      error
    );
  }

  const data =
    requests ?? [];

  // =========================================================
  // PERFIS
  // =========================================================

  const requesterIds =
    Array.from(
      new Set(
        data
          .map(
            (item) =>
              item.requester_id
          )
          .filter(Boolean)
      )
    );

  let profiles: {
    id: string;
    full_name: string;
    email: string;
  }[] = [];

  if (requesterIds.length > 0) {
    const {
      data: profileRows,
    } = await supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email
        `
      )
      .in(
        "id",
        requesterIds
      );

    profiles =
      profileRows ?? [];
  }

  const profileMap =
    new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );

  // =========================================================
  // PRESTAÇÕES
  // =========================================================

  const requestIds =
    data.map(
      (item) => item.id
    );

  let accountabilities: {
    card_request_id: string;
    actual_amount: number | string;
    purchase_date: string;
    supplier_name: string;
    approved: boolean;
  }[] = [];

  if (requestIds.length > 0) {
    const {
      data: accountabilityRows,
    } = await supabase
      .from("card_accountability")
      .select(
        `
        card_request_id,
        actual_amount,
        purchase_date,
        supplier_name,
        approved
        `
      )
      .in(
        "card_request_id",
        requestIds
      );

    accountabilities =
      accountabilityRows ?? [];
  }

  const accountabilityMap =
    new Map(
      accountabilities.map(
        (item) => [
          item.card_request_id,
          item,
        ]
      )
    );

  // =========================================================
  // INDICADORES
  // =========================================================

  const returnedCount =
    data.filter(
      (item) =>
        item.status === "returned"
    ).length;

  const reviewCount =
    data.filter(
      (item) =>
        item.status ===
        "accountability_review"
    ).length;

  const completedCount =
    data.filter(
      (item) =>
        item.status ===
        "completed"
    ).length;

  const totalUsed =
    accountabilities.reduce(
      (total, item) =>
        total +
        Number(
          item.actual_amount ?? 0
        ),
      0
    );

  return (
    <div className="mx-auto max-w-[1550px]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="mb-8">
        <p className="text-sm font-semibold text-[#AF1B1B]">
          Financeiro
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Conferência de Devoluções
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Confira os valores, documentos
          fiscais e comprovantes das
          prestações de contas recebidas.
        </p>
      </div>

      {/* =====================================================
          INDICADORES
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={Receipt}
          label="Aguardando conferência"
          value={returnedCount}
          attention={
            returnedCount > 0
          }
        />

        <SummaryCard
          icon={Clock3}
          label="Em conferência"
          value={reviewCount}
        />

        <SummaryCard
          icon={CheckCircle2}
          label="Concluídas"
          value={completedCount}
        />

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <FileCheck2 size={19} />
          </div>

          <p className="mt-4 text-xl font-semibold text-slate-950">
            {formatCurrency(
              totalUsed
            )}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Valor prestado
          </p>
        </div>
      </div>

      {/* =====================================================
          LISTAGEM
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="font-semibold text-slate-950">
              Prestações de Contas
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              {data.length} registro
              {data.length === 1
                ? ""
                : "s"}{" "}
              encontrado
              {data.length === 1
                ? ""
                : "s"}.
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <RotateCcw size={19} />
          </div>
        </div>

        {data.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <Receipt size={28} />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-800">
              Nenhuma prestação recebida
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              As devoluções enviadas pelos
              colaboradores aparecerão aqui
              automaticamente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.map(
              (request) => {
                const requester =
                  profileMap.get(
                    request.requester_id
                  );

                const accountability =
                  accountabilityMap.get(
                    request.id
                  );

                return (
                  <Link
                    key={request.id}
                    href={`/financeiro/devolucoes/${request.id}`}
                    className="group block px-6 py-5 transition hover:bg-slate-50/70"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                      {/* PRINCIPAL */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[#AF1B1B]">
                            {
                              request.request_number
                            }
                          </span>

                          <CardRequestStatus
                            status={
                              request.status
                            }
                          />
                        </div>

                        <h3 className="mt-3 text-sm font-semibold text-slate-900">
                          {requester
                            ?.full_name ??
                            "Solicitante não identificado"}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                          <span>
                            Sienge:{" "}
                            {request.sienge_request_number ??
                              "-"}
                          </span>

                          <span>
                            {request.cost_center_or_site ??
                              "-"}
                          </span>

                          <span>
                            {accountability
                              ?.supplier_name ??
                              request.suppliers_text ??
                              "-"}
                          </span>

                          {accountability
                            ?.purchase_date && (
                            <span>
                              Compra:{" "}
                              {formatDate(
                                accountability.purchase_date
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* VALORES */}

                      <div className="grid min-w-[340px] grid-cols-3 gap-5">
                        <ValueField
                          label="Solicitado"
                          value={formatCurrency(
                            request.estimated_amount
                          )}
                        />

                        <ValueField
                          label="Aprovado"
                          value={
                            request.approved_amount !==
                            null
                              ? formatCurrency(
                                  request.approved_amount
                                )
                              : "-"
                          }
                        />

                        <ValueField
                          label="Utilizado"
                          value={
                            accountability
                              ? formatCurrency(
                                  accountability.actual_amount
                                )
                              : "-"
                          }
                          strong
                        />
                      </div>

                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-400 transition group-hover:bg-white group-hover:text-[#AF1B1B]">
                        <ArrowRight
                          size={18}
                        />
                      </div>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  attention = false,
}: {
  icon: ElementType;
  label: string;
  value: number;
  attention?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-xl",
          attention
            ? "bg-red-50 text-red-600"
            : "bg-slate-100 text-slate-500",
        ].join(" ")}
      >
        <Icon size={19} />
      </div>

      <p className="mt-4 text-2xl font-semibold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {label}
      </p>
    </div>
  );
}

function ValueField({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-sm font-semibold",
          strong
            ? "text-[#AF1B1B]"
            : "text-slate-800",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}