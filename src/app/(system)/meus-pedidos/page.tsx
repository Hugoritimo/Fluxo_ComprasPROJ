import {
  MotionCard,
  MotionPage,
  MotionReveal,
} from "@/components/ui/motion";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  PackageSearch,
  Search,
  ShoppingBag,
  Truck,
  UserRound,
} from "lucide-react";

import Link from "next/link";

import {
  redirect,
} from "next/navigation";

// ============================================================
// TIPOS
// ============================================================

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

type SiengeRequestRow = {
  request_key: string;

  sc_number:
    | string
    | null;

  requester_profile_id:
    | string
    | null;

  requester_sienge_username:
    | string
    | null;

  cost_center_or_site:
    | string
    | null;

  request_date:
    | string
    | null;

  items_count:
    | number
    | null;

  orders_count:
    | number
    | null;

  tracking_status:
    | string
    | null;

  next_delivery_forecast:
    | string
    | null;
};

// ============================================================
// STATUS DO SIENGE
// ============================================================

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

// ============================================================
// HELPERS
// ============================================================

function formatDate(
  value:
    | string
    | null
) {
  if (
    !value
  ) {
    return "-";
  }

  const iso =
    value.match(
      /^\d{4}-\d{2}-\d{2}/
    )?.[0];

  if (
    !iso
  ) {
    return "-";
  }

  const [
    year,
    month,
    day,
  ] =
    iso.split(
      "-"
    );

  return `${day}/${month}/${year}`;
}

function normalizeSearch(
  value:
    | string
    | null
    | undefined
) {
  return String(
    value ??
    ""
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .trim();
}

// ============================================================
// PAGE
// ============================================================

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
    data:
      claimsData,

    error:
      claimsError,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData
      ?.claims
      ?.sub;

  if (
    claimsError ||
    !userId
  ) {
    redirect(
      "/login"
    );
  }

  // =========================================================
  // ROLES
  // =========================================================

  const {
    data:
      rolesData,

    error:
      rolesError,
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

  if (
    rolesError
  ) {
    console.error(
      "Erro ao carregar roles em Meus Pedidos:",
      rolesError
    );
  }

  const roles =
    (
      rolesData ??
      []
    ).map(
      (
        row
      ) =>
        String(
          row.role
        )
    );

  // =========================================================
  // QUEM PODE VER TODOS OS PEDIDOS
  //
  // Finance:
  //   Ximenes / equipe responsável pela importação.
  //
  // Admin / Superadmin:
  //   acompanhamento administrativo.
  //
  // Usuário comum:
  //   somente os próprios pedidos.
  // =========================================================

  const canViewAll =
    roles.includes(
      "finance"
    ) ||
    roles.includes(
      "admin"
    ) ||
    roles.includes(
      "superadmin"
    );

  // =========================================================
  // FILTROS
  // =========================================================

  const search =
    (
      params.q ??
      ""
    ).trim();

  const selectedStatus =
    (
      params.status ??
      ""
    ).trim();

  // =========================================================
  // SOLICITAÇÕES IMPORTADAS DO SIENGE
  //
  // Esta é a origem oficial de "Meus Pedidos".
  // =========================================================

  let query =
    supabase
      .from(
        "v_sienge_request_summary"
      )
      .select(
        `
        request_key,
        sc_number,
        requester_profile_id,
        requester_sienge_username,
        cost_center_or_site,
        request_date,
        items_count,
        orders_count,
        tracking_status,
        next_delivery_forecast
        `
      )
      .order(
        "request_date",
        {
          ascending:
            false,

          nullsFirst:
            false,
        }
      );

  // =========================================================
  // SOLICITANTE COMUM
  //
  // Vê exclusivamente solicitações vinculadas ao perfil dele.
  // =========================================================

  if (
    !canViewAll
  ) {
    query =
      query.eq(
        "requester_profile_id",
        userId
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (
    error
  ) {
    console.error(
      "Erro ao carregar solicitações do Sienge:",
      error
    );
  }

  const allRequests =
    (
      data ??
      []
    ) as SiengeRequestRow[];

  // =========================================================
  // FILTRO EM MEMÓRIA
  //
  // Evita montar filtros .or() complexos no PostgREST.
  // =========================================================

  const normalizedSearch =
    normalizeSearch(
      search
    );

  const requests =
    allRequests.filter(
      (
        request
      ) => {
        if (
          selectedStatus &&
          request.tracking_status !==
            selectedStatus
        ) {
          return false;
        }

        if (
          !normalizedSearch
        ) {
          return true;
        }

        const searchable =
          normalizeSearch(
            [
              request.sc_number,
              request
                .requester_sienge_username,
              request
                .cost_center_or_site,
              request
                .tracking_status,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
          );

        return searchable.includes(
          normalizedSearch
        );
      }
    );

  // =========================================================
  // INDICADORES
  // =========================================================

  const total =
    requests.length;

  const completed =
    requests.filter(
      (
        request
      ) =>
        request.tracking_status ===
        "Entregue"
    ).length;

  const waitingDelivery =
    requests.filter(
      (
        request
      ) =>
        [
          "Compra realizada",
          "Compra via cartão",
          "Disponível para retirada",
          "Em processo de entrega",
        ].includes(
          request.tracking_status ??
            ""
        )
    ).length;

  const inProgress =
    requests.filter(
      (
        request
      ) =>
        ![
          "Entregue",
          "Compra realizada",
          "Compra via cartão",
          "Disponível para retirada",
          "Em processo de entrega",
        ].includes(
          request.tracking_status ??
            ""
        )
    ).length;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <MotionPage className="mx-auto max-w-[1500px]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <MotionReveal>
        <div className="mb-7">
          <p className="text-sm font-semibold text-primary">
            Compras
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-base-content">
            Meus Pedidos
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-base-content/55">
            {canViewAll
              ? "Acompanhe as solicitações importadas do Sienge e a evolução do processo de compra."
              : "Acompanhe suas solicitações de compra importadas do Sienge."}
          </p>
        </div>
      </MotionReveal>

      {/* =====================================================
          INDICADORES
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MotionCard
          delay={
            0.05
          }
        >
          <SummaryCard
            icon={
              ShoppingBag
            }
            label={
              canViewAll
                ? "Solicitações"
                : "Minhas solicitações"
            }
            value={
              total
            }
          />
        </MotionCard>

        <MotionCard
          delay={
            0.1
          }
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
          delay={
            0.15
          }
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
          delay={
            0.2
          }
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

      {/* =====================================================
          FILTROS
      ====================================================== */}

      <MotionReveal
        delay={
          0.12
        }
      >
        <section className="card mb-6 border border-base-300 bg-base-100">
          <div className="card-body p-5">
            <form
              method="get"
              className="grid gap-3 lg:grid-cols-[1fr_260px_auto]"
            >
              <label className="input input-bordered flex items-center gap-2">
                <Search
                  size={
                    17
                  }
                  className="opacity-40"
                />

                <input
                  name="q"
                  defaultValue={
                    search
                  }
                  placeholder={
                    canViewAll
                      ? "Buscar por SC, solicitante ou centro de custo..."
                      : "Buscar por SC ou centro de custo..."
                  }
                  className="grow"
                />
              </label>

              <select
                name="status"
                defaultValue={
                  selectedStatus
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

      {/* =====================================================
          LISTA

          Mantida sem MotionList/MotionListItem para os registros
          não ficarem presos invisíveis no viewport.
      ====================================================== */}

      <section className="overflow-hidden rounded-[22px] border border-base-300 bg-base-100 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-base-300 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-base-content">
              Solicitações
            </h2>

            <p className="mt-1 text-xs text-base-content/45">
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

          {requests.length >
            0 && (
            <span className="w-fit rounded-lg bg-base-200 px-3 py-1.5 text-[10px] font-semibold text-base-content/45">
              Importação Sienge
            </span>
          )}
        </div>

        {/* ===================================================
            VAZIO
        ==================================================== */}

        {requests.length ===
        0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-base-200">
              <PackageSearch
                size={
                  25
                }
                className="text-base-content/35"
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-base-content">
              Nenhuma solicitação encontrada
            </p>

            <p className="mt-2 max-w-md text-xs leading-5 text-base-content/45">
              {canViewAll
                ? "Nenhuma solicitação importada do Sienge corresponde aos filtros informados."
                : "Quando suas solicitações forem importadas do Sienge e vinculadas ao seu usuário, elas aparecerão aqui."}
            </p>
          </div>
        ) : (
          /* =================================================
              PEDIDOS
          ================================================== */

          <div className="divide-y divide-base-300">
            {requests.map(
              (
                request
              ) => {
                const status =
                  request.tracking_status ??
                  "Solicitação recebida";

                return (
                  <Link
                    key={
                      request.request_key
                    }
                    href={`/meus-pedidos/${encodeURIComponent(
                      request.request_key
                    )}`}
                    className="group block px-6 py-5 transition-colors duration-150 hover:bg-base-200/55"
                  >
                    <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                      {/* =====================================
                          PRINCIPAL
                      ====================================== */}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-primary">
                            SC{" "}
                            {
                              request.sc_number
                            }
                          </p>

                          <TrackingStatus
                            status={
                              status
                            }
                          />

                          {canViewAll &&
                            request
                              .requester_sienge_username && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-base-200 px-2 py-1 text-[9px] font-semibold text-base-content/50">
                              <UserRound
                                size={
                                  11
                                }
                              />

                              {
                                request
                                  .requester_sienge_username
                              }
                            </span>
                          )}
                        </div>

                        {/* ===================================
                            CENTRO / OBRA
                        ==================================== */}

                        <p className="mt-2 line-clamp-2 text-sm font-semibold text-base-content">
                          {request.cost_center_or_site ??
                            "Centro de custo / obra não informado"}
                        </p>

                        {/* ===================================
                            METADADOS
                        ==================================== */}

                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-base-content/50">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays
                              size={
                                14
                              }
                            />

                            {formatDate(
                              request.request_date
                            )}
                          </span>

                          <span>
                            {Number(
                              request.items_count ??
                                0
                            )}{" "}
                            item
                            {Number(
                              request.items_count ??
                                0
                            ) ===
                            1
                              ? ""
                              : "s"}
                          </span>

                          {Number(
                            request.orders_count ??
                              0
                          ) >
                            0 && (
                            <span>
                              {Number(
                                request.orders_count
                              )}{" "}
                              pedido
                              {Number(
                                request.orders_count
                              ) ===
                              1
                                ? ""
                                : "s"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* =====================================
                          PREVISÃO
                      ====================================== */}

                      <div className="flex shrink-0 items-center gap-7">
                        <div className="min-w-[145px]">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-base-content/35">
                            Próxima previsão
                          </p>

                          <p className="mt-1 text-sm font-semibold text-base-content">
                            {formatDate(
                              request.next_delivery_forecast
                            )}
                          </p>
                        </div>

                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-base-200 text-base-content/30 transition-all duration-200 group-hover:translate-x-1 group-hover:bg-primary/10 group-hover:text-primary">
                          <ArrowRight
                            size={
                              17
                            }
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
    </MotionPage>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  icon:
    Icon,
  label,
  value,
}: {
  icon:
    typeof ShoppingBag;

  label:
    string;

  value:
    number;
}) {
  return (
    <div className="card h-full border border-base-300 bg-base-100">
      <div className="card-body p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-box bg-base-200">
          <Icon
            size={
              19
            }
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

// ============================================================
// STATUS
// ============================================================

function TrackingStatus({
  status,
}: {
  status:
    string;
}) {
  return (
    <span
      className={[
        "badge badge-sm",
        getStatusStyle(
          status
        ),
      ].join(
        " "
      )}
    >
      {status}
    </span>
  );
}

function getStatusStyle(
  status:
    string
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