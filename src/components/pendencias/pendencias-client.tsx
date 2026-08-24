"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock3,
  ExternalLink,
  ListTodo,
  PackageCheck,
  RefreshCw,
  Search,
  TriangleAlert,
  UserRoundX,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import type {
  PendingSummary,
} from "@/lib/pendencias/summary";

import {
  MotionReveal,
  MotionStagger,
  MotionStaggerItem,
  MotionStatus,
} from "@/components/ui/motion";

import AnimatedNumber from "@/components/ui/projeta/animated-number";

// ============================================================
// TYPES
// ============================================================

export type PendingFilter =
  | "todas"
  | "criticas"
  | "atencao"
  | "sla"
  | "entrega"
  | "usuarios"
  | "alertas";

export type PendingType =
  | "sla"
  | "atencao"
  | "entrega"
  | "usuarios"
  | "alertas";

export type PendingPriority =
  | "critical"
  | "warning"
  | "info";

export type PendingIconKey =
  | "clock"
  | "warning"
  | "delivery"
  | "user"
  | "bell";

export type PendingEntry = {
  id: string;

  type:
    PendingType;

  priority:
    PendingPriority;

  icon:
    PendingIconKey;

  title:
    string;

  description:
    string;

  meta:
    | string
    | null;

  secondary:
    | string
    | null;

  value:
    | string
    | null;

  href:
    string;

  actionLabel:
    string;

  searchText:
    string;

  urgency:
    number;

  createdAt:
    | string
    | null;

  details: Array<{
    label:
      string;

    value:
      string;
  }>;
};

type PendenciasClientProps = {
  entries:
    PendingEntry[];

  summary:
    PendingSummary;

  canFinance:
    boolean;

  initialType:
    PendingFilter;

  initialQuery:
    string;
};

// ============================================================
// ICONS
// ============================================================

const pendingIcons: Record<
  PendingIconKey,
  LucideIcon
> = {
  clock:
    Clock3,

  warning:
    TriangleAlert,

  delivery:
    PackageCheck,

  user:
    UserRoundX,

  bell:
    Bell,
};

// ============================================================
// COMPONENT
// ============================================================

export default function PendenciasClient({
  entries,
  summary,
  canFinance,
  initialType,
  initialQuery,
}: PendenciasClientProps) {
  const [
    filter,
    setFilter,
  ] =
    useState<PendingFilter>(
      initialType
    );

  const [
    query,
    setQuery,
  ] =
    useState(
      initialQuery
    );

  const [
    selectedEntry,
    setSelectedEntry,
  ] =
    useState<
      PendingEntry
      | null
    >(
      null
    );

  // =========================================================
  // SEARCH
  // =========================================================

  const normalizedQuery =
    normalizeSearch(
      query
    );

  const filteredEntries =
    useMemo(
      () => {
        return entries.filter(
          (
            entry
          ) => {
            // ===============================================
            // CATEGORY
            // ===============================================

            if (
              filter ===
                "criticas" &&
              entry.priority !==
                "critical"
            ) {
              return false;
            }

            if (
              filter ===
                "atencao" &&
              entry.priority !==
                "warning"
            ) {
              return false;
            }

            if (
              filter ===
                "sla" &&
              entry.type !==
                "sla"
            ) {
              return false;
            }

            if (
              filter ===
                "entrega" &&
              entry.type !==
                "entrega"
            ) {
              return false;
            }

            if (
              filter ===
                "usuarios" &&
              entry.type !==
                "usuarios"
            ) {
              return false;
            }

            if (
              filter ===
                "alertas" &&
              entry.type !==
                "alertas"
            ) {
              return false;
            }

            // ===============================================
            // SEARCH
            // ===============================================

            if (
              normalizedQuery &&
              !normalizeSearch(
                entry.searchText
              ).includes(
                normalizedQuery
              ) &&
              !normalizeSearch(
                entry.title
              ).includes(
                normalizedQuery
              ) &&
              !normalizeSearch(
                entry.description
              ).includes(
                normalizedQuery
              )
            ) {
              return false;
            }

            return true;
          }
        );
      },
      [
        entries,
        filter,
        normalizedQuery,
      ]
    );

  // =========================================================
  // GROUPS
  // =========================================================

  const {
    criticalEntries,
    warningEntries,
    infoEntries,
  } =
    useMemo(
      () => {
        const critical:
          PendingEntry[] =
          [];

        const warning:
          PendingEntry[] =
          [];

        const info:
          PendingEntry[] =
          [];

        for (
          const entry
          of filteredEntries
        ) {
          if (
            entry.priority ===
            "critical"
          ) {
            critical.push(
              entry
            );

            continue;
          }

          if (
            entry.priority ===
            "warning"
          ) {
            warning.push(
              entry
            );

            continue;
          }

          info.push(
            entry
          );
        }

        return {
          criticalEntries:
            critical,

          warningEntries:
            warning,

          infoEntries:
            info,
        };
      },
      [
        filteredEntries,
      ]
    );

  // =========================================================
  // URL
  // =========================================================

  useEffect(
    () => {
      const params =
        new URLSearchParams();

      if (
        filter !==
        "todas"
      ) {
        params.set(
          "tipo",
          filter
        );
      }

      if (
        query.trim()
      ) {
        params.set(
          "q",
          query.trim()
        );
      }

      const search =
        params.toString();

      const nextUrl =
        search
          ? `/pendencias?${search}`
          : "/pendencias";

      window.history.replaceState(
        null,
        "",
        nextUrl
      );
    },
    [
      filter,
      query,
    ]
  );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      <main className="projeta-page mx-auto max-w-[1580px]">
        {/* ===================================================
            HEADER
        ==================================================== */}

        <MotionReveal
          distance={
            10
          }
        >
          <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MotionStatus
                  pulse={
                    summary.critical >
                    0
                  }
                  className="flex"
                >
                  <span
                    className={[
                      "status status-xs",
                      summary.critical >
                      0
                        ? "status-error"
                        : summary.attention >
                            0
                          ? "status-warning"
                          : "status-success",
                    ].join(
                      " "
                    )}
                  />
                </MotionStatus>

                <p className="projeta-section-label">
                  Caixa de entrada operacional
                </p>
              </div>

              <h1 className="mt-3 text-[28px] font-[700] tracking-[-0.05em] text-base-content sm:text-[32px]">
                Central de Pendências
              </h1>

              <p className="mt-2 max-w-2xl text-[11px] leading-5 text-base-content/40">
                Priorize situações que podem bloquear, atrasar ou
                comprometer o fluxo de compras.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={[
                  "flex h-10 items-center gap-2 rounded-xl border px-3",
                  summary.critical >
                  0
                    ? "border-error/15 bg-error/[0.04] text-error"
                    : summary.attention >
                        0
                      ? "border-warning/15 bg-warning/[0.04] text-warning"
                      : "border-success/15 bg-success/[0.04] text-success",
                ].join(
                  " "
                )}
              >
                {summary.critical >
                0 ? (
                  <AlertTriangle
                    size={
                      14
                    }
                  />
                ) : (
                  <CheckCircle2
                    size={
                      14
                    }
                  />
                )}

                <span className="text-[10px] font-[700]">
                  {summary.critical >
                  0
                    ? `${summary.critical} críticas`
                    : summary.attention >
                        0
                      ? `${summary.attention} em atenção`
                      : "Operação estável"}
                </span>
              </div>

              <button
                type="button"
                onClick={
                  () =>
                    window.location.reload()
                }
                className="btn btn-ghost btn-sm h-10 rounded-xl border border-base-300 bg-base-100 px-3"
              >
                <RefreshCw
                  size={
                    14
                  }
                />

                Atualizar
              </button>
            </div>
          </header>
        </MotionReveal>

        {/* ===================================================
            COMMAND SUMMARY
        ==================================================== */}

        <MotionStagger
          className="grid gap-3 md:grid-cols-3"
          stagger={
            0.07
          }
        >
          <MotionStaggerItem>
            <SummaryMetric
              label="Pendências totais"
              value={
                summary.total
              }
              description="Todas as ocorrências monitoradas"
              icon={
                ListTodo
              }
              active={
                filter ===
                "todas"
              }
              variant="neutral"
              onClick={
                () =>
                  setFilter(
                    "todas"
                  )
              }
            />
          </MotionStaggerItem>

          <MotionStaggerItem>
            <SummaryMetric
              label="Críticas"
              value={
                summary.critical
              }
              description="Exigem ação prioritária"
              icon={
                AlertCircle
              }
              active={
                filter ===
                "criticas"
              }
              variant="error"
              onClick={
                () =>
                  setFilter(
                    "criticas"
                  )
              }
            />
          </MotionStaggerItem>

          <MotionStaggerItem>
            <SummaryMetric
              label="Em atenção"
              value={
                summary.attention
              }
              description="Devem ser acompanhadas"
              icon={
                TriangleAlert
              }
              active={
                filter ===
                "atencao"
              }
              variant="warning"
              onClick={
                () =>
                  setFilter(
                    "atencao"
                  )
              }
            />
          </MotionStaggerItem>
        </MotionStagger>

        {/* ===================================================
            FILTER BAR
        ==================================================== */}

        <MotionReveal
          delay={
            0.04
          }
        >
          <section className="mt-5 overflow-hidden rounded-[20px] border border-base-300/80 bg-base-100 shadow-[var(--projeta-shadow-sm)]">
            {/* SEARCH */}

            <div className="flex flex-col gap-3 border-b border-base-300/60 p-3 xl:flex-row xl:items-center">
              <label className="flex h-11 min-w-0 flex-1 items-center gap-3 rounded-xl border border-base-300 bg-base-200/25 px-3 transition focus-within:border-primary/25 focus-within:bg-base-100 focus-within:ring-4 focus-within:ring-primary/[0.035]">
                <Search
                  size={
                    15
                  }
                  className="shrink-0 text-base-content/25"
                />

                <input
                  type="search"
                  value={
                    query
                  }
                  onChange={
                    (
                      event
                    ) =>
                      setQuery(
                        event.target.value
                      )
                  }
                  placeholder="Buscar SC, solicitante, fornecedor, pedido, centro de custo..."
                  className="min-w-0 flex-1 bg-transparent text-[11px] outline-none placeholder:text-base-content/25"
                />

                {query && (
                  <button
                    type="button"
                    onClick={
                      () =>
                        setQuery(
                          ""
                        )
                    }
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-base-content/25 transition hover:bg-base-200 hover:text-base-content"
                    aria-label="Limpar busca"
                  >
                    <X
                      size={
                        13
                      }
                    />
                  </button>
                )}
              </label>

              <div className="shrink-0 text-[9px] font-[550] text-base-content/30">
                <strong className="font-[750] text-base-content/55">
                  {
                    filteredEntries.length
                  }
                </strong>{" "}
                exibida
                {filteredEntries.length ===
                1
                  ? ""
                  : "s"}{" "}
                de{" "}
                <strong className="font-[750] text-base-content/55">
                  {
                    summary.total
                  }
                </strong>
              </div>
            </div>

            {/* TABS */}

            <div className="overflow-x-auto px-3 py-2">
              <div className="flex min-w-max gap-1">
                <FilterButton
                  label="Todas"
                  count={
                    summary.total
                  }
                  active={
                    filter ===
                    "todas"
                  }
                  onClick={
                    () =>
                      setFilter(
                        "todas"
                      )
                  }
                />

                <FilterButton
                  label="Críticas"
                  count={
                    summary.critical
                  }
                  active={
                    filter ===
                    "criticas"
                  }
                  tone="error"
                  onClick={
                    () =>
                      setFilter(
                        "criticas"
                      )
                  }
                />

                <FilterButton
                  label="Atenção"
                  count={
                    summary.attention
                  }
                  active={
                    filter ===
                    "atencao"
                  }
                  tone="warning"
                  onClick={
                    () =>
                      setFilter(
                        "atencao"
                      )
                  }
                />

                <FilterButton
                  label="SLA"
                  count={
                    summary.categories.sla
                  }
                  active={
                    filter ===
                    "sla"
                  }
                  onClick={
                    () =>
                      setFilter(
                        "sla"
                      )
                  }
                />

                <FilterButton
                  label="Entregas"
                  count={
                    summary.categories.deliveries
                  }
                  active={
                    filter ===
                    "entrega"
                  }
                  onClick={
                    () =>
                      setFilter(
                        "entrega"
                      )
                  }
                />

                {canFinance && (
                  <FilterButton
                    label="Vínculos"
                    count={
                      summary.categories.unmatched
                    }
                    active={
                      filter ===
                      "usuarios"
                    }
                    onClick={
                      () =>
                        setFilter(
                          "usuarios"
                        )
                    }
                  />
                )}

                <FilterButton
                  label="Alertas"
                  count={
                    summary.categories.alerts
                  }
                  active={
                    filter ===
                    "alertas"
                  }
                  onClick={
                    () =>
                      setFilter(
                        "alertas"
                      )
                  }
                />
              </div>
            </div>
          </section>
        </MotionReveal>

        {/* ===================================================
            QUEUE
        ==================================================== */}
        {/*
         * IMPORTANTE:
         *
         * A fila NÃO usa MotionReveal, MotionList ou
         * MotionListItem.
         *
         * Ela precisa aparecer imediatamente quando os dados
         * já estão disponíveis.
         *
         * Isso evita registros presos em opacity: 0 por falha
         * ou atraso do IntersectionObserver.
         */}

        <section className="mt-5 overflow-hidden rounded-[22px] border border-base-300 bg-base-100 shadow-[var(--projeta-shadow-sm)]">
          <div className="flex items-center justify-between gap-4 border-b border-base-300/70 px-5 py-5 sm:px-6">
            <div>
              <div className="flex items-center gap-2">
                <Activity
                  size={
                    13
                  }
                  className="text-primary"
                />

                <p className="projeta-section-label">
                  Fila operacional
                </p>
              </div>

              <h2 className="mt-2 text-[15px] font-[650] tracking-[-0.025em]">
                Itens que exigem acompanhamento
              </h2>

              <p className="mt-1 text-[9px] text-base-content/35">
                Clique em uma ocorrência para visualizar os detalhes.
              </p>
            </div>

            {(filter !==
              "todas" ||
              query) && (
              <button
                type="button"
                onClick={
                  () => {
                    setFilter(
                      "todas"
                    );

                    setQuery(
                      ""
                    );
                  }
                }
                className="btn btn-ghost btn-xs rounded-lg text-[9px]"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {filteredEntries.length ===
          0 ? (
            <EmptyState
              hasFilters={
                filter !==
                  "todas" ||
                Boolean(
                  query
                )
              }
              onClear={
                () => {
                  setFilter(
                    "todas"
                  );

                  setQuery(
                    ""
                  );
                }
              }
            />
          ) : (
            <div>
              {criticalEntries.length >
                0 && (
                <QueueGroup
                  title="Críticas"
                  description="Ocorrências que exigem prioridade imediata."
                  entries={
                    criticalEntries
                  }
                  tone="error"
                  onSelect={
                    setSelectedEntry
                  }
                />
              )}

              {warningEntries.length >
                0 && (
                <QueueGroup
                  title="Em atenção"
                  description="Itens que precisam ser acompanhados antes de se tornarem críticos."
                  entries={
                    warningEntries
                  }
                  tone="warning"
                  onSelect={
                    setSelectedEntry
                  }
                />
              )}

              {infoEntries.length >
                0 && (
                <QueueGroup
                  title="Informativas"
                  description="Ocorrências de acompanhamento."
                  entries={
                    infoEntries
                  }
                  tone="info"
                  onSelect={
                    setSelectedEntry
                  }
                />
              )}
            </div>
          )}
        </section>

        {/* ===================================================
            FOOTER
        ==================================================== */}

        <footer className="mt-7 flex flex-col gap-2 border-t border-base-300/60 py-5 text-[8px] font-[550] text-base-content/25 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="status status-success status-xs" />

            Resumo gerado em{" "}
            {formatGeneratedAt(
              summary.generatedAt
            )}
          </div>

          <span className="uppercase tracking-[0.14em]">
            Projeta Compras OS
          </span>
        </footer>
      </main>

      {/* =====================================================
          DRAWER
      ====================================================== */}

      <PendingDrawer
        entry={
          selectedEntry
        }
        onClose={
          () =>
            setSelectedEntry(
              null
            )
        }
      />
    </>
  );
}

// ============================================================
// SUMMARY METRIC
// ============================================================

function SummaryMetric({
  label,
  value,
  description,
  icon: Icon,
  variant,
  active,
  onClick,
}: {
  label:
    string;

  value:
    number;

  description:
    string;

  icon:
    LucideIcon;

  variant:
    | "neutral"
    | "error"
    | "warning";

  active:
    boolean;

  onClick:
    () => void;
}) {
  const tone =
    variant ===
    "error"
      ? {
          icon:
            "bg-error/10 text-error",

          value:
            "text-error",

          border:
            "border-error/20",
        }
      : variant ===
          "warning"
        ? {
            icon:
              "bg-warning/10 text-warning",

            value:
              "text-warning",

            border:
              "border-warning/20",
          }
        : {
            icon:
              "bg-base-200 text-base-content/40",

            value:
              "text-base-content",

            border:
              "border-primary/20",
          };

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "group relative w-full overflow-hidden rounded-[20px] border bg-base-100 p-5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--projeta-shadow-md)]",
        active
          ? `${tone.border} ring-4 ring-primary/[0.025]`
          : "border-base-300",
      ].join(
        " "
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="projeta-section-label">
            {label}
          </p>

          <AnimatedNumber
            value={
              value
            }
            className={[
              "mt-3 block text-[34px] font-[750] leading-none tracking-[-0.055em]",
              tone.value,
            ].join(
              " "
            )}
          />

          <p className="mt-3 text-[9px] leading-4 text-base-content/35">
            {description}
          </p>
        </div>

        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105",
            tone.icon,
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
      </div>
    </button>
  );
}

// ============================================================
// FILTER BUTTON
// ============================================================

function FilterButton({
  label,
  count,
  active,
  onClick,
  tone = "neutral",
}: {
  label:
    string;

  count:
    number;

  active:
    boolean;

  onClick:
    () => void;

  tone?:
    | "neutral"
    | "error"
    | "warning";
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={[
        "flex h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-[650] transition",
        active
          ? "bg-base-100 text-base-content shadow-sm ring-1 ring-base-300"
          : "text-base-content/40 hover:bg-base-100/60 hover:text-base-content/70",
      ].join(
        " "
      )}
    >
      {label}

      <span
        className={[
          "flex min-w-5 items-center justify-center rounded-md px-1.5 py-0.5 text-[8px] font-[750]",
          active &&
          tone ===
            "error"
            ? "bg-error/10 text-error"
            : active &&
                tone ===
                  "warning"
              ? "bg-warning/10 text-warning"
              : active
                ? "bg-primary/10 text-primary"
                : "bg-base-300/60 text-base-content/35",
        ].join(
          " "
        )}
      >
        {count >
        999
          ? "999+"
          : count}
      </span>
    </button>
  );
}

// ============================================================
// GROUP
// ============================================================

function QueueGroup({
  title,
  description,
  entries,
  tone,
  onSelect,
}: {
  title:
    string;

  description:
    string;

  entries:
    PendingEntry[];

  tone:
    | "error"
    | "warning"
    | "info";

  onSelect:
    (
      entry:
        PendingEntry
    ) => void;
}) {
  const dot =
    tone ===
    "error"
      ? "bg-error"
      : tone ===
          "warning"
        ? "bg-warning"
        : "bg-info";

  return (
    <section className="border-b border-base-300/70 last:border-b-0">
      <div className="flex items-center justify-between gap-4 bg-base-200/20 px-5 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span
            className={[
              "h-2 w-2 rounded-full",
              dot,
            ].join(
              " "
            )}
          />

          <div>
            <p className="text-[10px] font-[750] uppercase tracking-[0.1em] text-base-content/55">
              {title}
            </p>

            <p className="mt-0.5 hidden text-[8px] text-base-content/25 sm:block">
              {description}
            </p>
          </div>
        </div>

        <span className="rounded-lg bg-base-100 px-2 py-1 text-[9px] font-[750] tabular-nums text-base-content/40 shadow-sm">
          {
            entries.length
          }
        </span>
      </div>

      {/*
       * LISTA ESTÁTICA
       *
       * Sem MotionList.
       * Sem MotionListItem.
       * Sem content-visibility.
       *
       * Os registros sempre entram no DOM visíveis.
       */}

      <div className="divide-y divide-base-300/60">
        {entries.map(
          (
            entry
          ) => (
            <PendingRow
              key={
                entry.id
              }
              entry={
                entry
              }
              onClick={
                () =>
                  onSelect(
                    entry
                  )
              }
            />
          )
        )}
      </div>
    </section>
  );
}

// ============================================================
// ROW
// ============================================================

function PendingRow({
  entry,
  onClick,
}: {
  entry:
    PendingEntry;

  onClick:
    () => void;
}) {
  const Icon =
    pendingIcons[
      entry.icon
    ];

  const tone =
    getPriorityTone(
      entry.priority
    );

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className="group relative flex w-full gap-4 px-5 py-4 text-left transition-colors hover:bg-base-200/40 sm:px-6 sm:py-5"
    >
      <span
        className={[
          "absolute bottom-4 left-0 top-4 w-[3px] rounded-r-full opacity-80",
          tone.indicator,
        ].join(
          " "
        )}
      />

      <div
        className={[
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] transition-transform duration-200 group-hover:scale-[1.04]",
          tone.icon,
        ].join(
          " "
        )}
      >
        <Icon
          size={
            18
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[12px] font-[700] text-base-content/75 transition group-hover:text-base-content">
                {entry.title}
              </p>

              <span
                className={[
                  "badge badge-sm",
                  tone.badge,
                ].join(
                  " "
                )}
              >
                {getTypeLabel(
                  entry.type
                )}
              </span>
            </div>

            <p className="mt-1.5 line-clamp-2 text-[10px] leading-[18px] text-base-content/42">
              {
                entry.description
              }
            </p>

            {(entry.meta ||
              entry.secondary) && (
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[9px] font-[500] text-base-content/30">
                {entry.meta && (
                  <span>
                    {entry.meta}
                  </span>
                )}

                {entry.secondary && (
                  <>
                    <span className="hidden h-1 w-1 rounded-full bg-base-content/15 sm:block" />

                    <span>
                      {
                        entry.secondary
                      }
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3 lg:pl-5">
            {entry.value && (
              <span
                className={[
                  "text-[11px] font-[750] tabular-nums",
                  tone.value,
                ].join(
                  " "
                )}
              >
                {entry.value}
              </span>
            )}

            <div className="flex h-8 w-8 items-center justify-center rounded-lg text-base-content/20 transition group-hover:bg-base-200 group-hover:text-primary">
              <ChevronRight
                size={
                  14
                }
                className="transition-transform group-hover:translate-x-0.5"
              />
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================================
// DRAWER
// ============================================================

function PendingDrawer({
  entry,
  onClose,
}: {
  entry:
    PendingEntry
    | null;

  onClose:
    () => void;
}) {
  const reduceMotion =
    useReducedMotion();

  // =========================================================
  // ESC + SCROLL LOCK
  // =========================================================

  useEffect(
    () => {
      if (
        !entry
      ) {
        return;
      }

      const previousOverflow =
        document.body.style.overflow;

      document.body.style.overflow =
        "hidden";

      const handleKeyDown =
        (
          event:
            KeyboardEvent
        ) => {
          if (
            event.key ===
            "Escape"
          ) {
            onClose();
          }
        };

      window.addEventListener(
        "keydown",
        handleKeyDown
      );

      return () => {
        document.body.style.overflow =
          previousOverflow;

        window.removeEventListener(
          "keydown",
          handleKeyDown
        );
      };
    },
    [
      entry,
      onClose,
    ]
  );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <AnimatePresence>
      {entry && (
        <>
          {/* OVERLAY */}

          <motion.button
            type="button"
            aria-label="Fechar painel"
            onClick={
              onClose
            }
            initial={
              reduceMotion
                ? false
                : {
                    opacity:
                      0,
                  }
            }
            animate={{
              opacity:
                1,
            }}
            exit={{
              opacity:
                0,
            }}
            transition={{
              duration:
                reduceMotion
                  ? 0
                  : 0.2,
            }}
            className="fixed inset-0 z-[90] cursor-default bg-black/25 backdrop-blur-[2px]"
          />

          {/* PANEL */}

          <motion.aside
            initial={
              reduceMotion
                ? false
                : {
                    x:
                      "100%",
                  }
            }
            animate={{
              x:
                0,
            }}
            exit={{
              x:
                "100%",
            }}
            transition={
              reduceMotion
                ? {
                    duration:
                      0,
                  }
                : {
                    type:
                      "spring",

                    stiffness:
                      330,

                    damping:
                      34,

                    mass:
                      0.85,
                  }
            }
            className="fixed bottom-0 right-0 top-0 z-[100] flex w-full max-w-[470px] flex-col border-l border-base-300 bg-base-100 shadow-2xl"
          >
            <PendingDrawerContent
              entry={
                entry
              }
              onClose={
                onClose
              }
            />
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// DRAWER CONTENT
// ============================================================

function PendingDrawerContent({
  entry,
  onClose,
}: {
  entry:
    PendingEntry;

  onClose:
    () => void;
}) {
  const Icon =
    pendingIcons[
      entry.icon
    ];

  const tone =
    getPriorityTone(
      entry.priority
    );

  return (
    <>
      {/* HEADER */}

      <div className="border-b border-base-300/70 px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div
            className={[
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px]",
              tone.icon,
            ].join(
              " "
            )}
          >
            <Icon
              size={
                18
              }
            />
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-base-content/30 transition hover:bg-base-200 hover:text-base-content"
            aria-label="Fechar"
          >
            <X
              size={
                16
              }
            />
          </button>
        </div>

        <div className="mt-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={[
                "badge badge-sm",
                tone.badge,
              ].join(
                " "
              )}
            >
              {getPriorityLabel(
                entry.priority
              )}
            </span>

            <span className="badge badge-ghost badge-sm">
              {getTypeLabel(
                entry.type
              )}
            </span>
          </div>

          <h2 className="mt-3 text-[19px] font-[750] leading-7 tracking-[-0.035em] text-base-content">
            {entry.title}
          </h2>

          <p className="mt-2 text-[11px] leading-5 text-base-content/42">
            {entry.description}
          </p>
        </div>
      </div>

      {/* CONTENT */}

      <div className="projeta-sidebar-scroll flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        {/* VALUE */}

        {entry.value && (
          <div
            className={[
              "mb-5 flex items-center justify-between rounded-[16px] border p-4",
              entry.priority ===
              "critical"
                ? "border-error/15 bg-error/[0.035]"
                : "border-warning/15 bg-warning/[0.035]",
            ].join(
              " "
            )}
          >
            <div>
              <p className="text-[8px] font-[700] uppercase tracking-[0.12em] text-base-content/30">
                Indicador
              </p>

              <p
                className={[
                  "mt-2 text-[23px] font-[750] tracking-[-0.04em]",
                  tone.value,
                ].join(
                  " "
                )}
              >
                {entry.value}
              </p>
            </div>

            {entry.priority ===
            "critical" ? (
              <AlertTriangle
                size={
                  20
                }
                className="text-error/50"
              />
            ) : (
              <TriangleAlert
                size={
                  20
                }
                className="text-warning/50"
              />
            )}
          </div>
        )}

        {/* DETAILS */}

        <div>
          <p className="projeta-section-label">
            Informações da ocorrência
          </p>

          <div className="mt-3 overflow-hidden rounded-[16px] border border-base-300/80">
            {entry.details.map(
              (
                detail,
                index
              ) => (
                <div
                  key={`${detail.label}-${index}`}
                  className="flex items-start justify-between gap-5 border-b border-base-300/60 px-4 py-3.5 last:border-b-0"
                >
                  <span className="text-[9px] font-[600] text-base-content/35">
                    {detail.label}
                  </span>

                  <span className="max-w-[62%] text-right text-[10px] font-[650] leading-5 text-base-content/65">
                    {detail.value}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        {/* CONTEXT */}

        {(entry.meta ||
          entry.secondary) && (
          <div className="mt-6">
            <p className="projeta-section-label">
              Contexto
            </p>

            <div className="mt-3 rounded-[16px] bg-base-200/45 p-4">
              {entry.meta && (
                <p className="text-[10px] font-[650] text-base-content/60">
                  {entry.meta}
                </p>
              )}

              {entry.secondary && (
                <p className="mt-1 text-[9px] text-base-content/35">
                  {
                    entry.secondary
                  }
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER */}

      <div className="border-t border-base-300 bg-base-100 p-4 sm:p-5">
        <Link
          href={
            entry.href
          }
          className="btn btn-primary h-11 w-full rounded-xl text-[10px]"
        >
          {entry.actionLabel}

          <ExternalLink
            size={
              13
            }
          />
        </Link>

        <button
          type="button"
          onClick={
            onClose
          }
          className="btn btn-ghost mt-2 h-10 w-full rounded-xl text-[10px]"
        >
          Voltar para a fila
        </button>
      </div>
    </>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters:
    boolean;

  onClear:
    () => void;
}) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[22px] bg-success/10 text-success">
        <CheckCircle2
          size={
            27
          }
        />
      </div>

      <h3 className="mt-5 text-[15px] font-[700]">
        Nenhuma pendência encontrada
      </h3>

      <p className="mt-2 max-w-sm text-[10px] leading-5 text-base-content/40">
        {hasFilters
          ? "Não existem ocorrências que correspondam aos filtros atuais."
          : "A operação está em dia para os monitores disponíveis."}
      </p>

      {hasFilters && (
        <button
          type="button"
          onClick={
            onClear
          }
          className="btn btn-ghost btn-sm mt-5 rounded-xl"
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}

// ============================================================
// PRIORITY TONE
// ============================================================

function getPriorityTone(
  priority:
    PendingPriority
) {
  if (
    priority ===
    "critical"
  ) {
    return {
      icon:
        "bg-error/10 text-error",

      badge:
        "badge-error",

      indicator:
        "bg-error",

      value:
        "text-error",
    };
  }

  if (
    priority ===
    "warning"
  ) {
    return {
      icon:
        "bg-warning/10 text-warning",

      badge:
        "badge-warning",

      indicator:
        "bg-warning",

      value:
        "text-warning",
    };
  }

  return {
    icon:
      "bg-info/10 text-info",

    badge:
      "badge-info",

    indicator:
      "bg-info",

    value:
      "text-info",
  };
}

// ============================================================
// LABELS
// ============================================================

function getPriorityLabel(
  priority:
    PendingPriority
) {
  switch (
    priority
  ) {
    case "critical":
      return "Crítico";

    case "warning":
      return "Em atenção";

    case "info":
      return "Informativo";
  }
}

function getTypeLabel(
  type:
    PendingType
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
      return "Vínculo";

    case "alertas":
      return "Alerta";
  }
}

// ============================================================
// SEARCH
// ============================================================

function normalizeSearch(
  value:
    string
) {
  return value
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
// GENERATED AT
// ============================================================

function formatGeneratedAt(
  value:
    string
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

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    date
  );
}