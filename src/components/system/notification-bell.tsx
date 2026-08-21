import { markAllNotificationsRead, openNotification } from "@/app/(system)/notificacoes/actions";
import { createClient } from "@/lib/supabase/server";
import { Bell, CheckCheck, CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import Link from "next/link";

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
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(
    new Date(value)
  );
}

export default async function NotificationBell() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    return null;
  }

  const [
    notificationsResult,
    unreadResult,
  ] =
    await Promise.all([
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
            ascending: false,
          }
        )
        .limit(6),

      supabase
        .from(
          "system_notifications"
        )
        .select(
          "id",
          {
            count: "exact",
            head: true,
          }
        )
        .eq(
          "user_id",
          userId
        )
        .is(
          "read_at",
          null
        ),
    ]);

  if (
    notificationsResult.error
  ) {
    console.error(
      "Erro ao carregar notificações:",
      notificationsResult.error
    );
  }

  const notifications =
    (
      notificationsResult.data ??
      []
    ) as NotificationRow[];

  const unreadCount =
    unreadResult.count ??
    0;

  return (
    <details className="dropdown dropdown-end">
      {/* =====================================================
          SINO
      ====================================================== */}

      <summary
        className={[
          "btn btn-circle btn-sm relative border border-base-300 bg-base-100 shadow-sm",
          unreadCount >
          0
            ? "text-primary"
            : "text-base-content/50",
        ].join(" ")}
        aria-label="Notificações"
      >
        <Bell
          size={18}
        />

        {unreadCount >
          0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-content shadow-sm">
            {unreadCount >
            99
              ? "99+"
              : unreadCount}
          </span>
        )}
      </summary>

      {/* =====================================================
          DROPDOWN
      ====================================================== */}

      <div className="dropdown-content z-[100] mt-3 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl">
        {/* CABEÇALHO */}

        <div className="flex items-center justify-between border-b border-base-300 px-4 py-4">
          <div>
            <p className="text-sm font-semibold text-base-content">
              Notificações
            </p>

            <p className="mt-0.5 text-[11px] text-base-content/45">
              {unreadCount ===
              0
                ? "Nenhuma notificação nova"
                : `${unreadCount} não lida${
                    unreadCount ===
                    1
                      ? ""
                      : "s"
                  }`}
            </p>
          </div>

          {unreadCount >
            0 && (
            <form
              action={
                markAllNotificationsRead
              }
            >
              <button
                type="submit"
                className="btn btn-ghost btn-xs gap-1.5"
              >
                <CheckCheck
                  size={14}
                />

                Ler todas
              </button>
            </form>
          )}
        </div>

        {/* LISTA */}

        {notifications.length ===
        0 ? (
          <div className="flex min-h-52 flex-col items-center justify-center p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-base-200 text-base-content/30">
              <Bell
                size={22}
              />
            </div>

            <p className="mt-3 text-sm font-semibold">
              Tudo tranquilo por aqui
            </p>

            <p className="mt-1 max-w-[240px] text-xs text-base-content/45">
              Novas atualizações aparecerão nesta área.
            </p>
          </div>
        ) : (
          <div className="max-h-[430px] overflow-y-auto">
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
                  <form
                    key={
                      notification.id
                    }
                    action={
                      action
                    }
                  >
                    <button
                      type="submit"
                      className={[
                        "group flex w-full gap-3 border-b border-base-300 px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-base-200/60",
                        notification.read_at
                          ? ""
                          : "bg-primary/[0.035]",
                      ].join(" ")}
                    >
                      <NotificationIcon
                        level={
                          notification.level
                        }
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="flex-1 text-xs font-semibold leading-5 text-base-content">
                            {
                              notification.title
                            }
                          </p>

                          {!notification.read_at && (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                          )}
                        </div>

                        {notification.message && (
                          <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-base-content/50">
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
                );
              }
            )}
          </div>
        )}

        {/* RODAPÉ */}

        <div className="border-t border-base-300 p-2">
          <Link
            href="/notificacoes"
            className="btn btn-ghost btn-sm w-full"
          >
            Ver todas as notificações
          </Link>
        </div>
      </div>
    </details>
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
        <CircleCheck
          size={17}
        />
      </div>
    );
  }

  if (
    level ===
    "warning"
  ) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning">
        <TriangleAlert
          size={17}
        />
      </div>
    );
  }

  if (
    level ===
    "error"
  ) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-error/10 text-error">
        <CircleAlert
          size={17}
        />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-info/10 text-info">
      <Info
        size={17}
      />
    </div>
  );
}