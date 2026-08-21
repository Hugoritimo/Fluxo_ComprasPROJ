import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  PackageCheck,
  PackageSearch,
  Plus,
  RotateCcw,
  Send,
  ShoppingCart,
  TrendingUp,
  UserRoundX,
  UsersRound,
  WalletCards,
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

import QuickAction from "@/components/ui/projeta/quick-action";

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
    key:
      "Solicitação recebida",
  },
  {
    label:
      "Em cotação",
    key:
      "Em cotação",
  },
  {
    label:
      "Em aprovação",
    key:
      "Em aprovação",
  },
  {
    label:
      "Compra realizada",
    key:
      "Compra realizada",
  },
  {
    label:
      "Cartão",
    key:
      "Compra via cartão",
  },
  {
    label:
      "Entrega / Retirada",
    key:
      "delivery",
  },
  {
    label:
      "Entregue",
    key:
      "Entregue",
  },
];

// ============================================================
// PÁGINA
// ============================================================

export default async function DashboardPage() {
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
  // PERFIL / FUNÇÕES
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
      (item) =>
        item.role
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

  const slaPromise =
    supabase
      .from(
        "v_sienge_item_sla"
      )
      .select(
        `
        item_id,
        sc_number,
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
        6
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
    notificationSummaryResult.data ??
    [];

  // =========================================================
  // MÉTRICAS
  // =========================================================

  const totalRequests =
    requests.length;

  const delivered =
    requests.filter(
      (item) =>
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
      (item) =>
        item.sla_status ===
        "on_time"
    );

  const warningItems =
    slaRows.filter(
      (item) =>
        item.sla_status ===
        "warning"
    );

  const overdueItems =
    slaRows.filter(
      (item) =>
        item.sla_status ===
        "overdue"
    );

  const activeSlaItems =
    slaRows.filter(
      (item) =>
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

  const overdueScs =
    new Set(
      overdueItems
        .map(
          (item) =>
            item.sc_number
        )
        .filter(Boolean)
    );

  // =========================================================
  // USUÁRIOS NÃO VINCULADOS
  // =========================================================

  const unmatchedUsers =
    canFinance
      ? new Set(
          siengeRows
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
        ).size
      : 0;

  // =========================================================
  // ALERTAS
  // =========================================================

  const unreadWarnings =
    notificationSummary.filter(
      (item) =>
        !item.read_at &&
        (
          item.level ===
            "warning" ||
          item.level ===
            "error"
        )
    ).length;

  const pendingCount =
    overdueScs.size +
    unmatchedUsers +
    unreadWarnings;

  // =========================================================
  // FLUXO
  // =========================================================

  const flowData =
    flowStatuses.map(
      (statusItem) => {
        const count =
          statusItem.key ===
          "delivery"
            ? requests.filter(
                (request) =>
                  request.tracking_status ===
                    "Disponível para retirada" ||
                  request.tracking_status ===
                    "Em processo de entrega"
              ).length
            : requests.filter(
                (request) =>
                  request.tracking_status ===
                  statusItem.key
              ).length;

        return {
          ...statusItem,
          count,
        };
      }
    );

  const maxFlow =
    Math.max(
      1,
      ...flowData.map(
        (item) =>
          item.count
      )
    );

  // =========================================================
  // USUÁRIO
  // =========================================================

  const fullName =
    profile?.full_name?.trim() ||
    "Usuário";

  const firstName =
    fullName.split(
      /\s+/
    )[0];

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
          eyebrow="Visão geral"
          title={`Olá, ${firstName}.`}
          description="Acompanhe o panorama das solicitações, compras, entregas e pontos que precisam da sua atenção."
          actions={
            <>
              <Link
                href="/meus-pedidos"
                className="btn btn-ghost btn-sm h-10 rounded-xl border border-base-300 bg-base-100 px-4"
              >
                <PackageSearch
                  size={15}
                />

                Meus pedidos
              </Link>

              <Link
                href="/solicitacoes/nova"
                className="btn btn-primary btn-sm h-10 rounded-xl px-4 shadow-[0_8px_22px_rgba(175,27,27,0.14)]"
              >
                <Plus
                  size={16}
                />

                Nova solicitação
              </Link>
            </>
          }
        />
      </MotionReveal>

      {/* =====================================================
          BLOCO PRINCIPAL
      ====================================================== */}

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.45fr_0.55fr]">
        {/* OPERAÇÃO */}

        <MotionReveal
          delay={0.04}
        >
          <section className="relative h-full overflow-hidden rounded-[24px] border border-base-300/80 bg-[#171717] p-6 text-white sm:p-7">
            {/* DECORAÇÃO */}

            <div className="pointer-events-none absolute -right-28 -top-28 h-80 w-80 rounded-full bg-primary/20 blur-[90px]" />

            <div className="pointer-events-none absolute bottom-[-100px] left-[20%] h-56 w-56 rounded-full bg-white/[0.035] blur-[80px]" />

            <div className="relative">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-white/35">
                    Operação de compras
                  </p>

                  <p className="mt-4 text-5xl font-semibold tracking-[-0.055em]">
                    {totalRequests}
                  </p>

                  <p className="mt-2 text-sm font-medium text-white/70">
                    solicitações acompanhadas
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/65">
                  <ShoppingCart
                    size={19}
                  />
                </div>
              </div>

              <div className="mt-9 grid gap-3 sm:grid-cols-3">
                <DarkMetric
                  label="Em andamento"
                  value={
                    inProgress
                  }
                />

                <DarkMetric
                  label="Entregues"
                  value={
                    delivered
                  }
                />

                <DarkMetric
                  label="Conclusão"
                  value={`${completionRate}%`}
                />
              </div>
            </div>
          </section>
        </MotionReveal>

        {/* LATERAL */}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
          <MotionCard
            delay={0.08}
          >
            <MetricCard
              icon={
                AlertTriangle
              }
              label="Pendências"
              value={
                pendingCount
              }
              description={
                pendingCount >
                0
                  ? "Itens que precisam de acompanhamento"
                  : "Nenhum ponto crítico identificado"
              }
              variant={
                pendingCount >
                0
                  ? "warning"
                  : "success"
              }
            />
          </MotionCard>

          <MotionCard
            delay={0.12}
          >
            <MetricCard
              icon={
                TrendingUp
              }
              label="Dentro do SLA"
              value={`${onTimeRate}%`}
              description={`${overdueRate}% dos itens ativos estão atrasados`}
              variant={
                overdueRate >
                20
                  ? "warning"
                  : "success"
              }
            />
          </MotionCard>
        </div>
      </div>

      {/* =====================================================
          MÉTRICAS SECUNDÁRIAS
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MotionCard
          delay={0.08}
        >
          <MetricCard
            icon={
              Clock3
            }
            label="Em andamento"
            value={
              inProgress
            }
            description="Solicitações ainda não concluídas"
            variant="info"
          />
        </MotionCard>

        <MotionCard
          delay={0.12}
        >
          <MetricCard
            icon={
              PackageCheck
            }
            label="Entregues"
            value={
              delivered
            }
            description={`${completionRate}% do total acompanhado`}
            variant="success"
          />
        </MotionCard>

        <MotionCard
          delay={0.16}
        >
          <MetricCard
            icon={
              Activity
            }
            label="Em atenção"
            value={
              warningItems.length
            }
            description="Itens próximos do limite de SLA"
            variant={
              warningItems.length >
              0
                ? "warning"
                : "neutral"
            }
          />
        </MotionCard>
      </div>

      {/* =====================================================
          FLUXO + PENDÊNCIAS
      ====================================================== */}

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        {/* FLUXO */}

        <MotionReveal
          delay={0.12}
        >
          <DataPanel
            eyebrow="Operação"
            title="Fluxo das solicitações"
            description="Distribuição das solicitações em cada etapa do processo."
            action={
              <Link
                href={
                  canFinance
                    ? "/financeiro/sienge"
                    : "/meus-pedidos"
                }
                className="btn btn-ghost btn-xs gap-1.5 text-base-content/40"
              >
                Ver todos

                <ArrowRight
                  size={13}
                />
              </Link>
            }
            contentClassName="p-6"
          >
            <div className="space-y-5">
              {flowData.map(
                (
                  item
                ) => {
                  const percentage =
                    item.count >
                    0
                      ? Math.max(
                          4,
                          Math.round(
                            (
                              item.count /
                              maxFlow
                            ) *
                              100
                          )
                        )
                      : 0;

                  return (
                    <div
                      key={
                        item.key
                      }
                      className="grid grid-cols-[130px_1fr_32px] items-center gap-4 sm:grid-cols-[160px_1fr_40px]"
                    >
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span
                          className={[
                            "h-2 w-2 shrink-0 rounded-full",
                            getFlowColor(
                              item.key
                            ).dot,
                          ].join(" ")}
                        />

                        <p className="truncate text-xs font-medium text-base-content/55">
                          {
                            item.label
                          }
                        </p>
                      </div>

                      <div className="h-[7px] overflow-hidden rounded-full bg-base-200">
                        <div
                          className={[
                            "h-full rounded-full transition-all duration-700",
                            getFlowColor(
                              item.key
                            ).bar,
                          ].join(" ")}
                          style={{
                            width:
                              `${percentage}%`,
                          }}
                        />
                      </div>

                      <p className="text-right text-xs font-bold tabular-nums text-base-content/65">
                        {
                          item.count
                        }
                      </p>
                    </div>
                  );
                }
              )}
            </div>
          </DataPanel>
        </MotionReveal>

        {/* PENDÊNCIAS */}

        <MotionReveal
          delay={0.16}
        >
          <DataPanel
            eyebrow="Prioridades"
            title="Requer atenção"
            description="Pendências identificadas automaticamente."
            contentClassName="p-4"
          >
            {pendingCount ===
            0 ? (
              <div className="flex min-h-60 flex-col items-center justify-center rounded-2xl bg-success/[0.035] p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle2
                    size={21}
                  />
                </div>

                <p className="mt-3 text-sm font-semibold">
                  Operação em dia
                </p>

                <p className="mt-1 max-w-xs text-[11px] leading-5 text-base-content/40">
                  Não identificamos pendências críticas neste momento.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <AttentionRow
                  icon={
                    Clock3
                  }
                  title="Solicitações fora do SLA"
                  description="Prazo operacional ultrapassado"
                  value={
                    overdueScs.size
                  }
                  href={
                    canFinance
                      ? "/financeiro/sienge?tab=pedidos"
                      : "/meus-pedidos"
                  }
                  danger
                />

                {canFinance && (
                  <AttentionRow
                    icon={
                      UserRoundX
                    }
                    title="Usuários sem vínculo"
                    description="Identificadores Sienge pendentes"
                    value={
                      unmatchedUsers
                    }
                    href="/financeiro/sienge?tab=usuarios"
                  />
                )}

                <AttentionRow
                  icon={
                    Bell
                  }
                  title="Alertas não lidos"
                  description="Notificações que exigem análise"
                  value={
                    unreadWarnings
                  }
                  href="/notificacoes?filtro=nao-lidas"
                />
              </div>
            )}
          </DataPanel>
        </MotionReveal>
      </div>

      {/* =====================================================
          ATIVIDADE + SAÚDE
      ====================================================== */}

      <div className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* ATIVIDADE */}

        <MotionReveal
          delay={0.2}
        >
          <DataPanel
            eyebrow="Tempo real"
            title="Atividade recente"
            description="Últimas movimentações registradas pelo sistema."
            action={
              <Link
                href="/notificacoes"
                className="btn btn-ghost btn-xs gap-1.5 text-base-content/40"
              >
                Histórico

                <ArrowRight
                  size={13}
                />
              </Link>
            }
          >
            {recentActivity.length ===
            0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
                <Bell
                  size={22}
                  className="text-base-content/20"
                />

                <p className="mt-3 text-sm font-semibold">
                  Sem atividade recente
                </p>
              </div>
            ) : (
              <MotionList className="divide-y divide-base-300/70">
                {recentActivity.map(
                  (
                    activity
                  ) => (
                    <MotionListItem
                      key={
                        activity.id
                      }
                    >
                      <ActivityRow
                        activity={
                          activity
                        }
                      />
                    </MotionListItem>
                  )
                )}
              </MotionList>
            )}
          </DataPanel>
        </MotionReveal>

        {/* SLA */}

        <MotionReveal
          delay={0.24}
        >
          <DataPanel
            eyebrow="Performance"
            title="Saúde da operação"
            description="Situação atual dos prazos operacionais."
            contentClassName="p-6"
          >
            <div className="mb-7 flex items-end justify-between gap-5">
              <div>
                <p
                  className={[
                    "text-5xl font-semibold tracking-[-0.055em]",
                    onTimeRate >=
                    80
                      ? "text-success"
                      : onTimeRate >=
                          60
                        ? "text-warning"
                        : "text-error",
                  ].join(" ")}
                >
                  {onTimeRate}%
                </p>

                <p className="mt-2 text-xs text-base-content/40">
                  dentro do SLA
                </p>
              </div>

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-base-200 text-base-content/35">
                <TrendingUp
                  size={22}
                />
              </div>
            </div>

            <HealthBar
              label="Dentro do prazo"
              value={
                onTimeRate
              }
              className="bg-success"
            />

            <HealthBar
              label="Em atenção"
              value={
                warningRate
              }
              className="bg-warning"
            />

            <HealthBar
              label="Atrasados"
              value={
                overdueRate
              }
              className="bg-error"
            />

            <div className="mt-6 grid grid-cols-3 divide-x divide-base-300 rounded-2xl border border-base-300/80 bg-base-200/20">
              <TinyMetric
                value={
                  onTimeItems.length
                }
                label="No prazo"
              />

              <TinyMetric
                value={
                  warningItems.length
                }
                label="Atenção"
              />

              <TinyMetric
                value={
                  overdueItems.length
                }
                label="Atrasados"
              />
            </div>
          </DataPanel>
        </MotionReveal>
      </div>

      {/* =====================================================
          ACESSOS RÁPIDOS
      ====================================================== */}

      <MotionReveal
        delay={0.28}
      >
        <DataPanel
          eyebrow="Atalhos"
          title="Acessos rápidos"
          description="Rotinas utilizadas com mais frequência."
          contentClassName="p-5"
        >
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <QuickAction
              icon={
                Send
              }
              title="Solicitar cartão"
              description="Criar nova solicitação"
              href="/solicitacoes/nova"
              primary
            />

            <QuickAction
              icon={
                RotateCcw
              }
              title="Devolução"
              description="Registrar devolução"
              href="/devolucoes"
            />

            <QuickAction
              icon={
                PackageSearch
              }
              title="Meus pedidos"
              description="Acompanhar solicitações"
              href="/meus-pedidos"
            />

            {canFinance ? (
              <QuickAction
                icon={
                  FileSpreadsheet
                }
                title="Sienge"
                description="Acompanhamento completo"
                href="/financeiro/sienge"
              />
            ) : (
              <QuickAction
                icon={
                  Bell
                }
                title="Notificações"
                description="Ver atualizações"
                href="/notificacoes"
              />
            )}

            {canFinance && (
              <QuickAction
                icon={
                  WalletCards
                }
                title="Financeiro"
                description="Gerenciar solicitações"
                href="/financeiro/solicitacoes"
              />
            )}

            {canAdmin && (
              <QuickAction
                icon={
                  UsersRound
                }
                title="Usuários"
                description="Permissões e acessos"
                href="/administracao/usuarios"
              />
            )}
          </div>
        </DataPanel>
      </MotionReveal>
    </MotionPage>
  );
}

// ============================================================
// DARK METRIC
// ============================================================

function DarkMetric({
  label,
  value,
}: {
  label: string;

  value:
    | number
    | string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.045] p-4 backdrop-blur-sm">
      <p className="text-xl font-semibold tracking-[-0.025em]">
        {value}
      </p>

      <p className="mt-1 text-[10px] text-white/40">
        {label}
      </p>
    </div>
  );
}

// ============================================================
// PENDÊNCIA
// ============================================================

function AttentionRow({
  icon: Icon,
  title,
  description,
  value,
  href,
  danger = false,
}: {
  icon:
    typeof Clock3;

  title: string;

  description: string;

  value: number;

  href: string;

  danger?: boolean;
}) {
  return (
    <Link
      href={
        href
      }
      className="group flex items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-base-200/60"
    >
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          danger
            ? "bg-error/10 text-error"
            : "bg-warning/10 text-warning",
        ].join(" ")}
      >
        <Icon
          size={16}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-base-content/70">
          {title}
        </p>

        <p className="mt-0.5 truncate text-[10px] text-base-content/35">
          {description}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={[
            "min-w-6 text-right text-sm font-bold",
            value >
            0
              ? danger
                ? "text-error"
                : "text-warning"
              : "text-base-content/25",
          ].join(" ")}
        >
          {value}
        </span>

        <ArrowRight
          size={13}
          className="text-base-content/15 transition group-hover:translate-x-0.5 group-hover:text-primary"
        />
      </div>
    </Link>
  );
}

// ============================================================
// ATIVIDADE
// ============================================================

function ActivityRow({
  activity,
}: {
  activity:
    NotificationRow;
}) {
  const href =
    activity.action_url &&
    activity.action_url.startsWith(
      "/"
    )
      ? activity.action_url
      : "/notificacoes";

  return (
    <Link
      href={
        href
      }
      className="group flex items-start gap-4 px-5 py-4 transition-colors hover:bg-base-200/40 sm:px-6"
    >
      <div className="mt-1.5">
        <span
          className={[
            "block h-2.5 w-2.5 rounded-full",
            getActivityColor(
              activity.level
            ),
          ].join(" ")}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <p className="text-xs font-semibold leading-5 text-base-content/70">
            {
              activity.title
            }
          </p>

          <span className="shrink-0 text-[9px] font-medium text-base-content/30">
            {formatRelativeTime(
              activity.created_at
            )}
          </span>
        </div>

        {activity.message && (
          <p className="mt-1 line-clamp-1 text-[10px] leading-4 text-base-content/40">
            {
              activity.message
            }
          </p>
        )}
      </div>

      <ArrowRight
        size={13}
        className="mt-1 text-base-content/10 transition group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </Link>
  );
}

// ============================================================
// SLA
// ============================================================

function HealthBar({
  label,
  value,
  className,
}: {
  label: string;

  value: number;

  className: string;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-medium text-base-content/50">
          {label}
        </span>

        <span className="text-[11px] font-bold tabular-nums text-base-content/65">
          {value}%
        </span>
      </div>

      <div className="h-[7px] overflow-hidden rounded-full bg-base-200">
        <div
          className={[
            "h-full rounded-full transition-all duration-700",
            className,
          ].join(" ")}
          style={{
            width:
              `${value}%`,
          }}
        />
      </div>
    </div>
  );
}

function TinyMetric({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div className="p-4 text-center">
      <p className="text-lg font-semibold tracking-[-0.02em]">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.12em] text-base-content/30">
        {label}
      </p>
    </div>
  );
}

// ============================================================
// CORES
// ============================================================

function getFlowColor(
  key: string
) {
  switch (
    key
  ) {
    case "Em cotação":
      return {
        dot:
          "bg-orange-400",
        bar:
          "bg-orange-400",
      };

    case "Em aprovação":
      return {
        dot:
          "bg-warning",
        bar:
          "bg-warning",
      };

    case "Compra realizada":
    case "Compra via cartão":
      return {
        dot:
          "bg-violet-500",
        bar:
          "bg-violet-500",
      };

    case "delivery":
      return {
        dot:
          "bg-info",
        bar:
          "bg-info",
      };

    case "Entregue":
      return {
        dot:
          "bg-success",
        bar:
          "bg-success",
      };

    default:
      return {
        dot:
          "bg-base-content/25",
        bar:
          "bg-base-content/25",
      };
  }
}

function getActivityColor(
  level: string
) {
  switch (
    level
  ) {
    case "success":
      return "bg-success";

    case "warning":
      return "bg-warning";

    case "error":
      return "bg-error";

    default:
      return "bg-info";
  }
}

// ============================================================
// TEMPO
// ============================================================

function formatRelativeTime(
  value: string
) {
  const date =
    new Date(value);

  const now =
    new Date();

  const difference =
    Math.max(
      0,
      now.getTime() -
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
    return `há ${hours} h`;
  }

  const days =
    Math.floor(
      hours /
        24
    );

  if (
    days <
    30
  ) {
    return `há ${days} d`;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day: "2-digit",
      month: "2-digit",
    }
  ).format(
    date
  );
}