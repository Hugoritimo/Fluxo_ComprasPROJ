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
  TriangleAlert,
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

export default async function ReturnsPage() {
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
  // SOLICITAÇÕES DO USUÁRIO QUE PARTICIPAM DA DEVOLUÇÃO
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
      sienge_request_number,
      cost_center_or_site,
      suppliers_text,

      estimated_amount,
      approved_amount,

      status,
      expected_return_date,
      returned_at,

      created_at,
      updated_at
      `
    )
    .eq(
      "requester_id",
      userId
    )
    .is(
      "deleted_at",
      null
    )
    .in(
      "status",
      [
        "card_delivered",
        "in_use",
        "awaiting_return",
        "returned",
        "accountability_review",
        "completed"
      ]
    )
    .order(
      "updated_at",
      {
        ascending: false,
      }
    );

  if (error) {
    console.error(
      "Erro ao carregar devoluções:",
      error
    );
  }

  const data =
    requests ?? [];

  // =========================================================
  // INDICADORES
  // =========================================================

  const pendingCount =
    data.filter(
      (item) =>
        [
          "card_delivered",
          "in_use",
          "awaiting_return",
        ].includes(
          item.status
        )
    ).length;

  const returnedCount =
    data.filter(
      (item) =>
        item.status ===
        "returned"
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

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="mb-8">
        <p className="text-sm font-semibold text-[#AF1B1B]">
          Prestação de Contas
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Devoluções
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Registre a devolução dos cartões
          utilizados e acompanhe a análise
          da prestação de contas pelo
          Financeiro.
        </p>
      </div>

      {/* =====================================================
          INDICADORES
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={TriangleAlert}
          label="Aguardando devolução"
          value={pendingCount}
          attention={
            pendingCount > 0
          }
        />

        <SummaryCard
          icon={Receipt}
          label="Devolvidas"
          value={returnedCount}
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
      </div>

      {/* =====================================================
          CONTEÚDO PRINCIPAL
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* CABEÇALHO DA LISTAGEM */}

        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="font-semibold text-slate-950">
              Minhas devoluções
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Solicitações relacionadas à
              devolução e prestação de contas.
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
            <RotateCcw
              size={19}
            />
          </div>
        </div>

        {/* ===================================================
            SEM REGISTROS
        ==================================================== */}

        {data.length === 0 ? (
          <div className="flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <RotateCcw
                size={28}
              />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-800">
              Nenhuma devolução disponível
            </h2>

            <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
              Quando um cartão for liberado
              para uma de suas solicitações,
              a prestação de contas aparecerá
              automaticamente nesta tela.
            </p>

            <Link
              href="/solicitacoes"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#AF1B1B]"
            >
              Ver minhas solicitações

              <ArrowRight
                size={15}
              />
            </Link>
          </div>
        ) : (
          /* =================================================
             LISTA
          ================================================= */

          <div className="divide-y divide-slate-100">
            {data.map(
              (request) => {
                const canReturn =
                  [
                    "card_delivered",
                    "in_use",
                    "awaiting_return",
                  ].includes(
                    request.status
                  );

                return (
                  <div
                    key={request.id}
                    className="px-6 py-5"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                      {/* =====================================
                          IDENTIFICAÇÃO
                      ====================================== */}

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
                          {request.cost_center_or_site ??
                            "Centro de custo / Obra não informado"}
                        </h3>

                        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                          <span>
                            Pedido Sienge:{" "}
                            {request.sienge_request_number ??
                              "-"}
                          </span>

                          <span>
                            Fornecedor:{" "}
                            {request.suppliers_text ??
                              "-"}
                          </span>

                          {request.expected_return_date && (
                            <span>
                              Previsão de devolução:{" "}
                              {formatDate(
                                request.expected_return_date
                              )}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* =====================================
                          VALORES
                      ====================================== */}

                      <div className="grid min-w-[280px] grid-cols-2 gap-5">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Solicitado
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {formatCurrency(
                              request.estimated_amount
                            )}
                          </p>
                        </div>

                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            Aprovado
                          </p>

                          <p className="mt-1 text-sm font-semibold text-slate-800">
                            {request.approved_amount !==
                            null
                              ? formatCurrency(
                                  request.approved_amount
                                )
                              : "-"}
                          </p>
                        </div>
                      </div>

                      {/* =====================================
                          AÇÕES
                      ====================================== */}

                      <div className="xl:min-w-[220px]">
                        {canReturn ? (
                          <Link
                            href={`/solicitacoes/${request.id}/devolucao`}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-4 text-sm font-semibold text-white transition hover:bg-[#921717]"
                          >
                            <RotateCcw
                              size={17}
                            />

                            Registrar devolução
                          </Link>
                        ) : (
                          <Link
                            href={`/solicitacoes/${request.id}`}
                            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                          >
                            <FileCheck2
                              size={17}
                            />

                            Ver prestação

                            <ArrowRight
                              size={16}
                            />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* =====================================================
          ORIENTAÇÃO
      ====================================================== */}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex gap-3">
          <Receipt
            size={19}
            className="mt-0.5 shrink-0 text-[#AF1B1B]"
          />

          <div>
            <p className="text-sm font-semibold text-slate-800">
              Documentos necessários
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Para registrar uma devolução
              você deverá informar o valor
              efetivamente utilizado e anexar
              a Nota Fiscal ou Cupom Fiscal e
              o comprovante da transação do
              cartão.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SUMMARY CARD
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
        <Icon
          size={19}
        />
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