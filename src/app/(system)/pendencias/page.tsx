import type {
  ElementType,
} from "react";

import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  PackageCheck,
  Search,
  TriangleAlert,
  UserRoundX,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  MotionCard,
  MotionList,
  MotionListItem,
  MotionPage,
  MotionReveal,
} from "@/components/ui/motion";

import PageHeader from "@/components/ui/projeta/page-header";

import DataPanel from "@/components/ui/projeta/data-panel";

import MetricCard from "@/components/ui/projeta/metric-card";

// ============================================================
// TIPOS
// ============================================================

type PageProps = {
  searchParams: Promise<{
    tipo?: string;
    q?: string;
  }>;
};

type SlaRow = {
  item_id: string;

  sc_number:
    | string
    | null;

  insumo:
    | string
    | null;

  requester_sienge_username:
    | string
    | null;

  requester_profile_id:
    | string
    | null;

  cost_center_or_site:
    | string
    | null;

  order_number:
    | string
    | null;

  supplier_name:
    | string
    | null;

  delivery_or_pickup_forecast:
    | string
    | null;

  delivery_status:
    | string
    | null;

  delivery_date:
    | string
    | null;

  tracking_status:
    | string
    | null;

  sla_status:
    | string
    | null;

  elapsed_hours:
    | number
    | string
    | null;
};

type SiengeUserRow = {
  requester_sienge_username:
    | string
    | null;

  requester_profile_id:
    | string
    | null;
};

type NotificationRow = {
  id: string;

  title: string;

  message:
    | string
    | null;

  level: string;

  created_at: string;
};

type PendingType =
  | "sla"
  | "atencao"
  | "entrega"
  | "usuarios"
  | "alertas";

type PendingPriority =
  | "critical"
  | "warning"
  | "info";

type PendingEntry = {
  id: string;

  type: PendingType;

  priority: PendingPriority;

  icon: ElementType;

  title: string;

  description: string;

  meta:
    | string
    | null;

  secondary:
    | string
    | null;

  value:
    | string
    | null;

  href: string;

  searchText: string;
};

// ============================================================
// PÁGINA
// ============================================================

export default async function PendenciasPage({
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
    data: rolesData,
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
      rolesData ??
      []
    ).map(
      (row) =>
        row.role
    );

  const canFinance =
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

  const allowedTypes = [
    "todas",
    "sla",
    "atencao",
    "entrega",
    "usuarios",
    "alertas",
  ];

  const selectedType =
    allowedTypes.includes(
      params.tipo ??
        ""
    )
      ? params.tipo!
      : "todas";

  const search =
    (
      params.q ??
      ""
    )
      .trim()
      .toLowerCase();

  // =========================================================
  // CONSULTAS
  // =========================================================

  const slaPromise =
    supabase
      .from(
        "v_sienge_item_sla"
      )
      .select(
        `
        item_id,
        sc_number,
        insumo,
        requester_sienge_username,
        requester_profile_id,
        cost_center_or_site,
        order_number,
        supplier_name,
        delivery_or_pickup_forecast,
        delivery_status,
        delivery_date,
        tracking_status,
        sla_status,
        elapsed_hours
        `
      );

  const siengeUsersPromise =
    supabase
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

  let notificationsQuery =
    supabase
      .from(
        "system_notifications"
      )
      .select(
        `
        id,
        title,
        message,
        level,
        created_at
        `
      )
      .is(
        "read_at",
        null
      )
      .in(
        "level",
        [
          "warning",
          "error",
        ]
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(
        50
      );

  if (!canFinance) {
    notificationsQuery =
      notificationsQuery.eq(
        "user_id",
        userId
      );
  }

  const [
    slaResult,
    siengeUsersResult,
    notificationsResult,
  ] =
    await Promise.all([
      slaPromise,
      siengeUsersPromise,
      notificationsQuery,
    ]);

  if (
    slaResult.error
  ) {
    console.error(
      "Erro ao carregar SLA:",
      slaResult.error
    );
  }

  if (
    siengeUsersResult.error
  ) {
    console.error(
      "Erro ao carregar usuários Sienge:",
      siengeUsersResult.error
    );
  }

  if (
    notificationsResult.error
  ) {
    console.error(
      "Erro ao carregar alertas:",
      notificationsResult.error
    );
  }

  const slaRows =
    (
      slaResult.data ??
      []
    ) as SlaRow[];

  const siengeUsers =
    (
      siengeUsersResult.data ??
      []
    ) as SiengeUserRow[];

  const notifications =
    (
      notificationsResult.data ??
      []
    ) as NotificationRow[];

  // =========================================================
  // SLA
  //
  // Uma SC pode ter vários itens vencidos.
  // Para a Central mostramos uma pendência por SC.
  // =========================================================

  const overdueBySc =
    createScMap(
      slaRows.filter(
        (row) =>
          row.sla_status ===
          "overdue"
      )
    );

  const warningBySc =
    createScMap(
      slaRows.filter(
        (row) =>
          row.sla_status ===
          "warning"
      )
    );

  // =========================================================
  // PREVISÕES VENCIDAS
  // =========================================================

  const today =
    startOfToday();

  const overdueDeliveryRows =
    slaRows.filter(
      (row) => {
        if (
          !row.delivery_or_pickup_forecast
        ) {
          return false;
        }

        if (
          row.tracking_status ===
          "Entregue"
        ) {
          return false;
        }

        const forecast =
          parseDate(
            row.delivery_or_pickup_forecast
          );

        if (!forecast) {
          return false;
        }

        return (
          forecast.getTime() <
          today.getTime()
        );
      }
    );

  const overdueDeliveryBySc =
    createScMap(
      overdueDeliveryRows
    );

  // =========================================================
  // USUÁRIOS SEM VÍNCULO
  // =========================================================

  const unmatchedUsers =
    canFinance
      ? Array.from(
          new Set(
            siengeUsers
              .filter(
                (row) =>
                  row
                    .requester_sienge_username &&
                  !row
                    .requester_profile_id
              )
              .map(
                (row) =>
                  row
                    .requester_sienge_username!
                    .trim()
                    .toUpperCase()
              )
          )
        ).sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b,
              "pt-BR"
            )
        )
      : [];

  // =========================================================
  // MONTAGEM DA FILA
  // =========================================================

  const entries: PendingEntry[] =
    [];

  for (
    const row
    of overdueBySc.values()
  ) {
    const sc =
      row.sc_number ??
      "Sem SC";

    entries.push({
      id:
        `sla-${sc}`,

      type:
        "sla",

      priority:
        "critical",

      icon:
        Clock3,

      title:
        `SC ${sc} fora do SLA`,

      description:
        row.tracking_status
          ? `Etapa atual: ${row.tracking_status}`
          : "Prazo operacional ultrapassado.",

      meta:
        row.requester_sienge_username,

      secondary:
        row.cost_center_or_site,

      value:
        formatElapsedTime(
          row.elapsed_hours
        ),

      href:
        getRequestHref(
          canFinance,
          sc
        ),

      searchText:
        createSearchText(
          row
        ),
    });
  }

  for (
    const row
    of warningBySc.values()
  ) {
    const sc =
      row.sc_number ??
      "Sem SC";

    /*
     * Se a mesma SC já estiver vencida,
     * não exibimos novamente como atenção.
     */
    if (
      overdueBySc.has(
        sc
      )
    ) {
      continue;
    }

    entries.push({
      id:
        `warning-${sc}`,

      type:
        "atencao",

      priority:
        "warning",

      icon:
        TriangleAlert,

      title:
        `SC ${sc} próxima do limite`,

      description:
        row.tracking_status
          ? `Etapa atual: ${row.tracking_status}`
          : "Prazo próximo do limite definido.",

      meta:
        row.requester_sienge_username,

      secondary:
        row.cost_center_or_site,

      value:
        formatElapsedTime(
          row.elapsed_hours
        ),

      href:
        getRequestHref(
          canFinance,
          sc
        ),

      searchText:
        createSearchText(
          row
        ),
    });
  }

  for (
    const row
    of overdueDeliveryBySc.values()
  ) {
    const sc =
      row.sc_number ??
      "Sem SC";

    entries.push({
      id:
        `delivery-${sc}`,

      type:
        "entrega",

      priority:
        "critical",

      icon:
        PackageCheck,

      title:
        `Entrega da SC ${sc} vencida`,

      description:
        row.delivery_or_pickup_forecast
          ? `Previsão: ${formatDate(
              row.delivery_or_pickup_forecast
            )}`
          : "Previsão de entrega ultrapassada.",

      meta:
        row.supplier_name,

      secondary:
        row.order_number
          ? `Pedido ${row.order_number}`
          : row.requester_sienge_username,

      value:
        getDelayLabel(
          row.delivery_or_pickup_forecast
        ),

      href:
        getRequestHref(
          canFinance,
          sc
        ),

      searchText:
        createSearchText(
          row
        ),
    });
  }

  if (
    canFinance
  ) {
    for (
      const username
      of unmatchedUsers
    ) {
      entries.push({
        id:
          `user-${username}`,

        type:
          "usuarios",

        priority:
          "warning",

        icon:
          UserRoundX,

        title:
          `${username} sem vínculo`,

        description:
          "Usuário identificado no arquivo do Sienge ainda não está relacionado a um colaborador.",

        meta:
          "Sienge",

        secondary:
          null,

        value:
          "Vincular",

        href:
          `/financeiro/sienge?tab=usuarios&q=${encodeURIComponent(
            username
          )}`,

        searchText:
          username.toLowerCase(),
      });
    }
  }

  for (
    const notification
    of notifications
  ) {
    entries.push({
      id:
        `alert-${notification.id}`,

      type:
        "alertas",

      priority:
        notification.level ===
        "error"
          ? "critical"
          : "warning",

      icon:
        Bell,

      title:
        notification.title,

      description:
        notification.message ??
        "Alerta operacional não lido.",

      meta:
        "Notificação",

      secondary:
        formatDateTime(
          notification.created_at
        ),

      value:
        notification.level ===
        "error"
          ? "Crítico"
          : "Atenção",

      href:
        "/notificacoes?filtro=nao-lidas",

      searchText:
        `${notification.title} ${notification.message ?? ""}`.toLowerCase(),
    });
  }

  // =========================================================
  // ORDENAÇÃO
  // =========================================================

  const priorityWeight: Record<
    PendingPriority,
    number
  > = {
    critical:
      0,

    warning:
      1,

    info:
      2,
  };

  entries.sort(
    (
      a,
      b
    ) =>
      priorityWeight[
        a.priority
      ] -
      priorityWeight[
        b.priority
      ]
  );

  // =========================================================
  // FILTRAGEM
  // =========================================================

  const filteredEntries =
    entries.filter(
      (entry) => {
        if (
          selectedType !==
            "todas" &&
          entry.type !==
            selectedType
        ) {
          return false;
        }

        if (
          search &&
          !entry.searchText.includes(
            search
          ) &&
          !entry.title
            .toLowerCase()
            .includes(
              search
            ) &&
          !entry.description
            .toLowerCase()
            .includes(
              search
            )
        ) {
          return false;
        }

        return true;
      }
    );

  // =========================================================
  // CONTADORES
  // =========================================================

  const overdueCount =
    entries.filter(
      (entry) =>
        entry.type ===
        "sla"
    ).length;

  const warningCount =
    entries.filter(
      (entry) =>
        entry.type ===
        "atencao"
    ).length;

  const deliveryCount =
    entries.filter(
      (entry) =>
        entry.type ===
        "entrega"
    ).length;

  const unmatchedCount =
    entries.filter(
      (entry) =>
        entry.type ===
        "usuarios"
    ).length;

  const alertsCount =
    entries.filter(
      (entry) =>
        entry.type ===
        "alertas"
    ).length;

  const criticalCount =
    entries.filter(
      (entry) =>
        entry.priority ===
        "critical"
    ).length;

  // =========================================================
  // TELA
  // =========================================================

  return (
    <MotionPage className="mx-auto max-w-[1580px]">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <MotionReveal>
        <PageHeader
          eyebrow="Operação"
          title="Central de Pendências"
          description="Tudo que precisa de ação reunido em uma única fila operacional."
          actions={
            criticalCount >
            0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-error/15 bg-error/[0.04] px-3 py-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-error opacity-30" />

                  <span className="relative inline-flex h-2 w-2 rounded-full bg-error" />
                </span>

                <span className="text-xs font-semibold text-error">
                  {
                    criticalCount
                  }{" "}
                  crítico
                  {criticalCount ===
                  1
                    ? ""
                    : "s"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-success/15 bg-success/[0.04] px-3 py-2">
                <CheckCircle2
                  size={15}
                  className="text-success"
                />

                <span className="text-xs font-semibold text-success">
                  Sem itens críticos
                </span>
              </div>
            )
          }
        />
      </MotionReveal>

      {/* =====================================================
          RESUMO
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MotionCard
          delay={0.04}
        >
          <MetricCard
            icon={
              AlertCircle
            }
            label="Total"
            value={
              entries.length
            }
            description="Ocorrências que exigem acompanhamento"
            variant={
              entries.length >
              0
                ? "primary"
                : "success"
            }
          />
        </MotionCard>

        <MotionCard
          delay={0.08}
        >
          <MetricCard
            icon={
              Clock3
            }
            label="Fora do SLA"
            value={
              overdueCount
            }
            description="Prazo operacional ultrapassado"
            variant={
              overdueCount >
              0
                ? "error"
                : "success"
            }
          />
        </MotionCard>

        <MotionCard
          delay={0.12}
        >
          <MetricCard
            icon={
              PackageCheck
            }
            label="Entrega vencida"
            value={
              deliveryCount
            }
            description="Previsão já ultrapassada"
            variant={
              deliveryCount >
              0
                ? "error"
                : "success"
            }
          />
        </MotionCard>

        <MotionCard
          delay={0.16}
        >
          <MetricCard
            icon={
              TriangleAlert
            }
            label="Em atenção"
            value={
              warningCount
            }
            description="Próximos do limite"
            variant={
              warningCount >
              0
                ? "warning"
                : "neutral"
            }
          />
        </MotionCard>

        <MotionCard
          delay={0.2}
        >
          <MetricCard
            icon={
              UserRoundX
            }
            label={
              canFinance
                ? "Sem vínculo"
                : "Alertas"
            }
            value={
              canFinance
                ? unmatchedCount
                : alertsCount
            }
            description={
              canFinance
                ? "Usuários Sienge pendentes"
                : "Notificações importantes"
            }
            variant={
              (
                canFinance
                  ? unmatchedCount
                  : alertsCount
              ) >
              0
                ? "warning"
                : "neutral"
            }
          />
        </MotionCard>
      </div>

      {/* =====================================================
          BARRA DE FILTROS
      ====================================================== */}

      <MotionReveal
        delay={0.14}
      >
        <div className="mb-6 rounded-[20px] border border-base-300/80 bg-base-100 p-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
            {/* BUSCA */}

            <form
              method="get"
              action="/pendencias"
              className="flex min-w-0 flex-1 gap-2"
            >
              {selectedType !==
                "todas" && (
                <input
                  type="hidden"
                  name="tipo"
                  value={
                    selectedType
                  }
                />
              )}

              <label className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-base-300 bg-base-200/30 px-3 focus-within:border-primary/30 focus-within:bg-base-100">
                <Search
                  size={15}
                  className="shrink-0 text-base-content/30"
                />

                <input
                  type="search"
                  name="q"
                  defaultValue={
                    params.q ??
                    ""
                  }
                  placeholder="Buscar SC, solicitante, fornecedor, pedido..."
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-base-content/30"
                />
              </label>

              <button
                type="submit"
                className="btn btn-neutral btn-sm h-10 rounded-xl px-4"
              >
                Buscar
              </button>
            </form>

            {/* FILTROS */}

            <div className="flex gap-1 overflow-x-auto rounded-xl bg-base-200/50 p-1">
              <FilterTab
                active={
                  selectedType ===
                  "todas"
                }
                href={
                  createFilterHref(
                    "todas",
                    params.q
                  )
                }
                label="Todas"
                count={
                  entries.length
                }
              />

              <FilterTab
                active={
                  selectedType ===
                  "sla"
                }
                href={
                  createFilterHref(
                    "sla",
                    params.q
                  )
                }
                label="SLA"
                count={
                  overdueCount
                }
              />

              <FilterTab
                active={
                  selectedType ===
                  "entrega"
                }
                href={
                  createFilterHref(
                    "entrega",
                    params.q
                  )
                }
                label="Entregas"
                count={
                  deliveryCount
                }
              />

              <FilterTab
                active={
                  selectedType ===
                  "atencao"
                }
                href={
                  createFilterHref(
                    "atencao",
                    params.q
                  )
                }
                label="Atenção"
                count={
                  warningCount
                }
              />

              {canFinance && (
                <FilterTab
                  active={
                    selectedType ===
                    "usuarios"
                  }
                  href={
                    createFilterHref(
                      "usuarios",
                      params.q
                    )
                  }
                  label="Usuários"
                  count={
                    unmatchedCount
                  }
                />
              )}

              <FilterTab
                active={
                  selectedType ===
                  "alertas"
                }
                href={
                  createFilterHref(
                    "alertas",
                    params.q
                  )
                }
                label="Alertas"
                count={
                  alertsCount
                }
              />
            </div>
          </div>
        </div>
      </MotionReveal>

      {/* =====================================================
          FILA
      ====================================================== */}

      <MotionReveal
        delay={0.18}
      >
        <DataPanel
          eyebrow="Minha fila"
          title="Pendências que exigem ação"
          description={
            search
              ? `${filteredEntries.length} resultado(s) para a busca atual.`
              : `${filteredEntries.length} ocorrência(s) nesta visualização.`
          }
        >
          {filteredEntries.length ===
          0 ? (
            <div className="flex min-h-[380px] flex-col items-center justify-center p-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-success/10 text-success">
                <CheckCircle2
                  size={27}
                />
              </div>

              <h3 className="mt-5 text-base font-semibold">
                Nenhuma pendência encontrada
              </h3>

              <p className="mt-2 max-w-sm text-xs leading-5 text-base-content/40">
                {search
                  ? "Não existem registros que correspondam aos filtros aplicados."
                  : "A operação está em dia para esta categoria."}
              </p>

              {(
                search ||
                selectedType !==
                  "todas"
              ) && (
                <Link
                  href="/pendencias"
                  className="btn btn-ghost btn-sm mt-5 rounded-xl"
                >
                  Limpar filtros
                </Link>
              )}
            </div>
          ) : (
            <MotionList className="divide-y divide-base-300/70">
              {filteredEntries.map(
                (
                  entry
                ) => (
                  <MotionListItem
                    key={
                      entry.id
                    }
                  >
                    <PendingRow
                      entry={
                        entry
                      }
                    />
                  </MotionListItem>
                )
              )}
            </MotionList>
          )}
        </DataPanel>
      </MotionReveal>
    </MotionPage>
  );
}

// ============================================================
// LINHA DA PENDÊNCIA
// ============================================================

function PendingRow({
  entry,
}: {
  entry: PendingEntry;
}) {
  const Icon =
    entry.icon;

  const style =
    entry.priority ===
    "critical"
      ? {
          icon:
            "bg-error/10 text-error",

          badge:
            "badge-error",

          indicator:
            "bg-error",
        }
      : entry.priority ===
          "warning"
        ? {
            icon:
              "bg-warning/10 text-warning",

            badge:
              "badge-warning",

            indicator:
              "bg-warning",
          }
        : {
            icon:
              "bg-info/10 text-info",

            badge:
              "badge-info",

            indicator:
              "bg-info",
          };

  return (
    <Link
      href={
        entry.href
      }
      className="group relative flex gap-4 px-5 py-5 transition-colors hover:bg-base-200/40 sm:px-6"
    >
      <span
        className={[
          "absolute bottom-4 left-0 top-4 w-[3px] rounded-r-full opacity-70",
          style.indicator,
        ].join(" ")}
      />

      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]",
          style.icon,
        ].join(" ")}
      >
        <Icon
          size={18}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-base-content/80">
                {
                  entry.title
                }
              </p>

              <span
                className={[
                  "badge badge-sm",
                  style.badge,
                ].join(" ")}
              >
                {getTypeLabel(
                  entry.type
                )}
              </span>
            </div>

            <p className="mt-1.5 text-[11px] leading-5 text-base-content/45">
              {
                entry.description
              }
            </p>

            {(
              entry.meta ||
              entry.secondary
            ) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-base-content/35">
                {entry.meta && (
                  <span>
                    {
                      entry.meta
                    }
                  </span>
                )}

                {entry.secondary && (
                  <span>
                    {
                      entry.secondary
                    }
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:pl-5">
            {entry.value && (
              <span className="text-xs font-semibold tabular-nums text-base-content/50">
                {
                  entry.value
                }
              </span>
            )}

            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-base-content/20 transition-all group-hover:bg-base-200 group-hover:text-primary">
              <ArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================================
// FILTRO
// ============================================================

function FilterTab({
  active,
  href,
  label,
  count,
}: {
  active: boolean;

  href: string;

  label: string;

  count: number;
}) {
  return (
    <Link
      href={
        href
      }
      className={[
        "flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-[10px] font-semibold transition",
        active
          ? "bg-base-100 text-base-content shadow-sm"
          : "text-base-content/40 hover:text-base-content/70",
      ].join(" ")}
    >
      {label}

      <span
        className={[
          "flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[8px] font-bold",
          active
            ? "bg-primary/10 text-primary"
            : "bg-base-300/70 text-base-content/35",
        ].join(" ")}
      >
        {count}
      </span>
    </Link>
  );
}

// ============================================================
// MAPA POR SC
// ============================================================

function createScMap(
  rows: SlaRow[]
) {
  const map =
    new Map<
      string,
      SlaRow
    >();

  for (
    const row
    of rows
  ) {
    const key =
      row.sc_number ??
      row.item_id;

    const current =
      map.get(
        key
      );

    if (
      !current
    ) {
      map.set(
        key,
        row
      );

      continue;
    }

    const currentHours =
      Number(
        current.elapsed_hours ??
          0
      );

    const newHours =
      Number(
        row.elapsed_hours ??
          0
      );

    if (
      newHours >
      currentHours
    ) {
      map.set(
        key,
        row
      );
    }
  }

  return map;
}

// ============================================================
// LINK DA SC
// ============================================================

function getRequestHref(
  canFinance: boolean,
  sc: string
) {
  const encoded =
    encodeURIComponent(
      sc
    );

  return canFinance
    ? `/financeiro/sienge?tab=pedidos&q=${encoded}`
    : `/meus-pedidos?q=${encoded}`;
}

// ============================================================
// BUSCA
// ============================================================

function createSearchText(
  row: SlaRow
) {
  return [
    row.sc_number,
    row.insumo,
    row.requester_sienge_username,
    row.cost_center_or_site,
    row.order_number,
    row.supplier_name,
    row.tracking_status,
  ]
    .filter(
      Boolean
    )
    .join(
      " "
    )
    .toLowerCase();
}

// ============================================================
// FILTROS
// ============================================================

function createFilterHref(
  type: string,
  query:
    | string
    | undefined
) {
  const params =
    new URLSearchParams();

  if (
    type !==
    "todas"
  ) {
    params.set(
      "tipo",
      type
    );
  }

  if (
    query?.trim()
  ) {
    params.set(
      "q",
      query.trim()
    );
  }

  const result =
    params.toString();

  return result
    ? `/pendencias?${result}`
    : "/pendencias";
}

// ============================================================
// LABEL
// ============================================================

function getTypeLabel(
  type: PendingType
) {
  switch (
    type
  ) {
    case "sla":
      return "SLA vencido";

    case "atencao":
      return "SLA";

    case "entrega":
      return "Entrega";

    case "usuarios":
      return "Usuário";

    case "alertas":
      return "Alerta";
  }
}

// ============================================================
// DATAS
// ============================================================

function parseDate(
  value: string
) {
  const date =
    new Date(
      `${value.slice(
        0,
        10
      )}T12:00:00`
    );

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function startOfToday() {
  const date =
    new Date();

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
}

function formatDate(
  value: string
) {
  const date =
    parseDate(
      value
    );

  if (!date) {
    return value;
  }

  return new Intl.DateTimeFormat(
    "pt-BR"
  ).format(
    date
  );
}

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    new Date(
      value
    )
  );
}

// ============================================================
// TEMPO SLA
// ============================================================

function formatElapsedTime(
  value:
    | string
    | number
    | null
) {
  const hours =
    Number(
      value ??
        0
    );

  if (
    !Number.isFinite(
      hours
    )
  ) {
    return null;
  }

  if (
    hours <
    24
  ) {
    return `${Math.round(
      hours
    )}h`;
  }

  const days =
    hours /
    24;

  return `${days.toFixed(
    days >=
    10
      ? 0
      : 1
  )} dias`;
}

// ============================================================
// ATRASO DE ENTREGA
// ============================================================

function getDelayLabel(
  value:
    | string
    | null
) {
  if (!value) {
    return null;
  }

  const forecast =
    parseDate(
      value
    );

  if (!forecast) {
    return null;
  }

  const today =
    startOfToday();

  const difference =
    Math.floor(
      (
        today.getTime() -
        forecast.getTime()
      ) /
        86400000
    );

  if (
    difference <=
    0
  ) {
    return null;
  }

  return difference ===
    1
    ? "1 dia"
    : `${difference} dias`;
}