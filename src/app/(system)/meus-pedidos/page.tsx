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

import {
  MotionCard,
  MotionInteractive,
  MotionList,
  MotionListItem,
  MotionPage,
  MotionReveal,
  MotionStatus,
} from "@/components/ui/motion";

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
    <MotionPage className="mx-auto max-w-[1500px]">
      {/* CABEÇALHO */}

      <MotionReveal>
        <div className="mb-7">
          <p className="text-sm font-semibold text-primary">
            Compras
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-base-content">
            Meus Pedidos
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-base-content/55">
            Acompanhe suas solicitações de compra realizadas no Sienge.
          </p>
        </div>
      </MotionReveal>

      {/* INDICADORES */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MotionCard
          delay={0.05}
        >
          <SummaryCard
            icon={
              ShoppingBag
            }
            label="Minhas solicitações"
            value={
              total
            }
          />
        </MotionCard>

        <MotionCard
          delay={0.1}
        >
          <SummaryCard
            icon={
              Clock3
            }
            label="Em andamento"
            value={
              inProgress
            }
          />
        </MotionCard>

        <MotionCard
          delay={0.15}
        >
          <SummaryCard
            icon={
              Truck
            }
            label="Compra / Entrega"
            value={
              waitingDelivery
            }
          />
        </MotionCard>

        <MotionCard
          delay={0.2}
        >
          <SummaryCard
            icon={
              CheckCircle2
            }
            label="Entregues"
            value={
              completed
            }
          />
        </MotionCard>
      </div>

      {/* FILTROS */}

      <MotionReveal
        delay={0.12}
      >
        <section className="card mb-6 border border-base-300 bg-base-100">
          <div className="card-body p-5">
            <form
              method="get"
              className="grid gap-3 lg:grid-cols-[1fr_260px_auto]"
            >
              <label className="input input-bordered flex items-center gap-2">
                <Search
                  size={17}
                  className="opacity-40"
                />

                <input
                  name="q"
                  defaultValue={
                    search
                  }
                  placeholder="Buscar por SC ou centro de custo..."
                  className="grow"
                />
              </label>

              <select
                name="status"
                defaultValue={
                  status
                }
                className="select select-bordered w-full"
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
                className="btn btn-neutral"
              >
                Filtrar
              </button>
            </form>
          </div>
        </section>
      </MotionReveal>

      {/* LISTA */}

      <MotionReveal
        delay={0.18}
      >
        <section className="card overflow-hidden border border-base-300 bg-base-100">
          <div className="border-b border-base-300 px-6 py-5">
            <h2 className="font-semibold text-base-content">
              Solicitações
            </h2>

            <p className="mt-1 text-xs opacity-50">
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
              <div className="flex h-14 w-14 items-center justify-center rounded-box bg-base-200">
                <PackageSearch
                  size={25}
                  className="opacity-40"
                />
              </div>

              <p className="mt-4 text-sm font-semibold">
                Nenhuma solicitação encontrada
              </p>

              <p className="mt-2 max-w-md text-xs opacity-50">
                Quando suas solicitações forem importadas, elas aparecerão aqui.
              </p>
            </div>
          ) : (
            <MotionList className="divide-y divide-base-300">
              {requests.map(
                (
                  request
                ) => (
                  <MotionListItem
                    key={
                      request.request_key
                    }
                  >
                    <MotionInteractive>
                      <Link
                        href={`/meus-pedidos/${request.request_key}`}
                        className="group block px-6 py-5 transition-colors hover:bg-base-200/60"
                      >
                        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-primary">
                                SC{" "}
                                {
                                  request.sc_number
                                }
                              </p>

                              <MotionStatus>
                                <TrackingStatus
                                  status={
                                    request.tracking_status
                                  }
                                />
                              </MotionStatus>
                            </div>

                            <p className="mt-2 line-clamp-2 text-sm font-semibold">
                              {request.cost_center_or_site ??
                                "Centro de custo não informado"}
                            </p>

                            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs opacity-55">
                              <span className="inline-flex items-center gap-1.5">
                                <CalendarDays
                                  size={14}
                                />

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
                                    : "s"}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide opacity-40">
                                Próxima previsão
                              </p>

                              <p className="mt-1 text-sm font-semibold">
                                {formatDate(
                                  request.next_delivery_forecast
                                )}
                              </p>
                            </div>

                            <ArrowRight
                              size={19}
                              className="opacity-25 transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary group-hover:opacity-100"
                            />
                          </div>
                        </div>
                      </Link>
                    </MotionInteractive>
                  </MotionListItem>
                )
              )}
            </MotionList>
          )}
        </section>
      </MotionReveal>
    </MotionPage>
  );
}

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
    <div className="card h-full border border-base-300 bg-base-100">
      <div className="card-body p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-box bg-base-200">
          <Icon
            size={19}
            className="opacity-55"
          />
        </div>

        <p className="mt-2 text-2xl font-semibold">
          {value}
        </p>

        <p className="text-xs opacity-50">
          {label}
        </p>
      </div>
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
        "badge badge-sm",
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
      return "badge-success";

    case "Disponível para retirada":
    case "Em processo de entrega":
      return "badge-info";

    case "Compra realizada":
    case "Compra via cartão":
      return "badge-secondary";

    case "Em aprovação":
      return "badge-warning";

    case "Em cotação":
      return "badge-warning badge-outline";

    default:
      return "badge-ghost";
  }
}