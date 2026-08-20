import type {
  ElementType,
} from "react";

import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  LoaderCircle,
  PackageSearch,
  RefreshCw,
  Search,
  UserRoundX,
  UsersRound,
} from "lucide-react";

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

import SiengeImportForm from "./sienge-import-form";

import SiengeUserMappingForm from "./sienge-user-mapping-form";

// ============================================================
// TIPOS
// ============================================================

type PageProps = {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    status?: string;
  }>;
};

type SiengeUserRow = {
  requester_sienge_username:
    | string
    | null;

  requester_profile_id:
    | string
    | null;
};

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
};

// ============================================================
// STATUS
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
// FORMATAÇÕES
// ============================================================

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

function formatDateTime(
  value:
    | string
    | null
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle:
        "short",

      timeStyle:
        "short",
    }
  ).format(
    new Date(value)
  );
}

// ============================================================
// PÁGINA
// ============================================================

export default async function SiengeTrackingPage({
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

  // =========================================================
  // PERMISSÕES
  // =========================================================

  const {
    data: roleRows,
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

  const roles =
    (
      roleRows ??
      []
    ).map(
      (item) =>
        item.role
    );

  const canAccess =
    roles.includes(
      "finance"
    ) ||
    roles.includes(
      "admin"
    ) ||
    roles.includes(
      "superadmin"
    );

  if (!canAccess) {
    redirect(
      "/dashboard"
    );
  }

  // =========================================================
  // ABAS
  // =========================================================

  const allowedTabs = [
    "pedidos",
    "importacoes",
    "usuarios",
  ];

  const tab =
    allowedTabs.includes(
      params.tab ??
        ""
    )
      ? params.tab!
      : "pedidos";

  const search =
    params.q?.trim() ??
    "";

  const status =
    params.status?.trim() ??
    "";

  // =========================================================
  // HISTÓRICO DE IMPORTAÇÕES
  // =========================================================

  const {
    data: batches,
    error: batchesError,
  } =
    await supabase
      .from(
        "sienge_import_batches"
      )
      .select(
        `
        id,
        file_name,
        source_sheet,
        status,
        total_rows,
        inserted_rows,
        updated_rows,
        unchanged_rows,
        unmatched_users,
        error_rows,
        created_at,
        completed_at
        `
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        20
      );

  if (batchesError) {
    console.error(
      "Erro ao carregar importações:",
      batchesError
    );
  }

  const history =
    batches ??
    [];

  const lastImport =
    history.find(
      (item) =>
        item.status ===
        "completed"
    );

  // =========================================================
  // PEDIDOS IMPORTADOS
  // =========================================================

  let requestsQuery =
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
    requestsQuery =
      requestsQuery.eq(
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

    requestsQuery =
      requestsQuery.or(
        [
          `sc_number.ilike.%${safeSearch}%`,
          `requester_sienge_username.ilike.%${safeSearch}%`,
          `cost_center_or_site.ilike.%${safeSearch}%`,
        ].join(",")
      );
  }

  const {
    data: requestsData,
    error: requestsError,
  } =
    await requestsQuery;

  if (requestsError) {
    console.error(
      "Erro ao carregar pedidos Sienge:",
      requestsError
    );
  }

  const requests =
    requestsData ??
    [];

  // =========================================================
  // USUÁRIOS DO SIENGE
  // =========================================================

  const {
    data: siengeRows,
    error: siengeUsersError,
  } =
    await supabase
      .from(
        "sienge_purchase_items"
      )
      .select(
        `
        requester_sienge_username,
        requester_profile_id
        `
      )
      .not(
        "requester_sienge_username",
        "is",
        null
      );

  if (siengeUsersError) {
    console.error(
      "Erro ao carregar usuários Sienge:",
      siengeUsersError
    );
  }

  const distinctSiengeUsers =
    Array.from(
      new Map(
        (
          (
            siengeRows ??
            []
          ) as SiengeUserRow[]
        )
          .filter(
            (row) =>
              Boolean(
                row.requester_sienge_username
              )
          )
          .map(
            (row) => [
              row
                .requester_sienge_username!
                .trim()
                .toUpperCase(),

              {
                username:
                  row
                    .requester_sienge_username!
                    .trim()
                    .toUpperCase(),

                profileId:
                  row.requester_profile_id,
              },
            ]
          )
      ).values()
    ).sort(
      (
        a,
        b
      ) =>
        a.username.localeCompare(
          b.username
        )
    );

  // =========================================================
  // USUÁRIOS DO SISTEMA
  // =========================================================

  const {
    data: profilesData,
    error: profilesError,
  } =
    await supabase
      .from(
        "profiles"
      )
      .select(
        `
        id,
        full_name,
        email
        `
      )
      .order(
        "full_name",
        {
          ascending:
            true,
        }
      );

  if (profilesError) {
    console.error(
      "Erro ao carregar usuários:",
      profilesError
    );
  }

  const profiles =
    (
      profilesData ??
      []
    ) as ProfileRow[];

  const profileMap =
    new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );

  const unmatchedUsers =
    distinctSiengeUsers.filter(
      (item) =>
        !item.profileId
    ).length;

  // =========================================================
  // PÁGINA
  // =========================================================

  return (
    <MotionPage className="mx-auto max-w-[1600px]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <MotionReveal>
        <div className="mb-7">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-box bg-primary/10 text-primary">
              <FileSpreadsheet
                size={17}
              />
            </span>

            <p className="text-sm font-semibold text-primary">
              Financeiro
            </p>
          </div>

          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-base-content">
            Acompanhamento Sienge
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-base-content/55">
            Consulte os pedidos importados, atualize os dados do Sienge e vincule os solicitantes aos usuários do sistema.
          </p>
        </div>
      </MotionReveal>

      {/* =====================================================
          INDICADORES
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MotionCard
          delay={0.05}
        >
          <SummaryCard
            icon={
              PackageSearch
            }
            label="Solicitações"
            value={
              requests.length
            }
          />
        </MotionCard>

        <MotionCard
          delay={0.1}
        >
          <SummaryCard
            icon={
              FileSpreadsheet
            }
            label="Linhas da última importação"
            value={
              lastImport?.total_rows ??
              0
            }
          />
        </MotionCard>

        <MotionCard
          delay={0.15}
        >
          <SummaryCard
            icon={
              RefreshCw
            }
            label="Atualizados"
            value={
              lastImport?.updated_rows ??
              0
            }
          />
        </MotionCard>

        <MotionCard
          delay={0.2}
        >
          <SummaryCard
            icon={
              UserRoundX
            }
            label="Usuários não vinculados"
            value={
              unmatchedUsers
            }
            attention={
              unmatchedUsers >
              0
            }
          />
        </MotionCard>
      </div>

      {/* =====================================================
          ABAS
      ====================================================== */}

      <MotionReveal
        delay={0.12}
      >
        <div className="card mb-6 border border-base-300 bg-base-100">
          <div className="flex flex-wrap gap-2 p-2">
            <TabLink
              href="/financeiro/sienge?tab=pedidos"
              active={
                tab ===
                "pedidos"
              }
              icon={
                PackageSearch
              }
              label="Pedidos importados"
            />

            <TabLink
              href="/financeiro/sienge?tab=importacoes"
              active={
                tab ===
                "importacoes"
              }
              icon={
                FileSpreadsheet
              }
              label="Importações"
            />

            <TabLink
              href="/financeiro/sienge?tab=usuarios"
              active={
                tab ===
                "usuarios"
              }
              icon={
                UsersRound
              }
              label="Usuários Sienge"
              badge={
                unmatchedUsers
              }
            />
          </div>
        </div>
      </MotionReveal>

      {/* =====================================================
          PEDIDOS
      ====================================================== */}

      {tab ===
        "pedidos" && (
        <MotionReveal
          delay={0.08}
        >
          <section className="card overflow-hidden border border-base-300 bg-base-100">
            {/* ===============================================
                FILTROS
            ================================================ */}

            <div className="border-b border-base-300 p-5 sm:p-6">
              <form
                method="get"
                className="grid gap-3 lg:grid-cols-[1fr_260px_auto]"
              >
                <input
                  type="hidden"
                  name="tab"
                  value="pedidos"
                />

                <label className="input input-bordered flex w-full items-center gap-2">
                  <Search
                    size={17}
                    className="shrink-0 text-base-content/35"
                  />

                  <input
                    name="q"
                    defaultValue={
                      search
                    }
                    placeholder="Buscar por SC, solicitante ou centro de custo..."
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
                  <Search
                    size={16}
                  />

                  Filtrar
                </button>
              </form>
            </div>

            {/* ===============================================
                CONTAGEM
            ================================================ */}

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-6 py-4">
              <div>
                <p className="text-sm font-semibold text-base-content">
                  Pedidos importados
                </p>

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
                    : "s"}
                  .
                </p>
              </div>

              {(search ||
                status) && (
                <Link
                  href="/financeiro/sienge?tab=pedidos"
                  className="btn btn-ghost btn-sm"
                >
                  Limpar filtros
                </Link>
              )}
            </div>

            {/* ===============================================
                LISTA
            ================================================ */}

            {requests.length ===
            0 ? (
              <MotionReveal>
                <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-box bg-base-200 text-base-content/30">
                    <PackageSearch
                      size={27}
                    />
                  </div>

                  <p className="mt-4 text-sm font-semibold text-base-content">
                    Nenhum pedido encontrado
                  </p>

                  <p className="mt-2 max-w-md text-xs text-base-content/45">
                    Não encontramos solicitações com os filtros selecionados.
                  </p>
                </div>
              </MotionReveal>
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
                          href={`/financeiro/sienge/${request.request_key}`}
                          className="group grid gap-4 px-6 py-5 transition-colors hover:bg-base-200/50 lg:grid-cols-[1.3fr_1fr_130px_130px_170px_auto]"
                        >
                          {/* SC */}

                          <div className="min-w-0">
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

                            <p className="mt-2 truncate text-sm font-semibold text-base-content">
                              {request.requester_sienge_username ??
                                "Solicitante não informado"}
                            </p>

                            <p className="mt-1 line-clamp-1 text-xs text-base-content/40">
                              {request.cost_center_or_site ??
                                "Centro de custo não informado"}
                            </p>
                          </div>

                          {/* DATA */}

                          <div>
                            <InfoLabel>
                              Solicitação
                            </InfoLabel>

                            <p className="mt-1 text-xs font-medium text-base-content/70">
                              {formatDate(
                                request.request_date
                              )}
                            </p>
                          </div>

                          {/* ITENS */}

                          <Metric
                            label="Itens"
                            value={
                              request.items_count
                            }
                          />

                          {/* PEDIDOS */}

                          <Metric
                            label="Pedidos"
                            value={
                              request.orders_count
                            }
                          />

                          {/* PREVISÃO */}

                          <div>
                            <InfoLabel>
                              Próxima previsão
                            </InfoLabel>

                            <p className="mt-1 text-xs font-medium text-base-content/70">
                              {formatDate(
                                request.next_delivery_forecast
                              )}
                            </p>
                          </div>

                          {/* SETA */}

                          <div className="flex items-center justify-end">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full text-base-content/25 transition-all duration-200 group-hover:bg-primary/10 group-hover:text-primary">
                              <ArrowRight
                                size={18}
                                className="transition-transform duration-200 group-hover:translate-x-1"
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
      )}

      {/* =====================================================
          IMPORTAÇÕES
      ====================================================== */}

      {tab ===
        "importacoes" && (
        <MotionReveal
          delay={0.08}
        >
          <div className="space-y-6">
            {/* ===============================================
                IMPORTAÇÃO
            ================================================ */}

            <MotionCard>
              <section className="card border border-base-300 bg-base-100">
                <div className="card-body p-5 sm:p-6">
                  <div className="mb-2 flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-box bg-primary/10 text-primary">
                      <FileSpreadsheet
                        size={19}
                      />
                    </div>

                    <div>
                      <h2 className="font-semibold text-base-content">
                        Importar arquivo
                      </h2>

                      <p className="mt-1 text-xs leading-5 text-base-content/50">
                        O sistema analisa o Excel antes de gravar qualquer alteração.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <SiengeImportForm />
                  </div>
                </div>
              </section>
            </MotionCard>

            {/* ===============================================
                HISTÓRICO
            ================================================ */}

            <MotionReveal
              delay={0.1}
            >
              <section className="card overflow-hidden border border-base-300 bg-base-100">
                <div className="border-b border-base-300 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-box bg-base-200 text-base-content/45">
                      <Clock3
                        size={17}
                      />
                    </div>

                    <div>
                      <h2 className="font-semibold text-base-content">
                        Histórico de importações
                      </h2>

                      <p className="mt-1 text-xs text-base-content/45">
                        Últimas 20 importações realizadas.
                      </p>
                    </div>
                  </div>
                </div>

                {history.length ===
                0 ? (
                  <div className="flex min-h-52 flex-col items-center justify-center p-8 text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-box bg-base-200 text-base-content/30">
                      <Clock3
                        size={23}
                      />
                    </div>

                    <p className="mt-3 text-sm font-semibold text-base-content">
                      Nenhuma importação realizada
                    </p>
                  </div>
                ) : (
                  <MotionList className="divide-y divide-base-300">
                    {history.map(
                      (
                        batch
                      ) => (
                        <MotionListItem
                          key={
                            batch.id
                          }
                        >
                          <div className="grid gap-4 px-6 py-5 transition-colors hover:bg-base-200/40 md:grid-cols-[1.5fr_110px_110px_120px_140px]">
                            {/* ARQUIVO */}

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-base-content">
                                  {
                                    batch.file_name
                                  }
                                </p>

                                <MotionStatus>
                                  <ImportStatus
                                    status={
                                      batch.status
                                    }
                                  />
                                </MotionStatus>
                              </div>

                              <p className="mt-1 text-xs text-base-content/40">
                                Aba:{" "}
                                {batch.source_sheet ??
                                  "-"}{" "}
                                ·{" "}
                                {formatDateTime(
                                  batch.created_at
                                )}
                              </p>
                            </div>

                            <Metric
                              label="Novos"
                              value={
                                batch.inserted_rows
                              }
                            />

                            <Metric
                              label="Atualizados"
                              value={
                                batch.updated_rows
                              }
                            />

                            <Metric
                              label="Sem alteração"
                              value={
                                batch.unchanged_rows
                              }
                            />

                            <Metric
                              label="Não vinculados"
                              value={
                                batch.unmatched_users
                              }
                              attention={
                                batch.unmatched_users >
                                0
                              }
                            />
                          </div>
                        </MotionListItem>
                      )
                    )}
                  </MotionList>
                )}
              </section>
            </MotionReveal>
          </div>
        </MotionReveal>
      )}

      {/* =====================================================
          USUÁRIOS
      ====================================================== */}

      {tab ===
        "usuarios" && (
        <MotionReveal
          delay={0.08}
        >
          <section className="card overflow-hidden border border-base-300 bg-base-100">
            {/* ===============================================
                CABEÇALHO
            ================================================ */}

            <div className="border-b border-base-300 px-6 py-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-box bg-primary/10 text-primary">
                    <UsersRound
                      size={19}
                    />
                  </div>

                  <div>
                    <h2 className="font-semibold text-base-content">
                      Usuários do Sienge
                    </h2>

                    <p className="mt-1 text-xs leading-5 text-base-content/50">
                      Vincule o identificador do Sienge ao usuário correspondente no Projeta Compras.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-ghost">
                    {
                      distinctSiengeUsers.length
                    }{" "}
                    usuários
                  </span>

                  {unmatchedUsers >
                    0 && (
                    <span className="badge badge-warning">
                      {
                        unmatchedUsers
                      }{" "}
                      pendente
                      {unmatchedUsers ===
                      1
                        ? ""
                        : "s"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ===============================================
                LISTA
            ================================================ */}

            {distinctSiengeUsers.length ===
            0 ? (
              <div className="flex min-h-60 flex-col items-center justify-center p-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-box bg-base-200 text-base-content/30">
                  <UsersRound
                    size={23}
                  />
                </div>

                <p className="mt-3 text-sm font-semibold text-base-content">
                  Nenhum usuário encontrado
                </p>
              </div>
            ) : (
              <MotionList className="divide-y divide-base-300">
                {distinctSiengeUsers.map(
                  (
                    item
                  ) => {
                    const currentProfile =
                      item.profileId
                        ? profileMap.get(
                            item.profileId
                          )
                        : null;

                    return (
                      <MotionListItem
                        key={
                          item.username
                        }
                      >
                        <div className="grid gap-5 px-6 py-5 transition-colors hover:bg-base-200/40 lg:grid-cols-[300px_1fr]">
                          {/* USUÁRIO SIENGE */}

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-bold text-base-content">
                                {
                                  item.username
                                }
                              </p>

                              <MotionStatus>
                                {currentProfile ? (
                                  <span className="badge badge-success badge-sm">
                                    <CheckCircle2
                                      size={11}
                                    />

                                    Vinculado
                                  </span>
                                ) : (
                                  <span className="badge badge-warning badge-sm">
                                    <AlertTriangle
                                      size={11}
                                    />

                                    Não vinculado
                                  </span>
                                )}
                              </MotionStatus>
                            </div>

                            {currentProfile ? (
                              <div className="mt-2">
                                <p className="text-xs font-medium text-base-content/65">
                                  {
                                    currentProfile.full_name
                                  }
                                </p>

                                <p className="mt-0.5 text-xs text-base-content/40">
                                  {
                                    currentProfile.email
                                  }
                                </p>
                              </div>
                            ) : (
                              <p className="mt-2 text-xs text-warning">
                                Selecione o usuário correspondente no sistema.
                              </p>
                            )}
                          </div>

                          {/* FORMULÁRIO */}

                          <div className="flex items-center">
                            <div className="w-full">
                              <SiengeUserMappingForm
                                siengeUsername={
                                  item.username
                                }
                                currentProfileId={
                                  item.profileId
                                }
                                profiles={
                                  profiles
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </MotionListItem>
                    );
                  }
                )}
              </MotionList>
            )}
          </section>
        </MotionReveal>
      )}
    </MotionPage>
  );
}

// ============================================================
// ABA
// ============================================================

function TabLink({
  href,
  active,
  icon: Icon,
  label,
  badge,
}: {
  href: string;
  active: boolean;
  icon: ElementType;
  label: string;
  badge?: number;
}) {
  return (
    <MotionInteractive>
      <Link
        href={
          href
        }
        className={[
          "btn btn-sm gap-2 border-transparent",
          active
            ? "btn-primary"
            : "btn-ghost text-base-content/55",
        ].join(" ")}
      >
        <Icon
          size={16}
        />

        {label}

        {Boolean(
          badge
        ) && (
          <span
            className={[
              "badge badge-sm",
              active
                ? "border-primary-content/20 bg-primary-content/15 text-primary-content"
                : "badge-warning",
            ].join(" ")}
          >
            {badge}
          </span>
        )}
      </Link>
    </MotionInteractive>
  );
}

// ============================================================
// CARD DE RESUMO
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
    <div className="card interactive-card h-full border border-base-300 bg-base-100">
      <div className="card-body p-5">
        <div
          className={[
            "flex h-10 w-10 items-center justify-center rounded-box",
            attention
              ? "bg-warning/10 text-warning"
              : "bg-base-200 text-base-content/50",
          ].join(" ")}
        >
          <Icon
            size={19}
          />
        </div>

        <p
          className={[
            "mt-2 text-2xl font-semibold",
            attention
              ? "text-warning"
              : "text-base-content",
          ].join(" ")}
        >
          {value}
        </p>

        <p className="text-xs text-base-content/50">
          {label}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// LABEL
// ============================================================

function InfoLabel({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">
      {children}
    </p>
  );
}

// ============================================================
// MÉTRICA
// ============================================================

function Metric({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: number;
  attention?: boolean;
}) {
  return (
    <div>
      <InfoLabel>
        {label}
      </InfoLabel>

      <p
        className={[
          "mt-1 text-sm font-semibold",
          attention
            ? "text-warning"
            : "text-base-content/80",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================
// STATUS DO PEDIDO
// ============================================================

function TrackingStatus({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={[
        "badge badge-sm",
        getTrackingStatusStyle(
          status
        ),
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function getTrackingStatusStyle(
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

    case "Solicitação recebida":
      return "badge-ghost";

    default:
      return "badge-ghost";
  }
}

// ============================================================
// STATUS DA IMPORTAÇÃO
// ============================================================

function ImportStatus({
  status,
}: {
  status: string;
}) {
  if (
    status ===
    "completed"
  ) {
    return (
      <span className="badge badge-success badge-sm gap-1">
        <CheckCircle2
          size={11}
        />

        Concluído
      </span>
    );
  }

  if (
    status ===
    "failed"
  ) {
    return (
      <span className="badge badge-error badge-sm gap-1">
        <AlertTriangle
          size={11}
        />

        Falhou
      </span>
    );
  }

  if (
    status ===
    "cancelled"
  ) {
    return (
      <span className="badge badge-ghost badge-sm">
        Cancelado
      </span>
    );
  }

  return (
    <span className="badge badge-warning badge-sm gap-1">
      <LoaderCircle
        size={11}
        className="animate-spin"
      />

      Processando
    </span>
  );
}