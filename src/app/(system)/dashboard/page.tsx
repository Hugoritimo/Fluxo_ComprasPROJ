import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSpreadsheet,
  ListTodo,
  PackageSearch,
  Plus,
  RotateCcw,
  Send,
  ShoppingCart,
  Sparkles,
  Truck,
  TrendingUp,
  UserRoundX,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  buildPendingSummary,
} from "@/lib/pendencias/summary";

import {
  MotionList,
  MotionListItem,
  MotionReveal,
  MotionScaleIn,
  MotionStagger,
  MotionStaggerItem,
  MotionStatus,
  MotionSurface,
} from "@/components/ui/motion";

import AnimatedNumber from "@/components/ui/projeta/animated-number";

import AnimatedProgress from "@/components/ui/projeta/animated-progress";

import AnimatedRadialProgress from "@/components/ui/projeta/animated-radial-progress";

// ============================================================
// TIPOS
// ============================================================

type ProfileRow = {
  full_name:
    | string
    | null;

  email:
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

  action_url:
    | string
    | null;

  created_at: string;
};

type NotificationSummaryRow = {
  id: string;

  level:
    | string
    | null;

  read_at:
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

type SlaRow = {
  item_id: string;

  sc_number:
    | string
    | null;

  delivery_or_pickup_forecast:
    | string
    | null;

  tracking_status:
    | string
    | null;

  sla_status:
    | string
    | null;

  elapsed_hours:
    | string
    | number
    | null;
};

// ============================================================
// FLUXO
// ============================================================

const flowStatuses = [
  {
    label:
      "Recebida",

    shortLabel:
      "Recebida",

    key:
      "Solicitação recebida",
  },

  {
    label:
      "Em cotação",

    shortLabel:
      "Cotação",

    key:
      "Em cotação",
  },

  {
    label:
      "Em aprovação",

    shortLabel:
      "Aprovação",

    key:
      "Em aprovação",
  },

  {
    label:
      "Compra realizada",

    shortLabel:
      "Compra",

    key:
      "Compra realizada",
  },

  {
    label:
      "Compra via cartão",

    shortLabel:
      "Cartão",

    key:
      "Compra via cartão",
  },

  {
    label:
      "Entrega / Retirada",

    shortLabel:
      "Logística",

    key:
      "delivery",
  },

  {
    label:
      "Entregue",

    shortLabel:
      "Entregue",

    key:
      "Entregue",
  },
];

// ============================================================
// PAGE
// ============================================================

export default async function DashboardPage() {
  const supabase =
    await createClient();

  // =========================================================
  // AUTH
  // =========================================================

  const {
    data:
      claimsData,
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
  // PROFILE + ROLES
  // =========================================================

  const [
    profileResult,
    rolesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "profiles"
        )
        .select(
          `
          full_name,
          email
          `
        )
        .eq(
          "id",
          userId
        )
        .maybeSingle(),

      supabase
        .from(
          "user_roles"
        )
        .select(
          "role"
        )
        .eq(
          "user_id",
          userId
        ),
    ]);

  const profile =
    profileResult.data as
      | ProfileRow
      | null;

  const roles =
    (
      rolesResult.data ??
      []
    ).map(
      (
        item
      ) =>
        String(
          item.role
        )
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

  const canAdmin =
    roles.includes(
      "admin"
    ) ||
    roles.includes(
      "superadmin"
    );

  // =========================================================
  // CONSULTAS
  // =========================================================

  const requestsPromise =
    supabase
      .from(
        "v_sienge_request_summary"
      )
      .select(
        "*"
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

  const slaPromise =
    supabase
      .from(
        "v_sienge_item_sla"
      )
      .select(
        `
        item_id,
        sc_number,
        delivery_or_pickup_forecast,
        tracking_status,
        sla_status,
        elapsed_hours
        `
      );

  const siengeUsersPromise =
    canFinance
      ? supabase
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
          )
      : Promise.resolve(
          {
            data:
              [] as SiengeUserRow[],

            error:
              null,
          }
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
        action_url,
        created_at
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
        7
      );

  let notificationSummaryQuery =
    supabase
      .from(
        "system_notifications"
      )
      .select(
        `
        id,
        level,
        read_at
        `
      );

  if (!canFinance) {
    notificationsQuery =
      notificationsQuery.eq(
        "user_id",
        userId
      );

    notificationSummaryQuery =
      notificationSummaryQuery.eq(
        "user_id",
        userId
      );
  }

  const [
    requestsResult,
    slaResult,
    siengeUsersResult,
    notificationsResult,
    notificationSummaryResult,
  ] =
    await Promise.all([
      requestsPromise,
      slaPromise,
      siengeUsersPromise,
      notificationsQuery,
      notificationSummaryQuery,
    ]);

  // =========================================================
  // ERROS
  // =========================================================

  if (
    requestsResult.error
  ) {
    console.error(
      "Erro ao carregar pedidos:",
      requestsResult.error
    );
  }

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
      "Erro ao carregar atividade:",
      notificationsResult.error
    );
  }

  if (
    notificationSummaryResult.error
  ) {
    console.error(
      "Erro ao carregar resumo de notificações:",
      notificationSummaryResult.error
    );
  }

  // =========================================================
  // DADOS
  // =========================================================

  const requests =
    requestsResult.data ??
    [];

  const slaRows =
    (
      slaResult.data ??
      []
    ) as SlaRow[];

  const siengeRows =
    (
      siengeUsersResult.data ??
      []
    ) as SiengeUserRow[];

  const recentActivity =
    (
      notificationsResult.data ??
      []
    ) as NotificationRow[];

  const notificationSummary =
    (
      notificationSummaryResult.data ??
      []
    ) as NotificationSummaryRow[];

  // =========================================================
  // PENDÊNCIAS — FONTE ÚNICA
  // =========================================================

  const pendingSummary =
    buildPendingSummary(
      {
        slaRows,

        siengeUsers:
          siengeRows,

        notifications:
          notificationSummary,

        canFinance,
      }
    );

  const pendingCount =
    pendingSummary.total;

  const criticalCount =
    pendingSummary.critical;

  const attentionCount =
    pendingSummary.attention;

  const pendingCategories =
    pendingSummary.categories;

  // =========================================================
  // MÉTRICAS
  // =========================================================

  const totalRequests =
    requests.length;

  const delivered =
    requests.filter(
      (
        item
      ) =>
        item.tracking_status ===
        "Entregue"
    ).length;

  const inProgress =
    Math.max(
      0,
      totalRequests -
        delivered
    );

  const completionRate =
    totalRequests >
    0
      ? Math.round(
          (
            delivered /
            totalRequests
          ) *
            100
        )
      : 0;

  // =========================================================
  // SLA
  // =========================================================

  const onTimeItems =
    slaRows.filter(
      (
        item
      ) =>
        item.sla_status ===
        "on_time"
    );

  const warningItems =
    slaRows.filter(
      (
        item
      ) =>
        item.sla_status ===
        "warning"
    );

  const overdueItems =
    slaRows.filter(
      (
        item
      ) =>
        item.sla_status ===
        "overdue"
    );

  const activeSlaItems =
    slaRows.filter(
      (
        item
      ) =>
        [
          "on_time",
          "warning",
          "overdue",
        ].includes(
          item.sla_status ??
            ""
        )
    );

  const onTimeRate =
    activeSlaItems.length >
    0
      ? Math.round(
          (
            onTimeItems.length /
            activeSlaItems.length
          ) *
            100
        )
      : 100;

  const warningRate =
    activeSlaItems.length >
    0
      ? Math.round(
          (
            warningItems.length /
            activeSlaItems.length
          ) *
            100
        )
      : 0;

  const overdueRate =
    activeSlaItems.length >
    0
      ? Math.round(
          (
            overdueItems.length /
            activeSlaItems.length
          ) *
            100
        )
      : 0;

  // =========================================================
  // FLUXO
  // =========================================================

  const flowData =
    flowStatuses.map(
      (
        statusItem
      ) => {
        const count =
          statusItem.key ===
          "delivery"
            ? requests.filter(
                (
                  request
                ) =>
                  request.tracking_status ===
                    "Disponível para retirada" ||
                  request.tracking_status ===
                    "Em processo de entrega"
              ).length
            : requests.filter(
                (
                  request
                ) =>
                  request.tracking_status ===
                  statusItem.key
              ).length;

        return {
          ...statusItem,
          count,
        };
      }
    );

  // =========================================================
  // LINKS
  // =========================================================

  const operationHref =
    canFinance
      ? "/financeiro/sienge?tab=pedidos"
      : "/meus-pedidos";

  // =========================================================
  // USER
  // =========================================================

  const fullName =
    profile?.full_name?.trim() ||
    "Usuário";

  const firstName =
    fullName
      .split(
        /\s+/
      )
      .filter(
        Boolean
      )[0] ??
    "Usuário";

  const today =
    formatCurrentDate();

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <main className="projeta-page">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <MotionReveal
        distance={
          10
        }
      >
        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MotionStatus
                pulse
                className="flex"
              >
                <span className="status status-success status-xs" />
              </MotionStatus>

              <p className="projeta-section-label">
                Operação em tempo real
              </p>
            </div>

            <h1 className="mt-3 text-[28px] font-[700] tracking-[-0.05em] text-base-content sm:text-[32px]">
              Olá, {firstName}.
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-[450] text-base-content/40">
              <span>
                {today}
              </span>

              <span className="h-1 w-1 rounded-full bg-base-content/20" />

              <span>
                Acompanhe o que precisa da sua atenção hoje.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/meus-pedidos"
              className="btn btn-ghost btn-sm h-10 rounded-xl border border-base-300 bg-base-100 px-4"
            >
              <PackageSearch
                size={
                  15
                }
              />

              Meus pedidos
            </Link>

            <Link
              href="/solicitacoes/nova"
              className="btn btn-primary btn-sm h-10 rounded-xl px-4"
            >
              <Plus
                size={
                  15
                }
              />

              Nova solicitação
            </Link>
          </div>
        </header>
      </MotionReveal>

      {/* =====================================================
          HERO
      ====================================================== */}

      <MotionStagger
        className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.65fr)]"
        stagger={
          0.09
        }
      >
        {/* ===================================================
            COCKPIT
        ==================================================== */}

        <MotionStaggerItem>
          <MotionSurface
            interactive={
              false
            }
            className="h-full"
          >
            <section className="projeta-dark-surface h-full min-h-[340px]">
              <div className="relative z-10 flex h-full flex-col p-6 sm:p-7">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <MotionScaleIn
                        delay={
                          0.12
                        }
                      >
                        <Sparkles
                          size={
                            13
                          }
                          className="text-[#d66464]"
                        />
                      </MotionScaleIn>

                      <p className="text-[8px] font-[750] uppercase tracking-[0.2em] text-white/35">
                        Pulso da operação
                      </p>
                    </div>

                    <div className="mt-5 flex items-end gap-3">
                      <AnimatedNumber
                        value={
                          totalRequests
                        }
                        duration={
                          0.9
                        }
                        delay={
                          0.12
                        }
                        className="text-[58px] font-[750] leading-none tracking-[-0.065em] text-white"
                      />

                      <div className="pb-1.5">
                        <p className="text-[11px] font-[550] text-white/70">
                          solicitações
                        </p>

                        <p className="mt-0.5 text-[9px] font-[450] text-white/30">
                          acompanhadas pelo sistema
                        </p>
                      </div>
                    </div>
                  </div>

                  <MotionScaleIn
                    delay={
                      0.18
                    }
                  >
                    <div className="projeta-float flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-white/[0.08] bg-white/[0.055] text-white/55 backdrop-blur-sm">
                      <ShoppingCart
                        size={
                          20
                        }
                      />
                    </div>
                  </MotionScaleIn>
                </div>

                {/* =================================================
                    MÉTRICAS CLICÁVEIS
                ================================================== */}

                <MotionStagger
                  className="mt-8 grid grid-cols-3 divide-x divide-white/[0.08] border-y border-white/[0.07] py-3"
                  delay={
                    0.18
                  }
                  stagger={
                    0.07
                  }
                >
                  <MotionStaggerItem
                    scale={
                      false
                    }
                  >
                    <CockpitMetric
                      value={
                        inProgress
                      }
                      label="Em andamento"
                      hint="processos ativos"
                      delay={
                        0.2
                      }
                      href={
                        operationHref
                      }
                    />
                  </MotionStaggerItem>

                  <MotionStaggerItem
                    scale={
                      false
                    }
                  >
                    <CockpitMetric
                      value={
                        delivered
                      }
                      label="Entregues"
                      hint="processos concluídos"
                      delay={
                        0.27
                      }
                      href={
                        operationHref
                      }
                    />
                  </MotionStaggerItem>

                  <MotionStaggerItem
                    scale={
                      false
                    }
                  >
                    <CockpitMetric
                      value={
                        completionRate
                      }
                      suffix="%"
                      label="Conclusão"
                      hint="taxa geral"
                      delay={
                        0.34
                      }
                      href={
                        operationHref
                      }
                    />
                  </MotionStaggerItem>
                </MotionStagger>

                {/* =================================================
                    FOOTER
                ================================================== */}

                <div className="mt-auto flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <MotionStagger
                    className="flex flex-wrap items-center gap-4"
                    delay={
                      0.28
                    }
                    stagger={
                      0.07
                    }
                  >
                    <MotionStaggerItem
                      scale={
                        false
                      }
                    >
                      <OperationSignal
                        color="bg-emerald-400"
                        value={
                          onTimeItems.length
                        }
                        label="no prazo"
                        delay={
                          0.3
                        }
                      />
                    </MotionStaggerItem>

                    <MotionStaggerItem
                      scale={
                        false
                      }
                    >
                      <OperationSignal
                        color="bg-amber-400"
                        value={
                          warningItems.length
                        }
                        label="em atenção"
                        delay={
                          0.36
                        }
                      />
                    </MotionStaggerItem>

                    <MotionStaggerItem
                      scale={
                        false
                      }
                    >
                      <OperationSignal
                        color="bg-red-400"
                        value={
                          overdueItems.length
                        }
                        label="atrasados"
                        delay={
                          0.42
                        }
                      />
                    </MotionStaggerItem>
                  </MotionStagger>

                  <Link
                    href={
                      operationHref
                    }
                    className="group flex items-center gap-2 text-[10px] font-[650] text-white/45 transition hover:text-white"
                  >
                    Abrir operação

                    <ArrowUpRight
                      size={
                        13
                      }
                      className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </Link>
                </div>
              </div>
            </section>
          </MotionSurface>
        </MotionStaggerItem>

        {/* ===================================================
            SLA
        ==================================================== */}

        <MotionStaggerItem>
          <MotionSurface
            interactive={
              false
            }
            className="h-full"
          >
            <section className="projeta-panel flex h-full min-h-[340px] flex-col">
              <div className="relative z-10 flex flex-1 flex-col p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="projeta-section-label">
                      Saúde operacional
                    </p>

                    <h2 className="mt-2 text-[15px] font-[650] tracking-[-0.025em]">
                      SLA da operação
                    </h2>
                  </div>

                  <TrendingUp
                    size={
                      18
                    }
                    className="text-base-content/20"
                  />
                </div>

                <div className="flex flex-1 items-center justify-center py-5">
                  <MotionScaleIn>
                    <AnimatedRadialProgress
                      value={
                        onTimeRate
                      }
                      duration={
                        1.05
                      }
                      delay={
                        0.15
                      }
                      size="8.8rem"
                      thickness="0.55rem"
                      className={
                        getSlaTextColor(
                          onTimeRate
                        )
                      }
                      valueClassName="text-[30px] font-[750] leading-none tracking-[-0.055em]"
                      label="dentro do prazo"
                      labelClassName="mt-1 text-[8px] font-[750] uppercase tracking-[0.12em] text-base-content/30"
                      ariaLabel="Percentual de itens dentro do SLA"
                    />
                  </MotionScaleIn>
                </div>

                <MotionStagger
                  className="grid grid-cols-3 divide-x divide-base-300 border-t border-base-300 pt-4"
                  stagger={
                    0.07
                  }
                >
                  <MotionStaggerItem
                    scale={
                      false
                    }
                  >
                    <MiniSla
                      value={
                        onTimeItems.length
                      }
                      label="No prazo"
                      dot="bg-success"
                    />
                  </MotionStaggerItem>

                  <MotionStaggerItem
                    scale={
                      false
                    }
                  >
                    <MiniSla
                      value={
                        warningItems.length
                      }
                      label="Atenção"
                      dot="bg-warning"
                    />
                  </MotionStaggerItem>

                  <MotionStaggerItem
                    scale={
                      false
                    }
                  >
                    <MiniSla
                      value={
                        overdueItems.length
                      }
                      label="Atrasado"
                      dot="bg-error"
                    />
                  </MotionStaggerItem>
                </MotionStagger>
              </div>
            </section>
          </MotionSurface>
        </MotionStaggerItem>
      </MotionStagger>

      {/* =====================================================
          CENTRAL DE ATENÇÃO
      ====================================================== */}

      <MotionReveal
        delay={
          0.06
        }
      >
        <section className="mt-4">
          <Link
            href="/pendencias"
            className={[
              "group block overflow-hidden rounded-[18px] border transition-all",
              pendingSummary.status ===
              "critical"
                ? "border-red-200/80 bg-red-50/65 hover:border-red-300/80"
                : pendingSummary.status ===
                    "attention"
                  ? "border-amber-200/80 bg-amber-50/70 hover:border-amber-300/80"
                  : "border-emerald-200/70 bg-emerald-50/55 hover:border-emerald-300/80",
            ].join(
              " "
            )}
          >
            <div className="flex flex-col gap-4 px-5 py-4 xl:flex-row xl:items-center">
              <MotionStatus
                pulse={
                  criticalCount >
                  0
                }
              >
                <div
                  className={[
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    criticalCount >
                    0
                      ? "bg-error/10 text-error"
                      : attentionCount >
                          0
                        ? "bg-warning/10 text-warning"
                        : "bg-success/10 text-success",
                  ].join(
                    " "
                  )}
                >
                  {pendingCount >
                  0 ? (
                    <AlertTriangle
                      size={
                        18
                      }
                    />
                  ) : (
                    <CheckCircle2
                      size={
                        18
                      }
                    />
                  )}
                </div>
              </MotionStatus>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[12px] font-[700] text-base-content/75">
                    {pendingCount >
                    0 ? (
                      <>
                        <AnimatedNumber
                          value={
                            pendingCount
                          }
                          className="font-[750]"
                        />{" "}
                        pendência
                        {pendingCount ===
                        1
                          ? ""
                          : "s"}{" "}
                        operacional
                        {pendingCount ===
                        1
                          ? ""
                          : "is"}
                      </>
                    ) : (
                      "Operação sem pendências"
                    )}
                  </p>

                  {criticalCount >
                    0 && (
                    <span className="badge badge-error badge-sm">
                      {criticalCount} críticas
                    </span>
                  )}

                  {attentionCount >
                    0 && (
                    <span className="badge badge-warning badge-sm">
                      {attentionCount} em atenção
                    </span>
                  )}
                </div>

                <p className="mt-1 text-[10px] font-[450] text-base-content/40">
                  {pendingCount >
                  0
                    ? "Resumo consolidado da Central de Pendências."
                    : "Os monitores atuais não identificaram pontos pendentes."}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 xl:justify-end">
                {pendingCategories.sla >
                  0 && (
                  <SummaryChip
                    label="SLA"
                    value={
                      pendingCategories.sla
                    }
                    variant="error"
                  />
                )}

                {pendingCategories.deliveries >
                  0 && (
                  <SummaryChip
                    label="Entregas"
                    value={
                      pendingCategories.deliveries
                    }
                    variant="error"
                  />
                )}

                {pendingCategories.warning >
                  0 && (
                  <SummaryChip
                    label="Atenção SLA"
                    value={
                      pendingCategories.warning
                    }
                    variant="warning"
                  />
                )}

                {pendingCategories.unmatched >
                  0 && (
                  <SummaryChip
                    label="Vínculos"
                    value={
                      pendingCategories.unmatched
                    }
                    variant="warning"
                  />
                )}

                {pendingCategories.alerts >
                  0 && (
                  <SummaryChip
                    label="Alertas"
                    value={
                      pendingCategories.alerts
                    }
                    variant={
                      pendingCategories.alertErrors >
                      0
                        ? "error"
                        : "warning"
                    }
                  />
                )}
              </div>

              <ArrowRight
                size={
                  15
                }
                className="hidden shrink-0 text-base-content/20 transition group-hover:translate-x-1 group-hover:text-primary xl:block"
              />
            </div>
          </Link>
        </section>
      </MotionReveal>

      {/* =====================================================
          FLUXO
      ====================================================== */}

      <MotionReveal
        delay={
          0.08
        }
      >
        <section className="projeta-panel mt-6">
          <div className="relative z-10">
            <div className="flex flex-col gap-3 border-b border-base-300/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <div className="flex items-center gap-2">
                  <Activity
                    size={
                      13
                    }
                    className="text-primary"
                  />

                  <p className="projeta-section-label">
                    Jornada de compra
                  </p>
                </div>

                <h2 className="mt-2 text-[15px] font-[650] tracking-[-0.025em]">
                  Fluxo das solicitações
                </h2>

                <p className="mt-1 text-[10px] font-[450] text-base-content/40">
                  Clique em uma etapa para abrir a operação.
                </p>
              </div>

              <Link
                href={
                  operationHref
                }
                className="btn btn-ghost btn-sm gap-2 self-start text-[10px] text-base-content/45 sm:self-auto"
              >
                Abrir detalhes

                <ArrowUpRight
                  size={
                    13
                  }
                />
              </Link>
            </div>

            <div className="overflow-x-auto px-5 py-7 sm:px-6">
              <div className="min-w-[820px]">
                <MotionStagger
                  className="grid grid-cols-7"
                  delay={
                    0.1
                  }
                  stagger={
                    0.08
                  }
                >
                  {flowData.map(
                    (
                      item,
                      index
                    ) => (
                      <MotionStaggerItem
                        key={
                          item.key
                        }
                      >
                        <FlowStage
                          label={
                            item.shortLabel
                          }
                          fullLabel={
                            item.label
                          }
                          count={
                            item.count
                          }
                          statusKey={
                            item.key
                          }
                          first={
                            index ===
                            0
                          }
                          last={
                            index ===
                            flowData.length -
                            1
                          }
                          delay={
                            index *
                            0.07
                          }
                          href={
                            operationHref
                          }
                        />
                      </MotionStaggerItem>
                    )
                  )}
                </MotionStagger>
              </div>
            </div>
          </div>
        </section>
      </MotionReveal>

      {/* =====================================================
          PENDÊNCIAS + ATIVIDADE
      ====================================================== */}

      <MotionStagger
        className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
        stagger={
          0.09
        }
      >
        {/* ===================================================
            CENTRAL DE PENDÊNCIAS
        ==================================================== */}

        <MotionStaggerItem>
          <MotionSurface
            interactive={
              false
            }
            className="h-full"
          >
            <section className="projeta-panel h-full">
              <div className="relative z-10">
                <div className="border-b border-base-300/70 px-5 py-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="projeta-section-label">
                        Central de atenção
                      </p>

                      <h2 className="mt-2 text-[15px] font-[650] tracking-[-0.025em]">
                        Composição das pendências
                      </h2>
                    </div>

                    <div className="indicator">
                      {pendingCount >
                        0 && (
                        <span
                          className={[
                            "indicator-item badge badge-xs",
                            criticalCount >
                            0
                              ? "badge-error"
                              : "badge-warning",
                          ].join(
                            " "
                          )}
                        >
                          {pendingCount}
                        </span>
                      )}

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-base-200 text-base-content/30">
                        <ListTodo
                          size={
                            16
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {pendingCount >
                    0 && (
                    <div className="mt-4 grid grid-cols-3 divide-x divide-base-300 rounded-xl border border-base-300/70 bg-base-200/25 py-3">
                      <PendingMiniMetric
                        label="Total"
                        value={
                          pendingCount
                        }
                        tone="neutral"
                      />

                      <PendingMiniMetric
                        label="Críticas"
                        value={
                          criticalCount
                        }
                        tone="error"
                      />

                      <PendingMiniMetric
                        label="Atenção"
                        value={
                          attentionCount
                        }
                        tone="warning"
                      />
                    </div>
                  )}
                </div>

                {pendingCount ===
                0 ? (
                  <div className="projeta-empty min-h-[340px]">
                    <MotionStatus>
                      <div className="projeta-empty-icon bg-success/5 text-success">
                        <Check
                          size={
                            21
                          }
                        />
                      </div>
                    </MotionStatus>

                    <p className="mt-4 text-[13px] font-[650]">
                      Operação em dia
                    </p>

                    <p className="mt-1 max-w-[260px] text-[10px] leading-5 text-base-content/40">
                      Nenhuma pendência foi identificada.
                    </p>
                  </div>
                ) : (
                  <MotionList
                    className="p-2"
                    stagger={
                      0.055
                    }
                  >
                    <MotionListItem>
                      <AttentionItem
                        icon={
                          Clock3
                        }
                        title="SLA vencido"
                        description="Solicitações que ultrapassaram o prazo."
                        value={
                          pendingCategories.sla
                        }
                        href={
                          operationHref
                        }
                        variant="error"
                      />
                    </MotionListItem>

                    <MotionListItem>
                      <AttentionItem
                        icon={
                          Truck
                        }
                        title="Entregas vencidas"
                        description="Previsão de entrega ou retirada ultrapassada."
                        value={
                          pendingCategories.deliveries
                        }
                        href={
                          operationHref
                        }
                        variant="error"
                      />
                    </MotionListItem>

                    <MotionListItem>
                      <AttentionItem
                        icon={
                          AlertTriangle
                        }
                        title="SLA em atenção"
                        description="Solicitações próximas do limite operacional."
                        value={
                          pendingCategories.warning
                        }
                        href={
                          operationHref
                        }
                        variant="warning"
                      />
                    </MotionListItem>

                    {canFinance && (
                      <MotionListItem>
                        <AttentionItem
                          icon={
                            UserRoundX
                          }
                          title="Usuários sem vínculo"
                          description="Identificadores Sienge ainda não associados."
                          value={
                            pendingCategories.unmatched
                          }
                          href="/financeiro/sienge?tab=usuarios"
                          variant="warning"
                        />
                      </MotionListItem>
                    )}

                    <MotionListItem>
                      <AttentionItem
                        icon={
                          Bell
                        }
                        title="Alertas não lidos"
                        description={
                          pendingCategories.alertErrors >
                          0
                            ? `${pendingCategories.alertErrors} alerta(s) crítico(s) entre os não lidos.`
                            : "Avisos operacionais aguardando análise."
                        }
                        value={
                          pendingCategories.alerts
                        }
                        href="/notificacoes?filtro=nao-lidas"
                        variant={
                          pendingCategories.alertErrors >
                          0
                            ? "error"
                            : "warning"
                        }
                      />
                    </MotionListItem>

                    <MotionListItem>
                      <div className="mt-1 border-t border-base-300/70 p-2 pt-3">
                        <Link
                          href="/pendencias"
                          className="group flex h-10 items-center justify-center gap-2 rounded-xl text-[10px] font-[650] text-base-content/45 transition hover:bg-base-200 hover:text-base-content"
                        >
                          Abrir Central de Pendências

                          <ChevronRight
                            size={
                              13
                            }
                            className="transition group-hover:translate-x-0.5"
                          />
                        </Link>
                      </div>
                    </MotionListItem>
                  </MotionList>
                )}
              </div>
            </section>
          </MotionSurface>
        </MotionStaggerItem>

        {/* ===================================================
            ATIVIDADE
        ==================================================== */}

        <MotionStaggerItem>
          <MotionSurface
            interactive={
              false
            }
            className="h-full"
          >
            <section className="projeta-panel h-full">
              <div className="relative z-10">
                <div className="flex items-center justify-between gap-4 border-b border-base-300/70 px-5 py-5 sm:px-6">
                  <div>
                    <p className="projeta-section-label">
                      Timeline
                    </p>

                    <h2 className="mt-2 text-[15px] font-[650] tracking-[-0.025em]">
                      Atividade recente
                    </h2>
                  </div>

                  <Link
                    href="/notificacoes"
                    className="group flex items-center gap-1.5 text-[9px] font-[650] text-base-content/35 transition hover:text-primary"
                  >
                    Histórico

                    <ArrowRight
                      size={
                        12
                      }
                    />
                  </Link>
                </div>

                {recentActivity.length ===
                0 ? (
                  <div className="projeta-empty min-h-[340px]">
                    <div className="projeta-empty-icon">
                      <Activity
                        size={
                          21
                        }
                      />
                    </div>

                    <p className="mt-4 text-[13px] font-[650]">
                      Sem atividade recente
                    </p>
                  </div>
                ) : (
                  <MotionList
                    className="px-5 py-2 sm:px-6"
                    stagger={
                      0.065
                    }
                  >
                    {recentActivity.map(
                      (
                        activity,
                        index
                      ) => (
                        <MotionListItem
                          key={
                            activity.id
                          }
                        >
                          <TimelineActivity
                            activity={
                              activity
                            }
                            last={
                              index ===
                              recentActivity.length -
                              1
                            }
                          />
                        </MotionListItem>
                      )
                    )}
                  </MotionList>
                )}
              </div>
            </section>
          </MotionSurface>
        </MotionStaggerItem>
      </MotionStagger>

      {/* =====================================================
          PERFORMANCE + AÇÕES
      ====================================================== */}

      <MotionStagger
        className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]"
        stagger={
          0.09
        }
      >
        {/* ===================================================
            PERFORMANCE
        ==================================================== */}

        <MotionStaggerItem>
          <MotionSurface
            interactive={
              false
            }
            className="h-full"
          >
            <section className="projeta-panel h-full">
              <div className="relative z-10 p-5 sm:p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="projeta-section-label">
                      Performance
                    </p>

                    <h2 className="mt-2 text-[15px] font-[650]">
                      Distribuição do SLA
                    </h2>

                    <p className="mt-1 text-[10px] text-base-content/40">
                      Composição dos itens monitorados atualmente.
                    </p>
                  </div>

                  <MotionStatus>
                    <span
                      className={[
                        "badge badge-sm",
                        onTimeRate >=
                        80
                          ? "badge-success"
                          : onTimeRate >=
                              60
                            ? "badge-warning"
                            : "badge-error",
                      ].join(
                        " "
                      )}
                    >
                      {getSlaLabel(
                        onTimeRate
                      )}
                    </span>
                  </MotionStatus>
                </div>

                <div className="mt-7 rounded-[16px] border border-base-300/70 bg-base-200/20 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[9px] font-[650] text-base-content/45">
                      Índice de cumprimento
                    </p>

                    <AnimatedNumber
                      value={
                        onTimeRate
                      }
                      suffix="%"
                      className={[
                        "text-[20px] font-[750]",
                        getSlaTextColor(
                          onTimeRate
                        ),
                      ].join(
                        " "
                      )}
                    />
                  </div>

                  <AnimatedProgress
                    value={
                      onTimeRate
                    }
                    duration={
                      0.95
                    }
                    height={
                      8
                    }
                    barClassName={
                      getSlaBarColor(
                        onTimeRate
                      )
                    }
                    showGlow
                  />
                </div>

                <MotionStagger
                  className="mt-5 grid gap-3 sm:grid-cols-3"
                  stagger={
                    0.08
                  }
                >
                  <MotionStaggerItem>
                    <PerformanceItem
                      label="Dentro do prazo"
                      value={
                        onTimeItems.length
                      }
                      percentage={
                        onTimeRate
                      }
                      dot="bg-success"
                      barClassName="bg-success"
                    />
                  </MotionStaggerItem>

                  <MotionStaggerItem>
                    <PerformanceItem
                      label="Em atenção"
                      value={
                        warningItems.length
                      }
                      percentage={
                        warningRate
                      }
                      dot="bg-warning"
                      barClassName="bg-warning"
                    />
                  </MotionStaggerItem>

                  <MotionStaggerItem>
                    <PerformanceItem
                      label="Atrasados"
                      value={
                        overdueItems.length
                      }
                      percentage={
                        overdueRate
                      }
                      dot="bg-error"
                      barClassName="bg-error"
                    />
                  </MotionStaggerItem>
                </MotionStagger>
              </div>
            </section>
          </MotionSurface>
        </MotionStaggerItem>

        {/* ===================================================
            QUICK ACTIONS
        ==================================================== */}

        <MotionStaggerItem>
          <MotionSurface
            interactive={
              false
            }
            className="h-full"
          >
            <section className="h-full overflow-hidden rounded-[22px] border border-base-300 bg-base-100">
              <div className="border-b border-base-300/70 px-5 py-5">
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={
                      13
                    }
                    className="text-primary"
                  />

                  <p className="projeta-section-label">
                    Comandos
                  </p>
                </div>

                <h2 className="mt-2 text-[15px] font-[650]">
                  Ações rápidas
                </h2>
              </div>

              <MotionList
                className="grid sm:grid-cols-2 xl:grid-cols-1"
              >
                <MotionListItem>
                  <CommandAction
                    icon={
                      Send
                    }
                    title="Solicitar cartão"
                    description="Iniciar nova solicitação"
                    href="/solicitacoes/nova"
                    primary
                  />
                </MotionListItem>

                <MotionListItem>
                  <CommandAction
                    icon={
                      PackageSearch
                    }
                    title="Consultar pedidos"
                    description="Acompanhar solicitações"
                    href="/meus-pedidos"
                  />
                </MotionListItem>

                <MotionListItem>
                  <CommandAction
                    icon={
                      RotateCcw
                    }
                    title="Registrar devolução"
                    description="Iniciar prestação de cartão"
                    href="/devolucoes"
                  />
                </MotionListItem>

                <MotionListItem>
                  <CommandAction
                    icon={
                      ListTodo
                    }
                    title="Central de Pendências"
                    description={`${pendingCount} total · ${criticalCount} críticas`}
                    href="/pendencias"
                  />
                </MotionListItem>

                {canFinance && (
                  <MotionListItem>
                    <CommandAction
                      icon={
                        FileSpreadsheet
                      }
                      title="Acompanhamento Sienge"
                      description="Gestão completa"
                      href="/financeiro/sienge"
                    />
                  </MotionListItem>
                )}

                {canFinance && (
                  <MotionListItem>
                    <CommandAction
                      icon={
                        WalletCards
                      }
                      title="Financeiro"
                      description="Gerenciar solicitações"
                      href="/financeiro/solicitacoes"
                    />
                  </MotionListItem>
                )}

                {canAdmin && (
                  <MotionListItem>
                    <CommandAction
                      icon={
                        UsersRound
                      }
                      title="Usuários e acessos"
                      description="Permissões e segurança"
                      href="/administracao/usuarios"
                    />
                  </MotionListItem>
                )}
              </MotionList>
            </section>
          </MotionSurface>
        </MotionStaggerItem>
      </MotionStagger>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="mt-7 flex flex-col gap-2 border-t border-base-300/60 py-5 text-[8px] font-[550] text-base-content/25 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="status status-success status-xs" />

          Dados sincronizados com a operação
        </div>

        <span className="uppercase tracking-[0.14em]">
          Projeta Compras OS
        </span>
      </footer>
    </main>
  );
}

// ============================================================
// COCKPIT METRIC
// ============================================================

function CockpitMetric({
  value,
  suffix = "",
  label,
  hint,
  delay = 0,
  href,
}: {
  value: number;

  suffix?: string;

  label: string;

  hint: string;

  delay?: number;

  href: string;
}) {
  return (
    <Link
      href={
        href
      }
      className="group block rounded-xl px-4 py-2 first:ml-0"
    >
      <div className="flex items-start justify-between">
        <AnimatedNumber
          value={
            value
          }
          suffix={
            suffix
          }
          delay={
            delay
          }
          className="text-[23px] font-[750] tracking-[-0.045em] text-white"
        />

        <ArrowUpRight
          size={
            10
          }
          className="mt-1 text-white/0 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/30"
        />
      </div>

      <p className="mt-1 text-[9px] font-[650] text-white/55">
        {label}
      </p>

      <p className="mt-0.5 hidden text-[8px] text-white/25 sm:block">
        {hint}
      </p>
    </Link>
  );
}

// ============================================================
// OPERATION SIGNAL
// ============================================================

function OperationSignal({
  color,
  value,
  label,
  delay = 0,
}: {
  color: string;

  value: number;

  label: string;

  delay?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          color,
        ].join(
          " "
        )}
      />

      <p className="text-[9px] text-white/35">
        <AnimatedNumber
          value={
            value
          }
          delay={
            delay
          }
          className="font-[700] text-white/65"
        />{" "}
        {label}
      </p>
    </div>
  );
}

// ============================================================
// MINI SLA
// ============================================================

function MiniSla({
  value,
  label,
  dot,
}: {
  value: number;

  label: string;

  dot: string;
}) {
  return (
    <div className="px-3 text-center">
      <div className="flex items-center justify-center gap-1.5">
        <span
          className={[
            "h-1.5 w-1.5 rounded-full",
            dot,
          ].join(
            " "
          )}
        />

        <AnimatedNumber
          value={
            value
          }
          className="text-[16px] font-[700]"
        />
      </div>

      <p className="mt-1 text-[8px] text-base-content/35">
        {label}
      </p>
    </div>
  );
}

// ============================================================
// SUMMARY CHIP
// ============================================================

function SummaryChip({
  label,
  value,
  variant,
}: {
  label: string;

  value: number;

  variant:
    | "warning"
    | "error";
}) {
  return (
    <div
      className={[
        "flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
        variant ===
        "error"
          ? "border-red-200/70 bg-white/55 text-error"
          : "border-amber-200/70 bg-white/55 text-warning",
      ].join(
        " "
      )}
    >
      <AnimatedNumber
        value={
          value
        }
        className="text-[10px] font-[750]"
      />

      <span className="text-[8px] font-[650] text-base-content/40">
        {label}
      </span>
    </div>
  );
}

// ============================================================
// PENDING MINI METRIC
// ============================================================

function PendingMiniMetric({
  label,
  value,
  tone,
}: {
  label: string;

  value: number;

  tone:
    | "neutral"
    | "warning"
    | "error";
}) {
  return (
    <div className="text-center">
      <AnimatedNumber
        value={
          value
        }
        className={[
          "text-[17px] font-[750]",
          tone ===
          "error"
            ? "text-error"
            : tone ===
                "warning"
              ? "text-warning"
              : "text-base-content/70",
        ].join(
          " "
        )}
      />

      <p className="mt-1 text-[8px] font-[600] uppercase tracking-[0.08em] text-base-content/30">
        {label}
      </p>
    </div>
  );
}

// ============================================================
// FLOW STAGE
// ============================================================

function FlowStage({
  label,
  fullLabel,
  count,
  statusKey,
  first,
  last,
  delay = 0,
  href,
}: {
  label: string;

  fullLabel: string;

  count: number;

  statusKey: string;

  first: boolean;

  last: boolean;

  delay?: number;

  href: string;
}) {
  const tone =
    getFlowTone(
      statusKey
    );

  const active =
    count >
    0;

  return (
    <Link
      href={
        href
      }
      className="group relative block px-2 text-center"
    >
      {!first && (
        <div className="absolute left-0 right-1/2 top-[22px] h-[2px] bg-base-300/80" />
      )}

      {!last && (
        <div className="absolute left-1/2 right-0 top-[22px] h-[2px] bg-base-300/80" />
      )}

      <div
        className="tooltip"
        data-tip={
          fullLabel
        }
      >
        <div
          className={[
            "relative z-10 mx-auto flex h-11 w-11 items-center justify-center rounded-[14px] border text-[13px] font-[750] transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-md",
            active
              ? `${tone.background} ${tone.text} ${tone.border}`
              : "border-base-300 bg-base-100 text-base-content/25",
          ].join(
            " "
          )}
        >
          <AnimatedNumber
            value={
              count
            }
            delay={
              delay
            }
            className="font-[750]"
          />

          {active && (
            <span
              className={[
                "absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-base-100",
                tone.dot,
              ].join(
                " "
              )}
            />
          )}
        </div>
      </div>

      <p
        className={[
          "mt-3 text-[9px] font-[650] transition group-hover:text-primary",
          active
            ? "text-base-content/65"
            : "text-base-content/30",
        ].join(
          " "
        )}
      >
        {label}
      </p>

      <p className="mt-1 text-[7px] uppercase tracking-[0.1em] text-base-content/20">
        {active
          ? "Ativo"
          : "Sem itens"}
      </p>
    </Link>
  );
}

// ============================================================
// ATTENTION ITEM
// ============================================================

function AttentionItem({
  icon: Icon,
  title,
  description,
  value,
  href,
  variant,
}: {
  icon: LucideIcon;

  title: string;

  description: string;

  value: number;

  href: string;

  variant:
    | "warning"
    | "error";
}) {
  const danger =
    variant ===
    "error";

  return (
    <Link
      href={
        href
      }
      className="group flex items-center gap-3 rounded-[15px] px-3 py-3.5 transition hover:bg-base-200/70"
    >
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          value ===
          0
            ? "bg-base-200 text-base-content/25"
            : danger
              ? "bg-error/10 text-error"
              : "bg-warning/10 text-warning",
        ].join(
          " "
        )}
      >
        <Icon
          size={
            16
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-[650] text-base-content/70">
          {title}
        </p>

        <p className="mt-1 truncate text-[9px] text-base-content/35">
          {description}
        </p>
      </div>

      <AnimatedNumber
        value={
          value
        }
        className={[
          "text-[15px] font-[750]",
          value ===
          0
            ? "text-base-content/20"
            : danger
              ? "text-error"
              : "text-warning",
        ].join(
          " "
        )}
      />

      <ChevronRight
        size={
          13
        }
        className="text-base-content/15 transition group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </Link>
  );
}

// ============================================================
// TIMELINE
// ============================================================

function TimelineActivity({
  activity,
  last,
}: {
  activity: NotificationRow;

  last: boolean;
}) {
  const href =
    activity.action_url &&
    activity.action_url.startsWith(
      "/"
    )
      ? activity.action_url
      : "/notificacoes";

  const tone =
    getActivityTone(
      activity.level
    );

  return (
    <Link
      href={
        href
      }
      className="group relative flex gap-4 py-4"
    >
      <div className="relative flex w-7 shrink-0 justify-center">
        {!last && (
          <div className="absolute bottom-[-16px] top-[10px] w-px bg-base-300" />
        )}

        <span
          className={[
            "relative z-10 mt-1 h-2.5 w-2.5 rounded-full border-2 border-base-100 ring-2",
            tone.dot,
            tone.ring,
          ].join(
            " "
          )}
        />
      </div>

      <div className="min-w-0 flex-1 border-b border-base-300/50 pb-4">
        <div className="flex justify-between gap-4">
          <p className="text-[11px] font-[650] leading-5 text-base-content/70">
            {activity.title}
          </p>

          <span className="shrink-0 text-[8px] text-base-content/25">
            {formatRelativeTime(
              activity.created_at
            )}
          </span>
        </div>

        {activity.message && (
          <p className="mt-1 line-clamp-2 text-[9px] leading-[17px] text-base-content/38">
            {activity.message}
          </p>
        )}
      </div>
    </Link>
  );
}

// ============================================================
// PERFORMANCE
// ============================================================

function PerformanceItem({
  label,
  value,
  percentage,
  dot,
  barClassName,
}: {
  label: string;

  value: number;

  percentage: number;

  dot: string;

  barClassName: string;
}) {
  return (
    <div className="projeta-interactive rounded-[15px] border border-base-300/80 bg-base-200/25 p-4">
      <div className="flex items-center gap-2">
        <span
          className={[
            "h-2 w-2 rounded-full",
            dot,
          ].join(
            " "
          )}
        />

        <p className="text-[9px] text-base-content/40">
          {label}
        </p>
      </div>

      <div className="mt-4 flex items-end justify-between">
        <AnimatedNumber
          value={
            value
          }
          className="text-[23px] font-[750]"
        />

        <AnimatedNumber
          value={
            percentage
          }
          suffix="%"
          className="text-[10px] font-[700] text-base-content/35"
        />
      </div>

      <div className="mt-4">
        <AnimatedProgress
          value={
            percentage
          }
          height={
            5
          }
          barClassName={
            barClassName
          }
        />
      </div>
    </div>
  );
}

// ============================================================
// COMMAND ACTION
// ============================================================

function CommandAction({
  icon: Icon,
  title,
  description,
  href,
  primary = false,
}: {
  icon: LucideIcon;

  title: string;

  description: string;

  href: string;

  primary?: boolean;
}) {
  return (
    <Link
      href={
        href
      }
      className={[
        "group flex items-center gap-3 border-b border-base-300/60 px-5 py-4 transition",
        primary
          ? "bg-primary/[0.035] hover:bg-primary/[0.065]"
          : "hover:bg-base-200/60",
      ].join(
        " "
      )}
    >
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-xl",
          primary
            ? "bg-primary text-white"
            : "bg-base-200 text-base-content/40 group-hover:text-primary",
        ].join(
          " "
        )}
      >
        <Icon
          size={
            15
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-[650] text-base-content/70">
          {title}
        </p>

        <p className="mt-0.5 truncate text-[9px] text-base-content/35">
          {description}
        </p>
      </div>

      <ArrowUpRight
        size={
          13
        }
        className="text-base-content/15 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </Link>
  );
}

// ============================================================
// FLOW TONE
// ============================================================

function getFlowTone(
  key: string
) {
  switch (
    key
  ) {
    case "Em cotação":
      return {
        background:
          "bg-orange-50",

        text:
          "text-orange-600",

        border:
          "border-orange-200",

        dot:
          "bg-orange-500",
      };

    case "Em aprovação":
      return {
        background:
          "bg-amber-50",

        text:
          "text-amber-700",

        border:
          "border-amber-200",

        dot:
          "bg-amber-500",
      };

    case "Compra realizada":
    case "Compra via cartão":
      return {
        background:
          "bg-violet-50",

        text:
          "text-violet-700",

        border:
          "border-violet-200",

        dot:
          "bg-violet-500",
      };

    case "delivery":
      return {
        background:
          "bg-blue-50",

        text:
          "text-blue-700",

        border:
          "border-blue-200",

        dot:
          "bg-blue-500",
      };

    case "Entregue":
      return {
        background:
          "bg-emerald-50",

        text:
          "text-emerald-700",

        border:
          "border-emerald-200",

        dot:
          "bg-emerald-500",
      };

    default:
      return {
        background:
          "bg-slate-50",

        text:
          "text-slate-600",

        border:
          "border-slate-200",

        dot:
          "bg-slate-400",
      };
  }
}

// ============================================================
// ACTIVITY
// ============================================================

function getActivityTone(
  level: string
) {
  switch (
    level
  ) {
    case "success":
      return {
        dot:
          "bg-success",

        ring:
          "ring-success/15",
      };

    case "warning":
      return {
        dot:
          "bg-warning",

        ring:
          "ring-warning/15",
      };

    case "error":
      return {
        dot:
          "bg-error",

        ring:
          "ring-error/15",
      };

    default:
      return {
        dot:
          "bg-info",

        ring:
          "ring-info/15",
      };
  }
}

// ============================================================
// SLA
// ============================================================

function getSlaTextColor(
  value: number
) {
  if (
    value >=
    80
  ) {
    return "text-success";
  }

  if (
    value >=
    60
  ) {
    return "text-warning";
  }

  return "text-error";
}

function getSlaBarColor(
  value: number
) {
  if (
    value >=
    80
  ) {
    return "bg-success";
  }

  if (
    value >=
    60
  ) {
    return "bg-warning";
  }

  return "bg-error";
}

function getSlaLabel(
  value: number
) {
  if (
    value >=
    90
  ) {
    return "Excelente";
  }

  if (
    value >=
    80
  ) {
    return "Saudável";
  }

  if (
    value >=
    60
  ) {
    return "Em atenção";
  }

  return "Crítico";
}

// ============================================================
// DATA
// ============================================================

function formatCurrentDate() {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      weekday:
        "long",

      day:
        "2-digit",

      month:
        "long",
    }
  ).format(
    new Date()
  );
}

// ============================================================
// TEMPO
// ============================================================

function formatRelativeTime(
  value: string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "agora";
  }

  const difference =
    Math.max(
      0,
      Date.now() -
        date.getTime()
    );

  const minutes =
    Math.floor(
      difference /
        60000
    );

  if (
    minutes <
    1
  ) {
    return "agora";
  }

  if (
    minutes <
    60
  ) {
    return `há ${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes /
        60
    );

  if (
    hours <
    24
  ) {
    return `há ${hours}h`;
  }

  const days =
    Math.floor(
      hours /
        24
    );

  if (
    days ===
    1
  ) {
    return "ontem";
  }

  return `há ${days} dias`;
}