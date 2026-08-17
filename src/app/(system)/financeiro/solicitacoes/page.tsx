import type { ElementType } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowRight,
  Clock3,
  CreditCard,
  FileSearch,
  Search,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import CardRequestStatus from "@/components/cards/card-request-status";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    status?: string;
    q?: string;
  }>;
};

const statusOptions = [
  {
    value: "",
    label: "Todos os status",
  },
  {
    value: "submitted",
    label: "Solicitação enviada",
  },
  {
    value: "under_review",
    label: "Em análise",
  },
  {
    value: "awaiting_information",
    label: "Aguardando informações",
  },
  {
    value: "awaiting_approval",
    label: "Aguardando aprovação",
  },
  {
    value: "approved",
    label: "Aprovado",
  },
  {
    value: "rejected",
    label: "Reprovado",
  },
  {
    value: "card_reserved",
    label: "Cartão reservado",
  },
  {
    value: "card_delivered",
    label: "Cartão liberado",
  },
  {
    value: "in_use",
    label: "Em utilização",
  },
  {
    value: "awaiting_return",
    label: "Aguardando devolução",
  },
  {
    value: "returned",
    label: "Devolvido",
  },
  {
    value: "accountability_review",
    label: "Em conferência",
  },
  {
    value: "completed",
    label: "Concluído",
  },
  {
    value: "cancelled",
    label: "Cancelado",
  },
];

function formatCurrency(
  value: number | string | null
) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "pt-BR"
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}

export default async function FinanceRequestsPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const supabase =
    await createClient();

  // =========================================================
  // USUÁRIO LOGADO
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

  const roles = (
    roleRows ?? []
  ).map(
    (item) => item.role
  );

  const canAccess =
    roles.includes("finance") ||
    roles.includes("admin") ||
    roles.includes(
      "superadmin"
    );

  if (!canAccess) {
    redirect("/dashboard");
  }

  // =========================================================
  // FILTROS
  // =========================================================

  const status =
    params.status?.trim() ?? "";

  const search =
    params.q?.trim() ?? "";

  let requestsQuery =
    supabase
      .from("card_requests")
      .select(
        `
        id,
        request_number,
        requester_id,
        request_date,

        sienge_request_number,
        cost_center_or_site,
        suppliers_text,

        purpose,
        estimated_amount,
        approved_amount,

        status,
        expected_return_date,

        created_at,
        updated_at
        `
      )
      .is("deleted_at", null)
      .order("created_at", {
        ascending: false,
      });

  if (status) {
    requestsQuery =
      requestsQuery.eq(
        "status",
        status
      );
  }

  if (search) {
    const safeSearch =
      search
        .replace(/,/g, " ")
        .replace(/\(/g, " ")
        .replace(/\)/g, " ");

    requestsQuery =
      requestsQuery.or(
        [
          `request_number.ilike.%${safeSearch}%`,
          `sienge_request_number.ilike.%${safeSearch}%`,
          `cost_center_or_site.ilike.%${safeSearch}%`,
          `suppliers_text.ilike.%${safeSearch}%`,
        ].join(",")
      );
  }

  // =========================================================
  // CARREGA SOLICITAÇÕES + INDICADORES
  // =========================================================

  const [
    requestsResult,
    submittedResult,
    reviewResult,
    approvalResult,
    returnResult,
  ] = await Promise.all([
    requestsQuery,

    supabase
      .from("card_requests")
      .select("id", {
        count: "exact",
        head: true,
      })
      .is("deleted_at", null)
      .eq(
        "status",
        "submitted"
      ),

    supabase
      .from("card_requests")
      .select("id", {
        count: "exact",
        head: true,
      })
      .is("deleted_at", null)
      .eq(
        "status",
        "under_review"
      ),

    supabase
      .from("card_requests")
      .select("id", {
        count: "exact",
        head: true,
      })
      .is("deleted_at", null)
      .eq(
        "status",
        "awaiting_approval"
      ),

    supabase
      .from("card_requests")
      .select("id", {
        count: "exact",
        head: true,
      })
      .is("deleted_at", null)
      .eq(
        "status",
        "awaiting_return"
      ),
  ]);

  if (requestsResult.error) {
    console.error(
      "Erro ao carregar solicitações:",
      requestsResult.error
    );
  }

  const requests =
    requestsResult.data ?? [];

  // =========================================================
  // BUSCA PERFIS DOS SOLICITANTES
  // =========================================================

  const requesterIds =
    Array.from(
      new Set(
        requests
          .map(
            (request) =>
              request.requester_id
          )
          .filter(Boolean)
      )
    );

  let profiles: {
    id: string;
    full_name: string;
    email: string;
  }[] = [];

  if (
    requesterIds.length > 0
  ) {
    const {
      data: profileRows,
      error: profilesError,
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

    if (profilesError) {
      console.error(
        "Erro ao carregar solicitantes:",
        profilesError
      );
    }

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
  // PÁGINA
  // =========================================================

  return (
    <div className="mx-auto max-w-[1600px]">
      {/* CABEÇALHO */}

      <div className="mb-8">
        <p className="text-sm font-semibold text-[#AF1B1B]">
          Financeiro
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Gerenciar Solicitações
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Analise e acompanhe as
          solicitações de cartão de crédito
          recebidas.
        </p>
      </div>

      {/* INDICADORES */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={FileSearch}
          label="Novas solicitações"
          value={
            submittedResult.count ??
            0
          }
        />

        <SummaryCard
          icon={Clock3}
          label="Em análise"
          value={
            reviewResult.count ??
            0
          }
        />

        <SummaryCard
          icon={ShieldCheck}
          label="Aguardando aprovação"
          value={
            approvalResult.count ??
            0
          }
        />

        <SummaryCard
          icon={TriangleAlert}
          label="Aguardando devolução"
          value={
            returnResult.count ??
            0
          }
          attention={
            (returnResult.count ??
              0) > 0
          }
        />
      </div>

      {/* LISTAGEM */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* FILTROS */}

        <div className="border-b border-slate-100 p-5 sm:p-6">
          <form
            method="get"
            className="grid gap-3 lg:grid-cols-[1fr_260px_auto]"
          >
            <div className="relative">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                name="q"
                defaultValue={search}
                placeholder="Buscar por solicitação, Sienge, obra ou fornecedor..."
                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
              />
            </div>

            <select
              name="status"
              defaultValue={status}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
            >
              {statusOptions.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}
            </select>

            <button
              type="submit"
              className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Filtrar
            </button>
          </form>
        </div>

        {/* QUANTIDADE */}

        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-xs text-slate-500">
            {requests.length}{" "}
            solicitação
            {requests.length === 1
              ? ""
              : "ões"}{" "}
            encontrada
            {requests.length === 1
              ? ""
              : "s"}.
          </p>
        </div>

        {/* VAZIO */}

        {requests.length ===
        0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <CreditCard
                size={24}
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-700">
              Nenhuma solicitação
              encontrada
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Novas solicitações de
              cartão aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map(
              (request) => {
                const requester =
                  profileMap.get(
                    request.requester_id
                  );

                return (
                  <Link
                    key={request.id}
                    href={`/financeiro/solicitacoes/${request.id}`}
                    className="group block px-6 py-5 transition hover:bg-slate-50/70"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                      {/* PRINCIPAL */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-[#AF1B1B]">
                            {request.request_number ??
                              "-"}
                          </span>

                          <CardRequestStatus
                            status={
                              request.status
                            }
                          />
                        </div>

                        <h3 className="mt-2 truncate text-sm font-semibold text-slate-900">
                          {request.purpose}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                          <span>
                            Solicitante:{" "}
                            {requester?.full_name ??
                              "Não identificado"}
                          </span>

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
                            {formatDate(
                              request.request_date
                            )}
                          </span>
                        </div>
                      </div>

                      {/* VALOR */}

                      <div className="flex items-center justify-between gap-6 xl:justify-end">
                        <div className="xl:text-right">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Valor solicitado
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatCurrency(
                              request.estimated_amount
                            )}
                          </p>

                          {request.approved_amount !==
                            null && (
                            <p className="mt-1 text-[11px] font-medium text-emerald-600">
                              Aprovado:{" "}
                              {formatCurrency(
                                request.approved_amount
                              )}
                            </p>
                          )}
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition group-hover:bg-white group-hover:text-[#AF1B1B]">
                          <ArrowRight
                            size={18}
                          />
                        </div>
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

// ============================================================
// CARD DE INDICADOR
// ============================================================

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