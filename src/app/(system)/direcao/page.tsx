import {
  redirect,
} from "next/navigation";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Gauge,
  PackageCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  Truck,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  MotionReveal,
  MotionStagger,
  MotionStaggerItem,
  MotionStatus,
} from "@/components/ui/motion";

import AnimatedNumber from "@/components/ui/projeta/animated-number";

// ============================================================
// TIPOS
// ============================================================

type RequestRow = {
  request_key:
    | string
    | null;

  sc_number:
    | string
    | null;

  request_date:
    | string
    | null;

  tracking_status:
    | string
    | null;

  items_count:
    | number
    | null;

  cost_center_or_site:
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
    | number
    | string
    | null;
};

type ImportRow = {
  status:
    | string
    | null;

  created_at:
    | string
    | null;

  completed_at:
    | string
    | null;
};

type ExecutiveHealth =
  | "stable"
  | "attention"
  | "critical";

// ============================================================
// FLUXO EXECUTIVO
// ============================================================

const executiveFlow = [
  {
    label:
      "Recebidas",

    description:
      "Entraram no processo",

    statuses: [
      "Solicitação recebida",
    ],
  },

  {
    label:
      "Cotação",

    description:
      "Em levantamento comercial",

    statuses: [
      "Em cotação",
    ],
  },

  {
    label:
      "Aprovação",

    description:
      "Aguardando liberação",

    statuses: [
      "Em aprovação",
    ],
  },

  {
    label:
      "Compradas",

    description:
      "Compra já realizada",

    statuses: [
      "Compra realizada",
      "Compra via cartão",
    ],
  },

  {
    label:
      "Logística",

    description:
      "Entrega ou retirada",

    statuses: [
      "Disponível para retirada",
      "Em processo de entrega",
    ],
  },

  {
    label:
      "Entregues",

    description:
      "Processo concluído",

    statuses: [
      "Entregue",
    ],
  },
];

// ============================================================
// PAGE
// ============================================================

export default async function ExecutiveDirectionPage() {
  const supabase =
    await createClient();

  // =========================================================
  // AUTENTICAÇÃO
  // =========================================================

  const {
    data:
      claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (
    !userId
  ) {
    redirect(
      "/login"
    );
  }

  // =========================================================
  // PERMISSÕES
  // =========================================================

  const {
    data:
      roleRows,
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
      "[DIREÇÃO] Erro ao carregar permissões:",
      rolesError
    );
  }

  const roles =
    (
      roleRows ??
      []
    ).map(
      (
        item
      ) =>
        String(
          item.role
        )
    );

  const canAccess =
    roles.includes(
      "direcao"
    ) ||
    roles.includes(
      "admin"
    ) ||
    roles.includes(
      "superadmin"
    );

  if (
    !canAccess
  ) {
    redirect(
      "/dashboard"
    );
  }

  // =========================================================
  // CONSULTAS
  // =========================================================

  const [
    requestsResult,
    slaResult,
    importResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "v_sienge_request_summary"
        )
        .select(
          `
          request_key,
          sc_number,
          request_date,
          tracking_status,
          items_count,
          cost_center_or_site
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
        ),

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
        ),

      supabase
        .from(
          "sienge_import_batches"
        )
        .select(
          `
          status,
          created_at,
          completed_at
          `
        )
        .eq(
          "status",
          "completed"
        )
        .order(
          "completed_at",
          {
            ascending:
              false,

            nullsFirst:
              false,
          }
        )
        .limit(
          1
        ),
    ]);

  // =========================================================
  // ERROS
  // =========================================================

  if (
    requestsResult.error
  ) {
    console.error(
      "[DIREÇÃO] Erro ao carregar solicitações:",
      requestsResult.error
    );
  }

  if (
    slaResult.error
  ) {
    console.error(
      "[DIREÇÃO] Erro ao carregar SLA:",
      slaResult.error
    );
  }

  if (
    importResult.error
  ) {
    console.error(
      "[DIREÇÃO] Erro ao carregar importação:",
      importResult.error
    );
  }

  // =========================================================
  // DADOS
  // =========================================================

  const requests =
    (
      requestsResult.data ??
      []
    ) as RequestRow[];

  const slaRows =
    (
      slaResult.data ??
      []
    ) as SlaRow[];

  const imports =
    (
      importResult.data ??
      []
    ) as ImportRow[];

  const lastImport =
    imports[0] ??
    null;

  // =========================================================
  // MÉTRICAS GERAIS
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

  const activeSlaRows =
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

  const onTimeRows =
    activeSlaRows.filter(
      (
        item
      ) =>
        item.sla_status ===
        "on_time"
    );

  const warningRows =
    activeSlaRows.filter(
      (
        item
      ) =>
        item.sla_status ===
        "warning"
    );

  const overdueRows =
    activeSlaRows.filter(
      (
        item
      ) =>
        item.sla_status ===
        "overdue"
    );

  const onTimeRate =
    activeSlaRows.length >
    0
      ? Math.round(
          (
            onTimeRows.length /
            activeSlaRows.length
          ) *
            100
        )
      : 100;

  const overdueRate =
    activeSlaRows.length >
    0
      ? Math.round(
          (
            overdueRows.length /
            activeSlaRows.length
          ) *
            100
        )
      : 0;

  const warningRate =
    activeSlaRows.length >
    0
      ? Math.round(
          (
            warningRows.length /
            activeSlaRows.length
          ) *
            100
        )
      : 0;

  // =========================================================
  // SCS ATRASADAS
  // =========================================================

  const overdueScs =
    new Set(
      overdueRows
        .map(
          (
            item
          ) =>
            item.sc_number
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(
              value
            )
        )
    );

  const warningScs =
    new Set(
      warningRows
        .map(
          (
            item
          ) =>
            item.sc_number
        )
        .filter(
          (
            value
          ): value is string =>
            Boolean(
              value
            )
        )
    );

  // =========================================================
  // TEMPO MÉDIO
  // =========================================================

  const elapsedHours =
    activeSlaRows
      .map(
        (
          item
        ) =>
          Number(
            item.elapsed_hours
          )
      )
      .filter(
        (
          value
        ) =>
          Number.isFinite(
            value
          ) &&
          value >=
            0
      );

  const averageElapsedHours =
    elapsedHours.length >
    0
      ? elapsedHours.reduce(
          (
            total,
            value
          ) =>
            total +
            value,
          0
        ) /
        elapsedHours.length
      : 0;

  const averageElapsedDays =
    averageElapsedHours /
    24;

  // =========================================================
  // SOLICITAÇÃO MAIS ANTIGA EM ABERTO
  // =========================================================

  const openRequests =
    requests.filter(
      (
        item
      ) =>
        item.tracking_status !==
          "Entregue" &&
        Boolean(
          item.request_date
        )
    );

  const oldestOpenRequest =
    [...openRequests]
      .sort(
        (
          a,
          b
        ) =>
          getTimestamp(
            a.request_date
          ) -
          getTimestamp(
            b.request_date
          )
      )[0] ??
    null;

  const oldestOpenDays =
    oldestOpenRequest
      ?.request_date
      ? daysSince(
          oldestOpenRequest.request_date
        )
      : 0;

  // =========================================================
  // FLUXO
  // =========================================================

  const flow =
    executiveFlow.map(
      (
        step
      ) => {
        const count =
          requests.filter(
            (
              request
            ) =>
              step.statuses.includes(
                request.tracking_status ??
                  ""
              )
          ).length;

        return {
          ...step,
          count,
        };
      }
    );

  // =========================================================
  // SAÚDE EXECUTIVA
  //
  // REGRA INICIAL:
  //
  // CRÍTICO:
  // >= 30% de itens ativos vencidos
  //
  // ATENÇÃO:
  // >= 10% vencidos ou existe SLA em warning
  //
  // ESTÁVEL:
  // abaixo dos limites acima
  // =========================================================

  const health:
    ExecutiveHealth =
    overdueRate >=
    30
      ? "critical"
      : overdueRate >=
            10 ||
          warningRows.length >
            0
        ? "attention"
        : "stable";

  const healthContent =
    getHealthContent({
      health,
      overdueRate,
      overdueScs:
        overdueScs.size,
      warningScs:
        warningScs.size,
    });

  // =========================================================
  // LEITURA EXECUTIVA
  // =========================================================

  const executiveNotes =
    buildExecutiveNotes({
      totalRequests,
      inProgress,
      delivered,
      completionRate,
      onTimeRate,
      overdueRate,
      overdueScs:
        overdueScs.size,
      warningScs:
        warningScs.size,
      oldestOpenDays,
    });

  // =========================================================
  // DATA
  // =========================================================

  const today =
    new Intl.DateTimeFormat(
      "pt-BR",
      {
        day:
          "2-digit",

        month:
          "long",

        year:
          "numeric",
      }
    ).format(
      new Date()
    );

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
          8
        }
      >
        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MotionStatus
                pulse={
                  health !==
                  "stable"
                }
                className="flex"
              >
                <span
                  className={[
                    "status status-xs",
                    health ===
                    "critical"
                      ? "status-error"
                      : health ===
                          "attention"
                        ? "status-warning"
                        : "status-success",
                  ].join(
                    " "
                  )}
                />
              </MotionStatus>

              <p className="projeta-section-label">
                Visão executiva
              </p>
            </div>

            <h1 className="mt-3 text-[28px] font-[700] tracking-[-0.05em] text-base-content sm:text-[34px]">
              Compras e Suprimentos
            </h1>

            <p className="mt-2 max-w-2xl text-[11px] leading-5 text-base-content/40">
              Visão consolidada do desempenho operacional para
              acompanhamento da Direção.
            </p>
          </div>

          <div className="text-left lg:text-right">
            <p className="text-[9px] font-[700] uppercase tracking-[0.13em] text-base-content/30">
              Posição
            </p>

            <p className="mt-1 text-[11px] font-[650] capitalize text-base-content/60">
              {today}
            </p>

            <p className="mt-1 text-[9px] text-base-content/30">
              Sienge atualizado{" "}
              {formatImportDate(
                lastImport
              )}
            </p>
          </div>
        </header>
      </MotionReveal>

      {/* =====================================================
          SAÚDE DA OPERAÇÃO
      ====================================================== */}

      <MotionReveal
        delay={
          0.03
        }
      >
        <section
          className={[
            "relative mb-5 overflow-hidden rounded-[24px] border p-6 sm:p-7",
            health ===
            "critical"
              ? "border-error/15 bg-[#1B1515]"
              : health ===
                  "attention"
                ? "border-warning/15 bg-[#1A1813]"
                : "border-success/15 bg-[#151A17]",
          ].join(
            " "
          )}
        >
          <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-[100px]" />

          <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={
                    13
                  }
                  className={
                    healthContent.accent
                  }
                />

                <p className="text-[8px] font-[750] uppercase tracking-[0.2em] text-white/35">
                  Saúde da operação
                </p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span
                  className={[
                    "h-2.5 w-2.5 rounded-full",
                    healthContent.dot,
                  ].join(
                    " "
                  )}
                />

                <h2 className="text-[28px] font-[750] tracking-[-0.045em] text-white">
                  {
                    healthContent.label
                  }
                </h2>
              </div>

              <p className="mt-3 max-w-2xl text-[12px] leading-6 text-white/55">
                {
                  healthContent.description
                }
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-3 sm:min-w-[390px]">
              <DarkExecutiveMetric
                label="Dentro do SLA"
                value={`${onTimeRate}%`}
              />

              <DarkExecutiveMetric
                label="SCs atrasadas"
                value={
                  String(
                    overdueScs.size
                  )
                }
              />

              <DarkExecutiveMetric
                label="Em andamento"
                value={
                  String(
                    inProgress
                  )
                }
              />

              <DarkExecutiveMetric
                label="Concluídas"
                value={
                  String(
                    delivered
                  )
                }
              />
            </div>
          </div>
        </section>
      </MotionReveal>

      {/* =====================================================
          KPIs
      ====================================================== */}

      <MotionStagger
        className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        stagger={
          0.05
        }
      >
        <MotionStaggerItem>
          <ExecutiveMetric
            icon={
              ShoppingCart
            }
            label="Solicitações"
            value={
              totalRequests
            }
            description="Processos acompanhados"
          />
        </MotionStaggerItem>

        <MotionStaggerItem>
          <ExecutiveMetric
            icon={
              Activity
            }
            label="Em andamento"
            value={
              inProgress
            }
            description="Ainda não concluídas"
          />
        </MotionStaggerItem>

        <MotionStaggerItem>
          <ExecutiveMetric
            icon={
              PackageCheck
            }
            label="Entregues"
            value={
              delivered
            }
            description={`${completionRate}% de conclusão`}
            tone="success"
          />
        </MotionStaggerItem>

        <MotionStaggerItem>
          <ExecutiveMetric
            icon={
              Gauge
            }
            label="Dentro do SLA"
            value={
              onTimeRate
            }
            suffix="%"
            description={`${overdueRate}% fora do prazo`}
            tone={
              health ===
              "critical"
                ? "error"
                : health ===
                    "attention"
                  ? "warning"
                  : "success"
            }
          />
        </MotionStaggerItem>
      </MotionStagger>

      {/* =====================================================
          FLUXO + PRAZOS
      ====================================================== */}

      <div className="mb-5 grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        {/* ===================================================
            FLUXO
        ==================================================== */}

        <MotionReveal
          delay={
            0.06
          }
        >
          <section className="h-full overflow-hidden rounded-[22px] border border-base-300 bg-base-100">
            <div className="border-b border-base-300/70 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-2">
                <BarChart3
                  size={
                    14
                  }
                  className="text-primary"
                />

                <p className="projeta-section-label">
                  Fluxo atual
                </p>
              </div>

              <h2 className="mt-2 text-[16px] font-[700] tracking-[-0.025em]">
                Onde estão as solicitações
              </h2>

              <p className="mt-1 text-[9px] text-base-content/35">
                Distribuição macro dos processos por etapa.
              </p>
            </div>

            <div className="grid gap-px bg-base-300/60 sm:grid-cols-2 xl:grid-cols-3">
              {flow.map(
                (
                  step,
                  index
                ) => (
                  <div
                    key={
                      step.label
                    }
                    className="relative bg-base-100 p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[9px] font-[700] uppercase tracking-[0.1em] text-base-content/30">
                          Etapa{" "}
                          {
                            index +
                            1
                          }
                        </p>

                        <AnimatedNumber
                          value={
                            step.count
                          }
                          className="mt-3 block text-[29px] font-[750] leading-none tracking-[-0.05em]"
                        />

                        <p className="mt-3 text-[11px] font-[700] text-base-content/65">
                          {
                            step.label
                          }
                        </p>

                        <p className="mt-1 text-[9px] leading-4 text-base-content/30">
                          {
                            step.description
                          }
                        </p>
                      </div>

                      {index <
                        flow.length -
                          1 && (
                        <span className="hidden text-base-content/15 xl:block">
                          →
                        </span>
                      )}
                    </div>
                  </div>
                )
              )}
            </div>
          </section>
        </MotionReveal>

        {/* ===================================================
            PRAZOS
        ==================================================== */}

        <MotionReveal
          delay={
            0.08
          }
        >
          <section className="h-full rounded-[22px] border border-base-300 bg-base-100 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Clock3
                size={
                  14
                }
                className="text-primary"
              />

              <p className="projeta-section-label">
                Prazos
              </p>
            </div>

            <h2 className="mt-2 text-[16px] font-[700] tracking-[-0.025em]">
              Pressão operacional
            </h2>

            <div className="mt-6 space-y-3">
              <ExecutiveInfoRow
                label="SCs com SLA vencido"
                value={
                  String(
                    overdueScs.size
                  )
                }
                tone={
                  overdueScs.size >
                  0
                    ? "error"
                    : "success"
                }
              />

              <ExecutiveInfoRow
                label="SCs próximas do limite"
                value={
                  String(
                    warningScs.size
                  )
                }
                tone={
                  warningScs.size >
                  0
                    ? "warning"
                    : "neutral"
                }
              />

              <ExecutiveInfoRow
                label="Tempo médio monitorado"
                value={
                  formatDays(
                    averageElapsedDays
                  )
                }
              />

              <ExecutiveInfoRow
                label="Mais antiga em aberto"
                value={
                  oldestOpenDays >
                  0
                    ? `${oldestOpenDays} dias`
                    : "—"
                }
                tone={
                  oldestOpenDays >=
                  15
                    ? "warning"
                    : "neutral"
                }
              />
            </div>

            {/* SLA BAR */}

            <div className="mt-6 border-t border-base-300/60 pt-5">
              <div className="flex items-center justify-between">
                <p className="text-[9px] font-[650] text-base-content/40">
                  Distribuição do SLA
                </p>

                <span className="text-[9px] font-[700] text-base-content/55">
                  {
                    activeSlaRows.length
                  }{" "}
                  itens
                </span>
              </div>

              <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-base-200">
                <div
                  className="h-full bg-success"
                  style={{
                    width:
                      `${onTimeRate}%`,
                  }}
                />

                <div
                  className="h-full bg-warning"
                  style={{
                    width:
                      `${warningRate}%`,
                  }}
                />

                <div
                  className="h-full bg-error"
                  style={{
                    width:
                      `${overdueRate}%`,
                  }}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[8px] font-[650] text-base-content/40">
                <Legend
                  className="bg-success"
                  label={`${onTimeRate}% no prazo`}
                />

                <Legend
                  className="bg-warning"
                  label={`${warningRate}% atenção`}
                />

                <Legend
                  className="bg-error"
                  label={`${overdueRate}% vencido`}
                />
              </div>
            </div>
          </section>
        </MotionReveal>
      </div>

      {/* =====================================================
          PONTOS DE ATENÇÃO + LEITURA
      ====================================================== */}

      <div className="grid gap-5 xl:grid-cols-[0.7fr_1.3fr]">
        {/* ===================================================
            PONTOS DE ATENÇÃO
        ==================================================== */}

        <MotionReveal
          delay={
            0.1
          }
        >
          <section className="h-full rounded-[22px] border border-base-300 bg-base-100 p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle
                size={
                  14
                }
                className={
                  overdueScs.size >
                  0
                    ? "text-error"
                    : "text-success"
                }
              />

              <p className="projeta-section-label">
                Pontos de atenção
              </p>
            </div>

            <h2 className="mt-2 text-[16px] font-[700] tracking-[-0.025em]">
              O que merece acompanhamento
            </h2>

            <div className="mt-5 space-y-2.5">
              <AttentionRow
                icon={
                  Clock3
                }
                title="Prazo de atendimento"
                value={`${overdueScs.size} SCs vencidas`}
                active={
                  overdueScs.size >
                  0
                }
              />

              <AttentionRow
                icon={
                  TrendingUp
                }
                title="Próximas do limite"
                value={`${warningScs.size} SCs em atenção`}
                active={
                  warningScs.size >
                  0
                }
                warning
              />

              <AttentionRow
                icon={
                  Truck
                }
                title="Processos em logística"
                value={`${getFlowCount(
                  flow,
                  "Logística"
                )} em entrega/retirada`}
                active={
                  getFlowCount(
                    flow,
                    "Logística"
                  ) >
                  0
                }
                warning
              />

              <AttentionRow
                icon={
                  FileCheck2
                }
                title="Processos concluídos"
                value={`${delivered} entregues`}
                active={
                  false
                }
              />
            </div>
          </section>
        </MotionReveal>

        {/* ===================================================
            LEITURA EXECUTIVA
        ==================================================== */}

        <MotionReveal
          delay={
            0.12
          }
        >
          <section className="h-full overflow-hidden rounded-[22px] border border-base-300 bg-base-100">
            <div className="border-b border-base-300/70 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-2">
                <Sparkles
                  size={
                    14
                  }
                  className="text-primary"
                />

                <p className="projeta-section-label">
                  Leitura executiva
                </p>
              </div>

              <h2 className="mt-2 text-[16px] font-[700] tracking-[-0.025em]">
                O que os números estão dizendo
              </h2>

              <p className="mt-1 text-[9px] text-base-content/35">
                Resumo automático do cenário operacional atual.
              </p>
            </div>

            <div className="p-5 sm:p-6">
              <div
                className={[
                  "mb-5 rounded-[16px] border p-4",
                  health ===
                  "critical"
                    ? "border-error/15 bg-error/[0.035]"
                    : health ===
                        "attention"
                      ? "border-warning/15 bg-warning/[0.035]"
                      : "border-success/15 bg-success/[0.035]",
                ].join(
                  " "
                )}
              >
                <div className="flex items-start gap-3">
                  {health ===
                  "stable" ? (
                    <CheckCircle2
                      size={
                        17
                      }
                      className="mt-0.5 shrink-0 text-success"
                    />
                  ) : (
                    <AlertTriangle
                      size={
                        17
                      }
                      className={[
                        "mt-0.5 shrink-0",
                        health ===
                        "critical"
                          ? "text-error"
                          : "text-warning",
                      ].join(
                        " "
                      )}
                    />
                  )}

                  <div>
                    <p className="text-[11px] font-[750] text-base-content/75">
                      {
                        healthContent.summary
                      }
                    </p>

                    <p className="mt-1 text-[10px] leading-5 text-base-content/40">
                      {
                        healthContent.description
                      }
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {executiveNotes.map(
                  (
                    note,
                    index
                  ) => (
                    <div
                      key={`${note}-${index}`}
                      className="flex gap-3 border-b border-base-300/60 pb-3 last:border-0 last:pb-0"
                    >
                      <div className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />

                      <p className="text-[10px] leading-5 text-base-content/55">
                        {note}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </section>
        </MotionReveal>
      </div>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <footer className="mt-7 flex flex-col gap-2 border-t border-base-300/60 py-5 text-[8px] font-[550] text-base-content/25 sm:flex-row sm:items-center sm:justify-between">
        <span>
          Indicadores consolidados a partir do acompanhamento
          operacional do Sienge.
        </span>

        <span className="uppercase tracking-[0.14em]">
          Projeta Compras OS · Direção
        </span>
      </footer>
    </main>
  );
}

// ============================================================
// EXECUTIVE METRIC
// ============================================================

function ExecutiveMetric({
  icon: Icon,
  label,
  value,
  suffix,
  description,
  tone = "neutral",
}: {
  icon:
    typeof ShoppingCart;

  label:
    string;

  value:
    number;

  suffix?:
    string;

  description:
    string;

  tone?:
    | "neutral"
    | "success"
    | "warning"
    | "error";
}) {
  const config =
    tone ===
    "success"
      ? {
          icon:
            "bg-success/10 text-success",

          value:
            "text-success",
        }
      : tone ===
          "warning"
        ? {
            icon:
              "bg-warning/10 text-warning",

            value:
              "text-warning",
          }
        : tone ===
            "error"
          ? {
              icon:
                "bg-error/10 text-error",

              value:
                "text-error",
            }
          : {
              icon:
                "bg-base-200 text-base-content/40",

              value:
                "text-base-content",
            };

  return (
    <div className="h-full rounded-[20px] border border-base-300 bg-base-100 p-5">
      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-xl",
          config.icon,
        ].join(
          " "
        )}
      >
        <Icon
          size={
            17
          }
        />
      </div>

      <AnimatedNumber
        value={
          value
        }
        suffix={
          suffix
        }
        className={[
          "mt-5 block text-[32px] font-[750] leading-none tracking-[-0.055em]",
          config.value,
        ].join(
          " "
        )}
      />

      <p className="mt-3 text-[10px] font-[700] text-base-content/60">
        {label}
      </p>

      <p className="mt-1 text-[9px] leading-4 text-base-content/30">
        {description}
      </p>
    </div>
  );
}

// ============================================================
// DARK METRIC
// ============================================================

function DarkExecutiveMetric({
  label,
  value,
}: {
  label:
    string;

  value:
    string;
}) {
  return (
    <div className="rounded-[14px] border border-white/[0.07] bg-white/[0.045] px-4 py-3 backdrop-blur-sm">
      <p className="text-[19px] font-[750] tracking-[-0.04em] text-white">
        {value}
      </p>

      <p className="mt-1 text-[8px] font-[650] uppercase tracking-[0.1em] text-white/30">
        {label}
      </p>
    </div>
  );
}

// ============================================================
// INFO ROW
// ============================================================

function ExecutiveInfoRow({
  label,
  value,
  tone = "neutral",
}: {
  label:
    string;

  value:
    string;

  tone?:
    | "neutral"
    | "success"
    | "warning"
    | "error";
}) {
  const valueClass =
    tone ===
    "success"
      ? "text-success"
      : tone ===
          "warning"
        ? "text-warning"
        : tone ===
            "error"
          ? "text-error"
          : "text-base-content/70";

  return (
    <div className="flex items-center justify-between gap-4 rounded-[14px] bg-base-200/35 px-4 py-3.5">
      <p className="text-[9px] font-[600] text-base-content/40">
        {label}
      </p>

      <p
        className={[
          "text-[11px] font-[750] tabular-nums",
          valueClass,
        ].join(
          " "
        )}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================
// ATTENTION ROW
// ============================================================

function AttentionRow({
  icon: Icon,
  title,
  value,
  active,
  warning = false,
}: {
  icon:
    typeof AlertTriangle;

  title:
    string;

  value:
    string;

  active:
    boolean;

  warning?:
    boolean;
}) {
  const iconClass =
    active
      ? warning
        ? "bg-warning/10 text-warning"
        : "bg-error/10 text-error"
      : "bg-success/10 text-success";

  return (
    <div className="flex items-center gap-3 rounded-[15px] border border-base-300/70 p-3.5">
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          iconClass,
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

      <div className="min-w-0">
        <p className="text-[10px] font-[700] text-base-content/60">
          {title}
        </p>

        <p className="mt-0.5 text-[9px] text-base-content/35">
          {value}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// LEGEND
// ============================================================

function Legend({
  className,
  label,
}: {
  className:
    string;

  label:
    string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          className,
        ].join(
          " "
        )}
      />

      {label}
    </span>
  );
}

// ============================================================
// HEALTH
// ============================================================

function getHealthContent({
  health,
  overdueRate,
  overdueScs,
  warningScs,
}: {
  health:
    ExecutiveHealth;

  overdueRate:
    number;

  overdueScs:
    number;

  warningScs:
    number;
}) {
  if (
    health ===
    "critical"
  ) {
    return {
      label:
        "Crítico",

      summary:
        "A operação exige intervenção gerencial.",

      description:
        `${overdueRate}% dos itens monitorados estão fora do SLA. Existem ${overdueScs} solicitações com atraso e ${warningScs} próximas do limite.`,

      dot:
        "bg-error",

      accent:
        "text-red-400",
    };
  }

  if (
    health ===
    "attention"
  ) {
    return {
      label:
        "Em atenção",

      summary:
        "A operação está ativa, porém existem pontos que precisam de acompanhamento.",

      description:
        `${overdueRate}% dos itens monitorados estão fora do SLA e ${warningScs} solicitações estão próximas do limite.`,

      dot:
        "bg-warning",

      accent:
        "text-amber-400",
    };
  }

  return {
    label:
      "Estável",

    summary:
      "A operação está dentro dos parâmetros definidos.",

    description:
      "Os indicadores atuais não apresentam concentração relevante de atrasos.",

    dot:
      "bg-success",

    accent:
      "text-emerald-400",
  };
}

// ============================================================
// LEITURA EXECUTIVA
// ============================================================

function buildExecutiveNotes({
  totalRequests,
  inProgress,
  delivered,
  completionRate,
  onTimeRate,
  overdueRate,
  overdueScs,
  warningScs,
  oldestOpenDays,
}: {
  totalRequests:
    number;

  inProgress:
    number;

  delivered:
    number;

  completionRate:
    number;

  onTimeRate:
    number;

  overdueRate:
    number;

  overdueScs:
    number;

  warningScs:
    number;

  oldestOpenDays:
    number;
}) {
  const notes:
    string[] =
    [];

  notes.push(
    `O sistema acompanha atualmente ${totalRequests} solicitações, sendo ${inProgress} em andamento e ${delivered} concluídas.`
  );

  notes.push(
    `A taxa geral de conclusão está em ${completionRate}%, enquanto ${onTimeRate}% dos itens ativos permanecem dentro do SLA.`
  );

  if (
    overdueScs >
    0
  ) {
    notes.push(
      `${overdueScs} solicitações possuem itens com SLA vencido, representando ${overdueRate}% dos itens atualmente monitorados pelo indicador.`
    );
  } else {
    notes.push(
      "Não existem solicitações com SLA vencido no cenário atual."
    );
  }

  if (
    warningScs >
    0
  ) {
    notes.push(
      `${warningScs} solicitações estão próximas do limite de prazo e devem ser acompanhadas preventivamente.`
    );
  }

  if (
    oldestOpenDays >
    0
  ) {
    notes.push(
      `A solicitação mais antiga ainda em aberto possui aproximadamente ${oldestOpenDays} dias desde o registro.`
    );
  }

  return notes;
}

// ============================================================
// HELPERS
// ============================================================

function getTimestamp(
  value:
    | string
    | null
) {
  if (
    !value
  ) {
    return Number.MAX_SAFE_INTEGER;
  }

  const date =
    new Date(
      `${value}T12:00:00`
    );

  const timestamp =
    date.getTime();

  return Number.isNaN(
    timestamp
  )
    ? Number.MAX_SAFE_INTEGER
    : timestamp;
}

function daysSince(
  value:
    string
) {
  const date =
    new Date(
      `${value}T12:00:00`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 0;
  }

  const today =
    new Date();

  const difference =
    today.getTime() -
    date.getTime();

  return Math.max(
    0,
    Math.floor(
      difference /
        86400000
    )
  );
}

function formatDays(
  value:
    number
) {
  if (
    !Number.isFinite(
      value
    ) ||
    value <=
      0
  ) {
    return "—";
  }

  return `${new Intl.NumberFormat(
    "pt-BR",
    {
      maximumFractionDigits:
        1,
    }
  ).format(
    value
  )} dias`;
}

function formatImportDate(
  lastImport:
    ImportRow
    | null
) {
  const value =
    lastImport
      ?.completed_at ??
    lastImport
      ?.created_at;

  if (
    !value
  ) {
    return "não identificada";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "não identificada";
  }

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
    date
  );
}

function getFlowCount(
  flow:
    Array<{
      label:
        string;

      count:
        number;
    }>,

  label:
    string
) {
  return (
    flow.find(
      (
        item
      ) =>
        item.label ===
        label
    )?.count ??
    0
  );
}