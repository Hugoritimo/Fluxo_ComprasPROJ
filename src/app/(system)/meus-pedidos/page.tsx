import Link from "next/link";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  PackageSearch,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

const trackingStatuses = [
  "",
  "Solicitação recebida",
  "Em cotação",
  "Em aprovação",
  "Compra realizada",
  "Compra via cartão",
  "Disponível para retirada",
  "Em processo de entrega",
  "Entregue",
];

function formatDate(
  value:
    | string
    | null
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

export default async function MyOrdersPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

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
    redirect(
      "/login"
    );
  }

  const search =
    params.q?.trim() ??
    "";

  const status =
    params.status?.trim() ??
    "";

  // =========================================================
  // CONSULTA
  //
  // A view usa security_invoker.
  // A RLS da sienge_purchase_items garante que o usuário
  // enxergue somente os próprios registros.
  // =========================================================

  let query =
    supabase
      .from(
        "v_sienge_request_summary"
      )
      .select("*")
      .order(
        "request_date",
        {
          ascending:
            false,
          nullsFirst:
            false,
        }
      );

  if (status) {
    query =
      query.eq(
        "tracking_status",
        status
      );
  }

  if (search) {
    const safeSearch =
      search
        .replace(
          /,/g,
          " "
        )
        .replace(
          /\(/g,
          " "
        )
        .replace(
          /\)/g,
          " "
        );

    query =
      query.or(
        [
          `sc_number.ilike.%${safeSearch}%`,
          `cost_center_or_site.ilike.%${safeSearch}%`,
        ].join(",")
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    console.error(
      "Erro ao carregar Meus Pedidos:",
      error
    );
  }

  const requests =
    data ?? [];

  // =========================================================
  // INDICADORES
  // =========================================================

  const total =
    requests.length;

  const completed =
    requests.filter(
      (item) =>
        item.tracking_status ===
        "Entregue"
    ).length;

  const waitingDelivery =
    requests.filter(
      (item) =>
        [
          "Compra realizada",
          "Compra via cartão",
          "Disponível para retirada",
          "Em processo de entrega",
        ].includes(
          item.tracking_status
        )
    ).length;

  const inProgress =
    requests.filter(
      (item) =>
        ![
          "Entregue",
          "Compra realizada",
          "Compra via cartão",
          "Disponível para retirada",
          "Em processo de entrega",
        ].includes(
          item.tracking_status
        )
    ).length;

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="mb-7">
        <p className="text-sm font-semibold text-[#AF1B1B]">
          Compras
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Meus Pedidos
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Acompanhe suas solicitações de compra realizadas no Sienge, desde a solicitação até a entrega.
        </p>
      </div>

      {/* =====================================================
          INDICADORES
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={
            ShoppingBag
          }
          label="Minhas solicitações"
          value={
            total
          }
        />

        <SummaryCard
          icon={
            Clock3
          }
          label="Em andamento"
          value={
            inProgress
          }
        />

        <SummaryCard
          icon={
            Truck
          }
          label="Compra / Entrega"
          value={
            waitingDelivery
          }
        />

        <SummaryCard
          icon={
            CheckCircle2
          }
          label="Entregues"
          value={
            completed
          }
        />
      </div>

      {/* =====================================================
          FILTROS
      ====================================================== */}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              defaultValue={
                search
              }
              placeholder="Buscar por SC ou centro de custo..."
              className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
            />
          </div>

          <select
            name="status"
            defaultValue={
              status
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#AF1B1B]"
          >
            {trackingStatuses.map(
              (
                option
              ) => (
                <option
                  key={
                    option
                  }
                  value={
                    option
                  }
                >
                  {option ||
                    "Todos os status"}
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
      </section>

      {/* =====================================================
          LISTA
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-semibold text-slate-950">
            Solicitações
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            {requests.length} solicitação
            {requests.length ===
            1
              ? ""
              : "ões"}{" "}
            encontrada
            {requests.length ===
            1
              ? ""
              : "s"}.
          </p>
        </div>

        {requests.length ===
        0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <PackageSearch
                size={25}
                className="text-slate-400"
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-800">
              Nenhuma solicitação encontrada
            </p>

            <p className="mt-2 max-w-md text-xs leading-5 text-slate-500">
              Quando suas solicitações do Sienge forem importadas e vinculadas ao seu usuário, elas aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {requests.map(
              (
                request
              ) => (
                <Link
                  key={
                    request.request_key
                  }
                  href={`/meus-pedidos/${request.request_key}`}
                  className="group block px-6 py-5 transition hover:bg-slate-50/70"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                    {/* PRINCIPAL */}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-[#AF1B1B]">
                          SC{" "}
                          {
                            request.sc_number
                          }
                        </p>

                        <TrackingStatus
                          status={
                            request.tracking_status
                          }
                        />
                      </div>

                      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">
                        {request.cost_center_or_site ??
                          "Centro de custo não informado"}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <CalendarDays
                            size={14}
                          />

                          Solicitado em{" "}
                          {formatDate(
                            request.request_date
                          )}
                        </span>

                        <span>
                          {
                            request.items_count
                          }{" "}
                          item
                          {request.items_count ===
                          1
                            ? ""
                            : "s"}
                        </span>

                        {request.orders_count >
                          0 && (
                          <span>
                            {
                              request.orders_count
                            }{" "}
                            pedido
                            {request.orders_count ===
                            1
                              ? ""
                              : "s"}{" "}
                            gerado
                            {request.orders_count ===
                            1
                              ? ""
                              : "s"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* PREVISÃO */}

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[180px_40px] xl:items-center">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Próxima previsão
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          {formatDate(
                            request.next_delivery_forecast
                          )}
                        </p>
                      </div>

                      <div className="hidden justify-end xl:flex">
                        <ArrowRight
                          size={19}
                          className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#AF1B1B]"
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
// COMPONENTES
// ============================================================

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon:
    typeof ShoppingBag;

  label: string;

  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
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

function TrackingStatus({
  status,
}: {
  status: string;
}) {
  const styles =
    getStatusStyles(
      status
    );

  return (
    <span
      className={[
        "rounded-full border px-2.5 py-1 text-[10px] font-semibold",
        styles,
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function getStatusStyles(
  status: string
) {
  switch (
    status
  ) {
    case "Entregue":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Disponível para retirada":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "Em processo de entrega":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "Compra realizada":
    case "Compra via cartão":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "Em aprovação":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "Em cotação":
      return "border-orange-200 bg-orange-50 text-orange-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}