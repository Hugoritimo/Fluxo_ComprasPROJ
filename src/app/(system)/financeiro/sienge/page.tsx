import type {
  ElementType,
} from "react";

import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Link2,
  PackageSearch,
  RefreshCw,
  Search,
  UserRoundX,
  UsersRound,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import SiengeImportForm from "./sienge-import-form";

import SiengeUserMappingForm from "./sienge-user-mapping-form";

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
    params.q
      ?.trim() ??
    "";

  const status =
    params.status
      ?.trim() ??
    "";

  // =========================================================
  // DADOS GERAIS
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
  // PROFILES
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
    <div className="mx-auto max-w-[1600px]">
      {/* CABEÇALHO */}

      <div className="mb-7">
        <p className="text-sm font-semibold text-[#AF1B1B]">
          Financeiro
        </p>

        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
          Acompanhamento Sienge
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Consulte os pedidos importados, atualize os dados do Sienge e vincule os solicitantes aos usuários do sistema.
        </p>
      </div>

      {/* INDICADORES */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={
            PackageSearch
          }
          label="Solicitações"
          value={
            requests.length
          }
        />

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
      </div>

      {/* ABAS */}

      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
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

      {/* =====================================================
          PEDIDOS
      ====================================================== */}

      {tab ===
        "pedidos" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* FILTROS */}

          <div className="border-b border-slate-100 p-5 sm:p-6">
            <form
              method="get"
              className="grid gap-3 lg:grid-cols-[1fr_260px_auto]"
            >
              <input
                type="hidden"
                name="tab"
                value="pedidos"
              />

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
                  placeholder="Buscar por SC, solicitante ou centro de custo..."
                  className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
                />
              </div>

              <select
                name="status"
                defaultValue={
                  status
                }
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
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
          </div>

          {/* CONTAGEM */}

          <div className="border-b border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-500">
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

          {/* LISTA */}

          {requests.length ===
          0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
              <PackageSearch
                size={30}
                className="text-slate-300"
              />

              <p className="mt-4 text-sm font-semibold text-slate-700">
                Nenhum pedido encontrado
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
                    href={`/financeiro/sienge/${request.request_key}`}
                    className="group grid gap-4 px-6 py-5 transition hover:bg-slate-50/70 lg:grid-cols-[1.3fr_1fr_130px_130px_170px_auto]"
                  >
                    <div>
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

                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {request.requester_sienge_username ??
                          "Solicitante não informado"}
                      </p>

                      <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                        {request.cost_center_or_site ??
                          "Centro de custo não informado"}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Solicitação
                      </p>

                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {formatDate(
                          request.request_date
                        )}
                      </p>
                    </div>

                    <Metric
                      label="Itens"
                      value={
                        request.items_count
                      }
                    />

                    <Metric
                      label="Pedidos"
                      value={
                        request.orders_count
                      }
                    />

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Próxima previsão
                      </p>

                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {formatDate(
                          request.next_delivery_forecast
                        )}
                      </p>
                    </div>

                    <div className="flex items-center justify-end">
                      <ArrowRight
                        size={18}
                        className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#AF1B1B]"
                      />
                    </div>
                  </Link>
                )
              )}
            </div>
          )}
        </section>
      )}

      {/* =====================================================
          IMPORTAÇÕES
      ====================================================== */}

      {tab ===
        "importacoes" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-6">
              <h2 className="font-semibold text-slate-950">
                Importar arquivo
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                O sistema analisa o Excel antes de gravar qualquer alteração.
              </p>
            </div>

            <SiengeImportForm />
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Histórico de importações
              </h2>
            </div>

            {history.length ===
            0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center p-8 text-center">
                <Clock3
                  size={28}
                  className="text-slate-300"
                />

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Nenhuma importação realizada
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {history.map(
                  (
                    batch
                  ) => (
                    <div
                      key={
                        batch.id
                      }
                      className="grid gap-4 px-6 py-5 md:grid-cols-[1.5fr_110px_110px_120px_140px]"
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">
                            {
                              batch.file_name
                            }
                          </p>

                          <ImportStatus
                            status={
                              batch.status
                            }
                          />
                        </div>

                        <p className="mt-1 text-xs text-slate-400">
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
                  )
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* =====================================================
          USUÁRIOS
      ====================================================== */}

      {tab ===
        "usuarios" && (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="font-semibold text-slate-950">
              Usuários do Sienge
            </h2>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Vincule o identificador do Sienge ao usuário correspondente no Projeta Compras.
            </p>
          </div>

          <div className="divide-y divide-slate-100">
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
                  <div
                    key={
                      item.username
                    }
                    className="grid gap-4 px-6 py-5 lg:grid-cols-[270px_1fr]"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900">
                          {
                            item.username
                          }
                        </p>

                        {currentProfile ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">
                            Vinculado
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                            Não vinculado
                          </span>
                        )}
                      </div>

                      {currentProfile && (
                        <p className="mt-1 text-xs text-slate-400">
                          {currentProfile.full_name} ·{" "}
                          {currentProfile.email}
                        </p>
                      )}
                    </div>

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
                );
              }
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// COMPONENTES
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
    <Link
      href={
        href
      }
      className={[
        "inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition",
        active
          ? "bg-[#AF1B1B] text-white"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
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
            "rounded-full px-2 py-0.5 text-[10px]",
            active
              ? "bg-white/20 text-white"
              : "bg-amber-100 text-amber-700",
          ].join(" ")}
        >
          {badge}
        </span>
      )}
    </Link>
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
            ? "bg-amber-50 text-amber-700"
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
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-sm font-semibold",
          attention
            ? "text-amber-700"
            : "text-slate-800",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function TrackingStatus({
  status,
}: {
  status: string;
}) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
      {status}
    </span>
  );
}

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
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
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
      <span className="rounded-full bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700">
        Falhou
      </span>
    );
  }

  return (
    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
      Processando
    </span>
  );
}