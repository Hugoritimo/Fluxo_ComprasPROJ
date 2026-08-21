import { MotionCard, MotionList, MotionListItem, MotionPage, MotionReveal, MotionStatus } from "@/components/ui/motion";
import { createClient } from "@/lib/supabase/server";
import { Bell, CheckCheck, CircleAlert, CircleCheck, Inbox, Info, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { markAllNotificationsRead, openNotification } from "./actions";

type PageProps = {
  searchParams: Promise<{
    filtro?: string;
  }>;
};

type NotificationRow = {
  id: string;

  title: string;

  message:
    | string
    | null;

  level: string;

  category: string;

  action_url:
    | string
    | null;

  read_at:
    | string
    | null;

  created_at: string;
};

function formatDateTime(
  value: string
) {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle:
        "medium",

      timeStyle:
        "short",
    }
  ).format(
    new Date(value)
  );
}

export default async function NotificationsPage({
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

  const filter =
    params.filtro ===
    "nao-lidas"
      ? "nao-lidas"
      : "todas";

  // =========================================================
  // RESUMO
  // =========================================================

  const {
    data: summaryData,
  } =
    await supabase
      .from(
        "v_my_notification_summary"
      )
      .select("*")
      .maybeSingle();

  const summary = {
    total:
      summaryData?.total ??
      0,

    unread:
      summaryData?.unread ??
      0,

    warnings:
      summaryData?.warnings ??
      0,

    errors:
      summaryData?.errors ??
      0,
  };

  // =========================================================
  // NOTIFICAÇÕES
  // =========================================================

  let query =
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
        category,
        action_url,
        read_at,
        created_at
        `
      )
      .eq(
        "user_id",
        userId
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      )
      .limit(100);

  if (
    filter ===
    "nao-lidas"
  ) {
    query =
      query.is(
        "read_at",
        null
      );
  }

  const {
    data,
    error,
  } =
    await query;

  if (error) {
    console.error(
      "Erro ao carregar notificações:",
      error
    );
  }

  const notifications =
    (
      data ??
      []
    ) as NotificationRow[];

  return (
    <MotionPage className="mx-auto max-w-[1500px]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <MotionReveal>
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-primary">
              <Bell
                size={17}
              />

              <p className="text-sm font-semibold">
                Central
              </p>
            </div>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-base-content">
              Notificações
            </h1>

            <p className="mt-2 max-w-2xl text-sm text-base-content/50">
              Acompanhe alterações em solicitações, compras e entregas.
            </p>
          </div>

          {summary.unread >
            0 && (
            <form
              action={
                markAllNotificationsRead
              }
            >
              <button
                type="submit"
                className="btn btn-outline btn-sm gap-2"
              >
                <CheckCheck
                  size={16}
                />

                Marcar todas como lidas
              </button>
            </form>
          )}
        </div>
      </MotionReveal>

      {/* =====================================================
          CARDS
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MotionCard
          delay={0.05}
        >
          <SummaryCard
            icon={
              Inbox
            }
            label="Total"
            value={
              summary.total
            }
          />
        </MotionCard>

        <MotionCard
          delay={0.1}
        >
          <SummaryCard
            icon={
              Bell
            }
            label="Não lidas"
            value={
              summary.unread
            }
            variant="primary"
          />
        </MotionCard>

        <MotionCard
          delay={0.15}
        >
          <SummaryCard
            icon={
              TriangleAlert
            }
            label="Atenção"
            value={
              summary.warnings
            }
            variant="warning"
          />
        </MotionCard>

        <MotionCard
          delay={0.2}
        >
          <SummaryCard
            icon={
              CircleAlert
            }
            label="Críticas"
            value={
              summary.errors
            }
            variant="error"
          />
        </MotionCard>
      </div>

      {/* =====================================================
          FILTROS
      ====================================================== */}

      <MotionReveal
        delay={0.12}
      >
        <div className="mb-6 flex gap-2">
          <Link
            href="/notificacoes"
            className={[
              "btn btn-sm",
              filter ===
              "todas"
                ? "btn-primary"
                : "btn-ghost",
            ].join(" ")}
          >
            Todas
          </Link>

          <Link
            href="/notificacoes?filtro=nao-lidas"
            className={[
              "btn btn-sm",
              filter ===
              "nao-lidas"
                ? "btn-primary"
                : "btn-ghost",
            ].join(" ")}
          >
            Não lidas

            {summary.unread >
              0 && (
              <span className="badge badge-sm">
                {
                  summary.unread
                }
              </span>
            )}
          </Link>
        </div>
      </MotionReveal>

      {/* =====================================================
          LISTA
      ====================================================== */}

      <MotionReveal
        delay={0.17}
      >
        <section className="card overflow-hidden border border-base-300 bg-base-100">
          <div className="border-b border-base-300 px-6 py-5">
            <h2 className="font-semibold text-base-content">
              {filter ===
              "nao-lidas"
                ? "Notificações não lidas"
                : "Histórico de notificações"}
            </h2>

            <p className="mt-1 text-xs text-base-content/45">
              {
                notifications.length
              }{" "}
              registro
              {notifications.length ===
              1
                ? ""
                : "s"}
            </p>
          </div>

          {notifications.length ===
          0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-base-200 text-base-content/30">
                <Bell
                  size={25}
                />
              </div>

              <p className="mt-4 text-sm font-semibold">
                Nenhuma notificação encontrada
              </p>

              <p className="mt-1 text-xs text-base-content/45">
                Você está em dia.
              </p>
            </div>
          ) : (
            <MotionList className="divide-y divide-base-300">
              {notifications.map(
                (
                  notification
                ) => {
                  const action =
                    openNotification.bind(
                      null,
                      notification.id,
                      notification.action_url
                    );

                  return (
                    <MotionListItem
                      key={
                        notification.id
                      }
                    >
                      <form
                        action={
                          action
                        }
                      >
                        <button
                          type="submit"
                          className={[
                            "group flex w-full gap-4 px-6 py-5 text-left transition-colors hover:bg-base-200/50",
                            notification.read_at
                              ? ""
                              : "bg-primary/[0.025]",
                          ].join(" ")}
                        >
                          <NotificationIcon
                            level={
                              notification.level
                            }
                          />

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-base-content">
                                {
                                  notification.title
                                }
                              </p>

                              {!notification.read_at && (
                                <MotionStatus>
                                  <span className="badge badge-primary badge-sm">
                                    Nova
                                  </span>
                                </MotionStatus>
                              )}
                            </div>

                            {notification.message && (
                              <p className="mt-1 text-xs leading-5 text-base-content/55">
                                {
                                  notification.message
                                }
                              </p>
                            )}

                            <p className="mt-2 text-[10px] font-medium text-base-content/35">
                              {formatDateTime(
                                notification.created_at
                              )}
                            </p>
                          </div>
                        </button>
                      </form>
                    </MotionListItem>
                  );
                }
              )}
            </MotionList>
          )}
        </section>
      </MotionReveal>
    </MotionPage>
  );
}

// ============================================================
// CARD
// ============================================================

function SummaryCard({
  icon: Icon,
  label,
  value,
  variant = "default",
}: {
  icon: typeof Bell;

  label: string;

  value: number;

  variant?:
    | "default"
    | "primary"
    | "warning"
    | "error";
}) {
  const iconClass =
    variant ===
    "primary"
      ? "bg-primary/10 text-primary"
      : variant ===
          "warning"
        ? "bg-warning/10 text-warning"
        : variant ===
            "error"
          ? "bg-error/10 text-error"
          : "bg-base-200 text-base-content/45";

  return (
    <div className="card interactive-card h-full border border-base-300 bg-base-100">
      <div className="card-body p-5">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-box ${iconClass}`}
        >
          <Icon
            size={18}
          />
        </div>

        <p className="mt-2 text-2xl font-semibold">
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
// ÍCONE
// ============================================================

function NotificationIcon({
  level,
}: {
  level: string;
}) {
  if (
    level ===
    "success"
  ) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
        <CircleCheck
          size={18}
        />
      </div>
    );
  }

  if (
    level ===
    "warning"
  ) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
        <TriangleAlert
          size={18}
        />
      </div>
    );
  }

  if (
    level ===
    "error"
  ) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
        <CircleAlert
          size={18}
        />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
      <Info
        size={18}
      />
    </div>
  );
}