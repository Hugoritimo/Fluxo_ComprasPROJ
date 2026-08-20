import Link from "next/link";

import {
  ArrowRight,
  FileCheck2,
  Plus,
} from "lucide-react";

import PurchaseStatus from "@/components/purchases/purchase-status";
import { createClient } from "@/lib/supabase/server";

import ExportPurchasesButton from "./export-purchases-button";

// ============================================================
// FORMATADORES
// ============================================================

function formatCurrency(
  value: number | string | null
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(
    Number(value ?? 0)
  );
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "Não definida";
  }

  return new Intl.DateTimeFormat(
    "pt-BR"
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}

function priorityLabel(
  priority: string
) {
  const labels: Record<
    string,
    string
  > = {
    low: "Baixa",
    normal: "Normal",
    medium: "Média",
    high: "Alta",
    urgent: "Urgente",
  };

  return (
    labels[priority] ??
    priority
  );
}

// ============================================================
// PAGE
// ============================================================

export default async function PurchaseRequestsPage() {
  const supabase =
    await createClient();

  // ==========================================================
  // USUÁRIO ATUAL
  // ==========================================================

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  // ==========================================================
  // PEDIDOS
  // ==========================================================

  const {
    data: requests,
    error,
  } =
    await supabase
      .from(
        "purchase_requests"
      )
      .select(
        `
        id,
        request_number,
        title,
        justification,
        priority,
        estimated_total,
        required_date,
        status,
        created_at,
        project:projects(name),
        department:departments(name)
        `
      )
      .is(
        "deleted_at",
        null
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      );

  if (error) {
    console.error(
      "Erro ao carregar pedidos:",
      error
    );
  }

  // ==========================================================
  // PERMISSÃO PARA EXPORTAÇÃO
  // ==========================================================

  let canExport =
    false;

  if (userId) {
    const {
      data: roleRows,
      error: roleError,
    } =
      await supabase
        .from(
          "user_roles"
        )
        .select(
          "role"
        )
        .eq(
          "user_id",
          userId
        );

    if (roleError) {
      console.error(
        "Erro ao carregar permissões:",
        roleError
      );
    }

    const roles = (
      roleRows ?? []
    ).map(
      (item) =>
        item.role
    );

    canExport =
      roles.includes(
        "buyer"
      ) ||
      roles.includes(
        "admin"
      ) ||
      roles.includes(
        "superadmin"
      );
  }

  // ==========================================================
  // DADOS
  // ==========================================================

  const data =
    requests ?? [];

  const openCount =
    data.filter(
      (request) =>
        ![
          "completed",
          "cancelled",
          "rejected",
        ].includes(
          request.status
        )
    ).length;

  const awaitingApprovalCount =
    data.filter(
      (request) =>
        request.status ===
        "awaiting_approval"
    ).length;

  const completedCount =
    data.filter(
      (request) =>
        request.status ===
        "completed"
    ).length;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#AF1B1B]">
            Compras
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Pedidos de Compra
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Acompanhe suas
            solicitações e o
            andamento dos pedidos.
          </p>
        </div>

        {/* ===================================================
            AÇÕES
        ==================================================== */}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {canExport && (
            <ExportPurchasesButton />
          )}

          <Link
            href="/pedidos/novo"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white transition hover:bg-[#921717]"
          >
            <Plus
              size={18}
            />

            Novo pedido
          </Link>
        </div>
      </div>

      {/* =====================================================
          RESUMO
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Em andamento"
          value={
            openCount
          }
        />

        <SummaryCard
          label="Aguardando aprovação"
          value={
            awaitingApprovalCount
          }
        />

        <SummaryCard
          label="Concluídos"
          value={
            completedCount
          }
        />
      </div>

      {/* =====================================================
          LISTA
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-semibold text-slate-950">
            Solicitações
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {data.length} pedido
            {data.length === 1
              ? ""
              : "s"}{" "}
            encontrado
            {data.length === 1
              ? ""
              : "s"}
            .
          </p>
        </div>

        {/* ===================================================
            VAZIO
        ==================================================== */}

        {data.length ===
        0 ? (
          <div className="flex min-h-80 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <FileCheck2
                size={24}
              />
            </div>

            <h3 className="mt-4 text-sm font-semibold text-slate-800">
              Nenhum pedido
              registrado
            </h3>

            <p className="mt-1 max-w-sm text-xs leading-5 text-slate-400">
              Quando você criar
              uma solicitação de
              compra, ela
              aparecerá aqui.
            </p>

            <Link
              href="/pedidos/novo"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#AF1B1B]"
            >
              <Plus
                size={16}
              />

              Criar primeiro
              pedido
            </Link>
          </div>
        ) : (
          /* =================================================
             PEDIDOS
          ================================================== */

          <div className="divide-y divide-slate-100">
            {data.map(
              (request) => (
                <Link
                  key={
                    request.id
                  }
                  href={`/pedidos/${request.id}`}
                  className="group block px-6 py-5 transition hover:bg-slate-50/70"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    {/* =========================================
                        IDENTIFICAÇÃO
                    ========================================== */}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-semibold text-[#AF1B1B]">
                          {request.request_number ??
                            "Sem número"}
                        </span>

                        <PurchaseStatus
                          status={
                            request.status
                          }
                        />
                      </div>

                      <h3 className="mt-2 truncate text-sm font-semibold text-slate-900">
                        {
                          request.title
                        }
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                        <span>
                          Prioridade:{" "}
                          {priorityLabel(
                            request.priority
                          )}
                        </span>

                        <span>
                          Necessário em:{" "}
                          {formatDate(
                            request.required_date
                          )}
                        </span>
                      </div>
                    </div>

                    {/* =========================================
                        VALOR
                    ========================================== */}

                    <div className="flex items-center justify-between gap-6 xl:justify-end">
                      <div className="text-left xl:text-right">
                        <p className="text-[10px] uppercase tracking-wide text-slate-400">
                          Valor
                          estimado
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatCurrency(
                            request.estimated_total
                          )}
                        </p>
                      </div>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition group-hover:bg-white group-hover:text-[#AF1B1B]">
                        <ArrowRight
                          size={18}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-2xl font-semibold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {label}
      </p>
    </div>
  );
}