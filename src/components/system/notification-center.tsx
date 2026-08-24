"use client";

import {
  useState,
} from "react";

import Link from "next/link";

import {
  Bell,
  CheckCheck,
  ChevronRight,
  CircleAlert,
  CircleCheck,
  Clock3,
  Inbox,
  Info,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "motion/react";

import {
  markAllNotificationsRead,
  openNotification,
} from "@/app/(system)/notificacoes/actions";

import type {
  NotificationItem,
} from "@/components/system/notification-bell";

// ============================================================
// TIPOS
// ============================================================

type NotificationCenterProps = {
  notifications: NotificationItem[];

  unreadCount: number;
};

// ============================================================
// COMPONENTE
// ============================================================

export default function NotificationCenter({
  notifications,
  unreadCount,
}: NotificationCenterProps) {
  const reduceMotion =
    useReducedMotion();

  const [
    open,
    setOpen,
  ] =
    useState(
      false
    );

  // =========================================================
  // CONTADORES
  // =========================================================

  const criticalCount =
    notifications.filter(
      (
        notification
      ) =>
        !notification.read_at &&
        (
          notification.level ===
            "error" ||
          notification.level ===
            "warning"
        )
    ).length;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      {/* =====================================================
          TRIGGER
      ====================================================== */}

      <button
        type="button"
        onClick={() =>
          setOpen(
            true
          )
        }
        aria-label="Abrir notificações"
        title="Notificações"
        className={[
          "group relative flex h-10 w-10 items-center justify-center rounded-xl border transition-all",
          unreadCount >
          0
            ? "border-primary/15 bg-primary/[0.045] text-primary hover:bg-primary/[0.08]"
            : "border-base-300/80 bg-base-100 text-base-content/40 hover:bg-base-200 hover:text-base-content/65",
        ].join(
          " "
        )}
      >
        <Bell
          size={
            17
          }
          className="transition-transform duration-200 group-hover:-rotate-6"
        />

        {unreadCount >
          0 && (
          <>
            <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-base-100 bg-[#AF1B1B] px-1 text-[8px] font-bold leading-none text-white shadow-sm">
              {unreadCount >
              99
                ? "99+"
                : unreadCount}
            </span>

            <span className="absolute right-[5px] top-[5px] h-1.5 w-1.5 rounded-full bg-[#AF1B1B]" />
          </>
        )}
      </button>

      {/* =====================================================
          DRAWER
      ====================================================== */}

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-[220]">
            {/* ===============================================
                BACKDROP
            ================================================ */}

            <motion.button
              type="button"
              aria-label="Fechar notificações"
              onClick={() =>
                setOpen(
                  false
                )
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
                  0.16,
              }}
              className="absolute inset-0 bg-black/35 backdrop-blur-[3px]"
            />

            {/* ===============================================
                PAINEL
            ================================================ */}

            <motion.aside
              initial={
                reduceMotion
                  ? false
                  : {
                      x:
                        36,

                      opacity:
                        0,
                    }
              }
              animate={{
                x:
                  0,

                opacity:
                  1,
              }}
              exit={{
                x:
                  30,

                opacity:
                  0,
              }}
              transition={{
                duration:
                  0.2,

                ease: [
                  0.22,
                  1,
                  0.36,
                  1,
                ],
              }}
              className="absolute bottom-0 right-0 top-0 flex w-full max-w-[430px] flex-col border-l border-base-300 bg-base-100 shadow-[-20px_0_70px_rgba(0,0,0,0.16)]"
            >
              {/* =============================================
                  HEADER
              ============================================== */}

              <header className="shrink-0 border-b border-base-300">
                <div className="flex items-start justify-between px-5 pb-4 pt-5">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
                        Central de notificações
                      </h2>

                      {unreadCount >
                        0 && (
                        <span className="badge badge-primary badge-sm">
                          {
                            unreadCount
                          }
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-[10px] leading-5 text-base-content/40">
                      Atualizações importantes da sua operação.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setOpen(
                        false
                      )
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-base-content/35 transition hover:bg-base-200 hover:text-base-content"
                  >
                    <X
                      size={
                        17
                      }
                    />
                  </button>
                </div>

                {/* ===========================================
                    STATUS BAR
                ============================================ */}

                <div className="flex items-center justify-between border-t border-base-300/60 bg-base-200/25 px-5 py-2.5">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-[9px] font-medium text-base-content/40">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#AF1B1B]" />

                      {
                        unreadCount
                      }{" "}
                      não lida
                      {unreadCount ===
                      1
                        ? ""
                        : "s"}
                    </div>

                    {criticalCount >
                      0 && (
                      <div className="flex items-center gap-1.5 text-[9px] font-semibold text-warning">
                        <TriangleAlert
                          size={
                            11
                          }
                        />

                        {
                          criticalCount
                        }{" "}
                        prioritária
                        {criticalCount ===
                        1
                          ? ""
                          : "s"}
                      </div>
                    )}
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
                        className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[9px] font-semibold text-primary transition hover:bg-primary/[0.06]"
                      >
                        <CheckCheck
                          size={
                            13
                          }
                        />

                        Marcar todas
                      </button>
                    </form>
                  )}
                </div>
              </header>

              {/* =============================================
                  CONTEÚDO
              ============================================== */}

              <div className="projeta-notifications-scroll min-h-0 flex-1 overflow-y-auto">
                {notifications.length ===
                0 ? (
                  <EmptyNotifications />
                ) : (
                  <div>
                    {/* =======================================
                        NÃO LIDAS
                    ======================================== */}

                    {notifications.some(
                      (
                        item
                      ) =>
                        !item.read_at
                    ) && (
                      <NotificationGroup
                        title="Novas"
                        notifications={notifications.filter(
                          (
                            item
                          ) =>
                            !item.read_at
                        )}
                        onNavigate={() =>
                          setOpen(
                            false
                          )
                        }
                      />
                    )}

                    {/* =======================================
                        LIDAS
                    ======================================== */}

                    {notifications.some(
                      (
                        item
                      ) =>
                        Boolean(
                          item.read_at
                        )
                    ) && (
                      <NotificationGroup
                        title="Anteriores"
                        notifications={notifications.filter(
                          (
                            item
                          ) =>
                            Boolean(
                              item.read_at
                            )
                        )}
                        onNavigate={() =>
                          setOpen(
                            false
                          )
                        }
                      />
                    )}
                  </div>
                )}
              </div>

              {/* =============================================
                  FOOTER
              ============================================== */}

              <footer className="shrink-0 border-t border-base-300 bg-base-100 p-3">
                <Link
                  href="/notificacoes"
                  onClick={() =>
                    setOpen(
                      false
                    )
                  }
                  className="group flex h-11 w-full items-center justify-center gap-2 rounded-xl text-[10px] font-semibold text-base-content/55 transition hover:bg-base-200 hover:text-base-content"
                >
                  Ver todas as notificações

                  <ChevronRight
                    size={
                      13
                    }
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </footer>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// GRUPO
// ============================================================

function NotificationGroup({
  title,
  notifications,
  onNavigate,
}: {
  title: string;

  notifications: NotificationItem[];

  onNavigate: () => void;
}) {
  return (
    <section>
      <div className="sticky top-0 z-10 border-b border-base-300/60 bg-base-100/95 px-5 py-2.5 backdrop-blur-xl">
        <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-base-content/25">
          {
            title
          }
        </p>
      </div>

      <div>
        {notifications.map(
          (
            notification
          ) => (
            <NotificationRow
              key={
                notification.id
              }
              notification={
                notification
              }
              onNavigate={
                onNavigate
              }
            />
          )
        )}
      </div>
    </section>
  );
}

// ============================================================
// NOTIFICAÇÃO
// ============================================================

function NotificationRow({
  notification,
  onNavigate,
}: {
  notification: NotificationItem;

  onNavigate: () => void;
}) {
  const action =
    openNotification.bind(
      null,
      notification.id,
      notification.action_url
    );

  const unread =
    !notification.read_at;

  return (
    <form
      action={
        action
      }
      onSubmit={
        onNavigate
      }
    >
      <button
        type="submit"
        className={[
          "group relative flex w-full gap-3 border-b border-base-300/60 px-5 py-4 text-left transition-all duration-200",
          unread
            ? "bg-primary/[0.025] hover:bg-primary/[0.055]"
            : "hover:bg-base-200/55",
        ].join(
          " "
        )}
      >
        {/* ===============================================
            INDICADOR
        ================================================ */}

        {unread && (
          <span className="absolute bottom-0 left-0 top-0 w-[2px] bg-[#AF1B1B]" />
        )}

        {/* ===============================================
            ÍCONE
        ================================================ */}

        <NotificationIcon
          level={
            notification.level
          }
        />

        {/* ===============================================
            CONTEÚDO
        ================================================ */}

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-3">
            <p
              className={[
                "min-w-0 flex-1 text-[11px] leading-5",
                unread
                  ? "font-semibold text-base-content/85"
                  : "font-medium text-base-content/65",
              ].join(
                " "
              )}
            >
              {
                notification.title
              }
            </p>

            {unread && (
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#AF1B1B]" />
            )}
          </div>

          {notification.message && (
            <p className="mt-1 line-clamp-2 text-[10px] leading-[17px] text-base-content/40">
              {
                notification.message
              }
            </p>
          )}

          <div className="mt-2.5 flex items-center gap-2">
            <Clock3
              size={
                10
              }
              className="text-base-content/20"
            />

            <span className="text-[8px] font-medium text-base-content/30">
              {formatRelativeDate(
                notification.created_at
              )}
            </span>

            {notification.category && (
              <>
                <span className="h-0.5 w-0.5 rounded-full bg-base-content/20" />

                <span className="max-w-[130px] truncate text-[8px] font-medium capitalize text-base-content/30">
                  {formatCategory(
                    notification.category
                  )}
                </span>
              </>
            )}
          </div>
        </div>

        {/* ===============================================
            HOVER ARROW
        ================================================ */}

        {notification.action_url && (
          <ChevronRight
            size={
              14
            }
            className="mt-1 translate-x-1 shrink-0 text-base-content/0 transition group-hover:translate-x-0 group-hover:text-base-content/20"
          />
        )}
      </button>
    </form>
  );
}

// ============================================================
// EMPTY
// ============================================================

function EmptyNotifications() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-8 text-center">
      <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] border border-base-300 bg-base-200/50">
        <Inbox
          size={
            25
          }
          className="text-base-content/20"
        />

        <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-[3px] border-base-100 bg-success" />
      </div>

      <p className="mt-5 text-sm font-semibold tracking-[-0.01em]">
        Tudo em dia
      </p>

      <p className="mt-2 max-w-[250px] text-[10px] leading-5 text-base-content/40">
        Quando alguma solicitação, pedido ou processo
        precisar da sua atenção, aparecerá aqui.
      </p>
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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/[0.08] text-success">
        <CircleCheck
          size={
            16
          }
        />
      </div>
    );
  }

  if (
    level ===
    "warning"
  ) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-warning/[0.09] text-warning">
        <TriangleAlert
          size={
            16
          }
        />
      </div>
    );
  }

  if (
    level ===
    "error"
  ) {
    return (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-error/[0.08] text-error">
        <CircleAlert
          size={
            16
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-info/[0.08] text-info">
      <Info
        size={
          16
        }
      />
    </div>
  );
}

// ============================================================
// DATA RELATIVA
// ============================================================

function formatRelativeDate(
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
    return "Agora";
  }

  const now =
    new Date();

  const diff =
    Math.max(
      0,
      now.getTime() -
        date.getTime()
    );

  const minutes =
    Math.floor(
      diff /
        60000
    );

  const hours =
    Math.floor(
      minutes /
        60
    );

  const days =
    Math.floor(
      hours /
        24
    );

  if (
    minutes <
    1
  ) {
    return "Agora";
  }

  if (
    minutes <
    60
  ) {
    return `há ${minutes} min`;
  }

  if (
    hours <
    24
  ) {
    return `há ${hours}h`;
  }

  if (
    days ===
    1
  ) {
    return "Ontem";
  }

  if (
    days <
    7
  ) {
    return `há ${days} dias`;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day:
        "2-digit",

      month:
        "short",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    date
  );
}

// ============================================================
// CATEGORIA
// ============================================================

function formatCategory(
  value: string
) {
  return value
    .replace(
      /_/g,
      " "
    )
    .toLowerCase();
}