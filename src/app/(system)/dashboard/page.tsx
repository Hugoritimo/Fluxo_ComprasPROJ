import Link from "next/link";
import { redirect } from "next/navigation";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Plus,
  RotateCcw,
} from "lucide-react";

import CardRequestStatus from "@/components/cards/card-request-status";

import { createClient } from "@/lib/supabase/server";

function formatCurrency(
  value:
    | number
    | string
    | null
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(Number(value ?? 0));
}

export default async function DashboardPage() {
  const supabase =
    await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const {
    data: requests,
  } = await supabase
    .from("card_requests")
    .select(
      `
      id,
      request_number,
      sienge_request_number,
      purpose,
      estimated_amount,
      status,
      created_at
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
    .order(
      "created_at",
      {
        ascending: false,
      }
    );

  const data =
    requests ?? [];

  const openCount =
    data.filter(
      (item) =>
        ![
          "completed",
          "cancelled",
          "rejected",
        ].includes(
          item.status
        )
    ).length;

  const returnCount =
    data.filter(
      (item) =>
        [
          "in_use",
          "awaiting_return",
        ].includes(
          item.status
        )
    ).length;

  const reviewCount =
    data.filter(
      (item) =>
        [
          "returned",
          "accountability_review",
        ].includes(
          item.status
        )
    ).length;

  const completedCount =
    data.filter(
      (item) =>
        item.status ===
        "completed"
    ).length;

  const recent =
    data.slice(0, 5);

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#AF1B1B]">
            Visão geral
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Dashboard
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Acompanhe suas
            solicitações de cartão de
            crédito.
          </p>
        </div>

        <Link
          href="/solicitacoes/nova"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white transition hover:bg-[#921717]"
        >
          <Plus size={18} />
          Nova Solicitação
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={CreditCard}
          label="Em andamento"
          value={openCount}
        />

        <MetricCard
          icon={RotateCcw}
          label="Aguardando devolução"
          value={returnCount}
          attention={
            returnCount > 0
          }
        />

        <MetricCard
          icon={Clock3}
          label="Em conferência"
          value={reviewCount}
        />

        <MetricCard
          icon={CheckCircle2}
          label="Concluídas"
          value={completedCount}
        />
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="font-semibold text-slate-950">
              Minhas solicitações
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Últimas movimentações
            </p>
          </div>

          <Link
            href="/solicitacoes"
            className="text-xs font-semibold text-[#AF1B1B]"
          >
            Ver todas
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
            <CreditCard
              size={28}
              className="text-slate-300"
            />

            <p className="mt-4 text-sm font-semibold text-slate-700">
              Nenhuma solicitação
              registrada
            </p>

            <Link
              href="/solicitacoes/nova"
              className="mt-4 text-sm font-semibold text-[#AF1B1B]"
            >
              Criar primeira
              solicitação
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recent.map(
              (request) => (
                <Link
                  key={
                    request.id
                  }
                  href={`/solicitacoes/${request.id}`}
                  className="group flex flex-col gap-4 px-6 py-5 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                >
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

                    <p className="mt-2 truncate text-sm font-semibold text-slate-800">
                      {
                        request.purpose
                      }
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Pedido Sienge:{" "}
                      {
                        request.sienge_request_number
                      }
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-5">
                    <p className="text-sm font-semibold text-slate-800">
                      {formatCurrency(
                        request.estimated_amount
                      )}
                    </p>

                    <ArrowRight
                      size={18}
                      className="text-slate-400 transition group-hover:text-[#AF1B1B]"
                    />
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

function MetricCard({
  icon: Icon,
  label,
  value,
  attention = false,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  attention?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={[
          "flex h-11 w-11 items-center justify-center rounded-xl",
          attention
            ? "bg-red-50 text-red-600"
            : "bg-slate-100 text-slate-500",
        ].join(" ")}
      >
        <Icon size={20} />
      </div>

      <p className="mt-5 text-3xl font-semibold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-sm font-medium text-slate-700">
        {label}
      </p>
    </div>
  );
}