"use client";

import type {
  ReactNode,
} from "react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  AlertTriangle,
  CreditCard,
  FileCheck2,
  FileSpreadsheet,
  Gauge,
  LayoutDashboard,
  ListTodo,
  LogOut,
  PackageSearch,
  RotateCcw,
  Send,
  UsersRound,
  WalletCards,
} from "lucide-react";

import {
  logout,
} from "@/app/actions/auth";

// ============================================================
// TIPOS
// ============================================================

type SystemSidebarProps = {
  profile: {
    full_name: string;
    email: string;
  };

  roles: string[];
};

type PendingCountResponse = {
  total: number;

  critical: number;

  categories: {
    sla: number;

    warning: number;

    deliveries: number;

    unmatched: number;

    alerts: number;
  };
};

// ============================================================
// COMPONENTE
// ============================================================

export default function SystemSidebar({
  profile,
  roles,
}: SystemSidebarProps) {
  const pathname =
    usePathname();

  // =========================================================
  // ESTADO DE PENDÊNCIAS
  // =========================================================

  const [
    pendingCount,
    setPendingCount,
  ] =
    useState(
      0
    );

  const [
    criticalCount,
    setCriticalCount,
  ] =
    useState(
      0
    );

  const [
    loadingPending,
    setLoadingPending,
  ] =
    useState(
      true
    );

  // =========================================================
  // PERMISSÕES
  // =========================================================

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
  // CARREGAR CONTADOR
  // =========================================================

  const loadPendingCount =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/pendencias/count",
              {
                method:
                  "GET",

                cache:
                  "no-store",
              }
            );

          if (
            !response.ok
          ) {
            return;
          }

          const data =
            (
              await response.json()
            ) as PendingCountResponse;

          setPendingCount(
            Number(
              data.total ??
                0
            )
          );

          setCriticalCount(
            Number(
              data.critical ??
                0
            )
          );
        } catch (
          error
        ) {
          console.error(
            "Erro ao carregar contador de pendências:",
            error
          );
        } finally {
          setLoadingPending(
            false
          );
        }
      },
      []
    );

  // =========================================================
  // ATUALIZAÇÃO AUTOMÁTICA
  // =========================================================

  useEffect(
    () => {
      void loadPendingCount();

      const interval =
        window.setInterval(
          () => {
            void loadPendingCount();
          },
          60000
        );

      const handleFocus =
        () => {
          void loadPendingCount();
        };

      window.addEventListener(
        "focus",
        handleFocus
      );

      return () => {
        window.clearInterval(
          interval
        );

        window.removeEventListener(
          "focus",
          handleFocus
        );
      };
    },
    [
      loadPendingCount,
      pathname,
    ]
  );

  // =========================================================
  // ROTAS
  // =========================================================

  const isDashboard =
    pathname ===
    "/dashboard";

  const isNewRequest =
    pathname.startsWith(
      "/solicitacoes/nova"
    );

  const isReturnForm =
    pathname.includes(
      "/devolucao"
    );

  const isMyRequests =
    (
      pathname ===
        "/solicitacoes" ||
      (
        pathname.startsWith(
          "/solicitacoes/"
        ) &&
        !pathname.startsWith(
          "/solicitacoes/nova"
        )
      )
    ) &&
    !isReturnForm;

  const isReturns =
    pathname ===
      "/devolucoes" ||
    isReturnForm;

  const isMyOrders =
    pathname ===
      "/meus-pedidos" ||
    pathname.startsWith(
      "/meus-pedidos/"
    );

  const isPendencias =
    pathname ===
      "/pendencias" ||
    pathname.startsWith(
      "/pendencias/"
    );

  const isFinanceRequests =
    pathname.startsWith(
      "/financeiro/solicitacoes"
    );

  const isFinanceCards =
    pathname.startsWith(
      "/financeiro/cartoes"
    );

  const isFinanceReturns =
    pathname.startsWith(
      "/financeiro/devolucoes"
    );

  const isFinanceSienge =
    pathname ===
      "/financeiro/sienge" ||
    pathname.startsWith(
      "/financeiro/sienge/"
    );

  const isAdminUsers =
    pathname.startsWith(
      "/administracao/usuarios"
    );

  // =========================================================
  // MOBILE
  //
  // Agora temos Pendências também na navegação inferior.
  // =========================================================

  const mobileColumns =
    canFinance
      ? "grid-cols-7"
      : "grid-cols-6";

  // =========================================================
  // CLASSES
  // =========================================================

  function navClass(
    active: boolean
  ) {
    return [
      "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-medium transition-all duration-200",
      active
        ? "bg-white/[0.09] text-white"
        : "text-white/45 hover:bg-white/[0.055] hover:text-white/90",
    ].join(" ");
  }

  function iconClass(
    active: boolean
  ) {
    return [
      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
      active
        ? "bg-primary text-primary-content shadow-sm"
        : "text-white/40 group-hover:bg-white/[0.06] group-hover:text-white/80",
    ].join(" ");
  }

  function mobileClass(
    active: boolean
  ) {
    return [
      "relative flex min-w-0 flex-col items-center justify-center gap-1 py-2 text-[8px] transition",
      active
        ? "text-primary"
        : "text-base-content/40",
    ].join(" ");
  }

  const initials =
    getInitials(
      profile.full_name
    );

  // =========================================================
  // TELA
  // =========================================================

  return (
    <>
      {/* =====================================================
          SIDEBAR DESKTOP
      ====================================================== */}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/[0.06] bg-[#151515] text-white lg:flex">
        {/* ===================================================
            MARCA
        ==================================================== */}

        <div className="flex h-[72px] shrink-0 items-center border-b border-white/[0.06] px-4">
          <Link
            href="/dashboard"
            className="group flex w-full items-center gap-3 rounded-xl px-2 py-2"
          >
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary font-bold text-primary-content shadow-[0_8px_25px_rgba(175,27,27,0.22)]">
              <div className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white/10 blur-sm" />

              <span className="relative">
                P
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-bold tracking-[0.05em]">
                  PROJETA
                </p>

                <span className="h-1 w-1 rounded-full bg-primary" />
              </div>

              <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.18em] text-white/30">
                Compras & Operações
              </p>
            </div>
          </Link>
        </div>

        {/* ===================================================
            MENU
        ==================================================== */}

        <nav className="projeta-sidebar-scroll flex-1 overflow-y-auto px-3 py-5">
          {/* =================================================
              VISÃO GERAL
          ================================================== */}

          <SidebarSection>
            Visão geral
          </SidebarSection>

          <div className="space-y-1">
            <Link
              href="/dashboard"
              className={navClass(
                isDashboard
              )}
            >
              {isDashboard && (
                <ActiveIndicator />
              )}

              <span
                className={iconClass(
                  isDashboard
                )}
              >
                <LayoutDashboard
                  size={16}
                />
              </span>

              Dashboard
            </Link>
          </div>

          {/* =================================================
              OPERAÇÕES
          ================================================== */}

          <SidebarDivider />

          <SidebarSection>
            Operações
          </SidebarSection>

          <div className="space-y-1">
            <Link
              href="/solicitacoes/nova"
              className={navClass(
                isNewRequest
              )}
            >
              {isNewRequest && (
                <ActiveIndicator />
              )}

              <span
                className={iconClass(
                  isNewRequest
                )}
              >
                <Send
                  size={16}
                />
              </span>

              Solicitar Cartão
            </Link>

            <Link
              href="/solicitacoes"
              className={navClass(
                isMyRequests
              )}
            >
              {isMyRequests && (
                <ActiveIndicator />
              )}

              <span
                className={iconClass(
                  isMyRequests
                )}
              >
                <CreditCard
                  size={16}
                />
              </span>

              Minhas Solicitações
            </Link>

            <Link
              href="/devolucoes"
              className={navClass(
                isReturns
              )}
            >
              {isReturns && (
                <ActiveIndicator />
              )}

              <span
                className={iconClass(
                  isReturns
                )}
              >
                <RotateCcw
                  size={16}
                />
              </span>

              Devoluções
            </Link>
          </div>

          {/* =================================================
              COMPRAS
          ================================================== */}

          <SidebarDivider />

          <SidebarSection>
            Compras
          </SidebarSection>

          <div className="space-y-1">
            <Link
              href="/meus-pedidos"
              className={navClass(
                isMyOrders
              )}
            >
              {isMyOrders && (
                <ActiveIndicator />
              )}

              <span
                className={iconClass(
                  isMyOrders
                )}
              >
                <PackageSearch
                  size={16}
                />
              </span>

              <span className="flex-1">
                Meus Pedidos
              </span>

              <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white/30">
                Sienge
              </span>
            </Link>
          </div>

          {/* =================================================
              GESTÃO
          ================================================== */}

          <SidebarDivider />

          <SidebarSection>
            Gestão
          </SidebarSection>

          <div className="space-y-1">
            <Link
              href="/pendencias"
              className={navClass(
                isPendencias
              )}
            >
              {isPendencias && (
                <ActiveIndicator />
              )}

              <span
                className={iconClass(
                  isPendencias
                )}
              >
                <ListTodo
                  size={16}
                />
              </span>

              <span className="min-w-0 flex-1">
                Pendências
              </span>

              {!loadingPending &&
                pendingCount >
                  0 && (
                  <PendingBadge
                    count={
                      pendingCount
                    }
                    critical={
                      criticalCount >
                      0
                    }
                  />
                )}
            </Link>
          </div>

          {/* =================================================
              FINANCEIRO
          ================================================== */}

          {canFinance && (
            <>
              <SidebarDivider />

              <SidebarSection>
                Financeiro
              </SidebarSection>

              <div className="space-y-1">
                <Link
                  href="/financeiro/solicitacoes"
                  className={navClass(
                    isFinanceRequests
                  )}
                >
                  {isFinanceRequests && (
                    <ActiveIndicator />
                  )}

                  <span
                    className={iconClass(
                      isFinanceRequests
                    )}
                  >
                    <WalletCards
                      size={16}
                    />
                  </span>

                  Gerenciar Solicitações
                </Link>

                <Link
                  href="/financeiro/cartoes"
                  className={navClass(
                    isFinanceCards
                  )}
                >
                  {isFinanceCards && (
                    <ActiveIndicator />
                  )}

                  <span
                    className={iconClass(
                      isFinanceCards
                    )}
                  >
                    <CreditCard
                      size={16}
                    />
                  </span>

                  Cartões Corporativos
                </Link>

                <Link
                  href="/financeiro/devolucoes"
                  className={navClass(
                    isFinanceReturns
                  )}
                >
                  {isFinanceReturns && (
                    <ActiveIndicator />
                  )}

                  <span
                    className={iconClass(
                      isFinanceReturns
                    )}
                  >
                    <FileCheck2
                      size={16}
                    />
                  </span>

                  Conferir Devoluções
                </Link>

                <Link
                  href="/financeiro/sienge"
                  className={navClass(
                    isFinanceSienge
                  )}
                >
                  {isFinanceSienge && (
                    <ActiveIndicator />
                  )}

                  <span
                    className={iconClass(
                      isFinanceSienge
                    )}
                  >
                    <FileSpreadsheet
                      size={16}
                    />
                  </span>

                  Acompanhamento Sienge
                </Link>
              </div>
            </>
          )}

          {/* =================================================
              ADMINISTRAÇÃO
          ================================================== */}

          {canAdmin && (
            <>
              <SidebarDivider />

              <SidebarSection>
                Administração
              </SidebarSection>

              <div className="space-y-1">
                <Link
                  href="/administracao/usuarios"
                  className={navClass(
                    isAdminUsers
                  )}
                >
                  {isAdminUsers && (
                    <ActiveIndicator />
                  )}

                  <span
                    className={iconClass(
                      isAdminUsers
                    )}
                  >
                    <UsersRound
                      size={16}
                    />
                  </span>

                  Usuários e Permissões
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* ===================================================
            STATUS DO SISTEMA
        ==================================================== */}

        <div className="px-3 pb-3">
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="h-2 w-2 rounded-full bg-success" />

                  <div className="absolute inset-0 animate-ping rounded-full bg-success opacity-30" />
                </div>

                <p className="text-[10px] font-medium text-white/45">
                  Sistema operacional
                </p>
              </div>

              {!loadingPending &&
                criticalCount >
                  0 && (
                  <Link
                    href="/pendencias"
                    title={`${criticalCount} pendência(s) crítica(s)`}
                    className="flex items-center gap-1 text-[9px] font-semibold text-error"
                  >
                    <AlertTriangle
                      size={12}
                    />

                    {
                      criticalCount
                    }
                  </Link>
                )}
            </div>
          </div>
        </div>

        {/* ===================================================
            PERFIL
        ==================================================== */}

        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-[10px] font-bold text-white/75">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white/75">
                {
                  profile.full_name
                }
              </p>

              <p className="truncate text-[9px] text-white/25">
                {
                  profile.email
                }
              </p>
            </div>

            <form
              action={
                logout
              }
            >
              <button
                type="submit"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/25 transition hover:bg-white/[0.06] hover:text-error"
                title="Sair"
              >
                <LogOut
                  size={15}
                />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* =====================================================
          MOBILE
      ====================================================== */}

      <nav
        className={[
          "fixed bottom-0 left-0 right-0 z-50 grid border-t border-base-300 bg-base-100/95 px-1 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.04)] backdrop-blur-xl lg:hidden",
          mobileColumns,
        ].join(" ")}
      >
        <Link
          href="/dashboard"
          className={mobileClass(
            isDashboard
          )}
        >
          <MobileActive
            active={
              isDashboard
            }
          />

          <LayoutDashboard
            size={17}
          />

          Início
        </Link>

        <Link
          href="/solicitacoes/nova"
          className={mobileClass(
            isNewRequest
          )}
        >
          <MobileActive
            active={
              isNewRequest
            }
          />

          <Send
            size={17}
          />

          Solicitar
        </Link>

        <Link
          href="/solicitacoes"
          className={mobileClass(
            isMyRequests
          )}
        >
          <MobileActive
            active={
              isMyRequests
            }
          />

          <CreditCard
            size={17}
          />

          Cartões
        </Link>

        <Link
          href="/devolucoes"
          className={mobileClass(
            isReturns
          )}
        >
          <MobileActive
            active={
              isReturns
            }
          />

          <RotateCcw
            size={17}
          />

          Devolver
        </Link>

        <Link
          href="/meus-pedidos"
          className={mobileClass(
            isMyOrders
          )}
        >
          <MobileActive
            active={
              isMyOrders
            }
          />

          <PackageSearch
            size={17}
          />

          Pedidos
        </Link>

        {/* ===================================================
            PENDÊNCIAS MOBILE
        ==================================================== */}

        <Link
          href="/pendencias"
          className={mobileClass(
            isPendencias
          )}
        >
          <MobileActive
            active={
              isPendencias
            }
          />

          <div className="relative">
            <ListTodo
              size={17}
            />

            {!loadingPending &&
              pendingCount >
                0 && (
                <span
                  className={[
                    "absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[7px] font-bold text-white",
                    criticalCount >
                    0
                      ? "bg-error"
                      : "bg-warning",
                  ].join(" ")}
                >
                  {pendingCount >
                  99
                    ? "99+"
                    : pendingCount}
                </span>
              )}
          </div>

          Pend.
        </Link>

        {canFinance && (
          <Link
            href="/financeiro/solicitacoes"
            className={mobileClass(
              pathname.startsWith(
                "/financeiro"
              )
            )}
          >
            <MobileActive
              active={
                pathname.startsWith(
                  "/financeiro"
                )
              }
            />

            <Gauge
              size={17}
            />

            Financ.
          </Link>
        )}
      </nav>
    </>
  );
}

// ============================================================
// BADGE DE PENDÊNCIAS
// ============================================================

function PendingBadge({
  count,
  critical,
}: {
  count: number;

  critical: boolean;
}) {
  return (
    <span
      className={[
        "relative flex min-w-6 items-center justify-center rounded-lg px-1.5 py-1 text-[9px] font-bold leading-none",
        critical
          ? "bg-error/15 text-red-300"
          : "bg-warning/15 text-amber-300",
      ].join(" ")}
    >
      {critical && (
        <span className="absolute inset-0 animate-pulse rounded-lg ring-1 ring-error/20" />
      )}

      <span className="relative">
        {count >
        99
          ? "99+"
          : count}
      </span>
    </span>
  );
}

// ============================================================
// SEÇÃO
// ============================================================

function SidebarSection({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <p className="mb-2 px-3 text-[8px] font-semibold uppercase tracking-[0.2em] text-white/20">
      {children}
    </p>
  );
}

// ============================================================
// DIVISOR
// ============================================================

function SidebarDivider() {
  return (
    <div className="my-5 border-t border-white/[0.055]" />
  );
}

// ============================================================
// INDICADOR ATIVO
// ============================================================

function ActiveIndicator() {
  return (
    <span className="absolute -left-3 h-5 w-[3px] rounded-r-full bg-primary shadow-[0_0_12px_rgba(175,27,27,0.55)]" />
  );
}

// ============================================================
// MOBILE ACTIVE
// ============================================================

function MobileActive({
  active,
}: {
  active: boolean;
}) {
  if (!active) {
    return null;
  }

  return (
    <span className="absolute top-0 h-[2px] w-7 rounded-b-full bg-primary" />
  );
}

// ============================================================
// INICIAIS
// ============================================================

function getInitials(
  name: string
) {
  const words =
    name
      .trim()
      .split(/\s+/)
      .filter(
        Boolean
      );

  if (
    words.length ===
    0
  ) {
    return "U";
  }

  if (
    words.length ===
    1
  ) {
    return words[0]
      .slice(
        0,
        2
      )
      .toUpperCase();
  }

  return `${words[0][0]}${words[words.length - 1][0]}`
    .toUpperCase();
}