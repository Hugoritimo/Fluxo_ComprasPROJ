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
  BarChart3,
  CheckCircle2,
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

type PendingStatus =
  | "healthy"
  | "attention"
  | "critical";

type PendingCountResponse = {
  total: number;

  critical: number;

  attention: number;

  status: PendingStatus;

  categories: {
    sla: number;

    warning: number;

    deliveries: number;

    unmatched: number;

    alerts: number;

    alertWarnings: number;

    alertErrors: number;
  };

  generatedAt: string;
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
  // PENDÊNCIAS
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
    attentionCount,
    setAttentionCount,
  ] =
    useState(
      0
    );

  const [
    pendingStatus,
    setPendingStatus,
  ] =
    useState<PendingStatus>(
      "healthy"
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
  // DIREÇÃO
  // =========================================================
  //
  // A Visão Executiva pode ser acessada por:
  //
  // - direcao
  // - admin
  // - superadmin
  //
  // Financeiro comum não recebe acesso automaticamente.
  // =========================================================

  const canDirection =
    roles.includes(
      "direcao"
    ) ||
    roles.includes(
      "admin"
    ) ||
    roles.includes(
      "superadmin"
    );

  // =========================================================
  // CARREGAR RESUMO
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

                headers: {
                  Accept:
                    "application/json",
                },
              }
            );

          if (
            !response.ok
          ) {
            console.error(
              "Falha ao carregar contador de pendências:",
              response.status
            );

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

          setAttentionCount(
            Number(
              data.attention ??
                0
            )
          );

          setPendingStatus(
            data.status ??
              "healthy"
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
          120000
        );

      const handleFocus =
        () => {
          void loadPendingCount();
        };

      const handleVisibilityChange =
        () => {
          if (
            document.visibilityState ===
            "visible"
          ) {
            void loadPendingCount();
          }
        };

      const handlePendingRefresh =
        () => {
          void loadPendingCount();
        };

      window.addEventListener(
        "focus",
        handleFocus
      );

      document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
      );

      window.addEventListener(
        "projeta:pending-refresh",
        handlePendingRefresh
      );

      return () => {
        window.clearInterval(
          interval
        );

        window.removeEventListener(
          "focus",
          handleFocus
        );

        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );

        window.removeEventListener(
          "projeta:pending-refresh",
          handlePendingRefresh
        );
      };
    },
    [
      loadPendingCount,
    ]
  );

  // =========================================================
  // ROTAS
  // =========================================================

  const isDashboard =
    pathname ===
    "/dashboard";

  const isDirection =
    pathname ===
      "/direcao" ||
    pathname.startsWith(
      "/direcao/"
    );

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
  // =========================================================
  //
  // Base:
  // 6 itens
  //
  // + Direção
  // + Financeiro
  // =========================================================

  const mobileColumns =
    canDirection &&
    canFinance
      ? "grid-cols-8"
      : canDirection ||
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
      "group relative flex h-10 items-center gap-3 rounded-xl px-3 text-[13px] font-[550] transition-all duration-200",
      active
        ? "bg-white/[0.09] text-white"
        : "text-white/45 hover:bg-white/[0.055] hover:text-white/90",
    ].join(
      " "
    );
  }

  function iconClass(
    active: boolean
  ) {
    return [
      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-200",
      active
        ? "bg-primary text-primary-content shadow-sm"
        : "text-white/40 group-hover:bg-white/[0.06] group-hover:text-white/80",
    ].join(
      " "
    );
  }

  function mobileClass(
    active: boolean
  ) {
    return [
      "relative flex min-w-0 flex-col items-center justify-center gap-1 py-2 text-[8px] font-[550] transition",
      active
        ? "text-primary"
        : "text-base-content/40",
    ].join(
      " "
    );
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
          DESKTOP
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
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary font-[750] text-primary-content shadow-[0_8px_25px_rgba(175,27,27,0.22)]">
              <div className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white/10 blur-sm" />

              <span className="relative">
                P
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[13px] font-[750] tracking-[0.05em]">
                  PROJETA
                </p>

                <span className="h-1 w-1 rounded-full bg-primary" />
              </div>

              <p className="mt-0.5 text-[9px] font-[550] uppercase tracking-[0.18em] text-white/30">
                Compras OS
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
            {/* DASHBOARD */}

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
                  size={
                    16
                  }
                />
              </span>

              Dashboard
            </Link>

            {/* ===============================================
                VISÃO EXECUTIVA
            ================================================ */}

            {canDirection && (
              <Link
                href="/direcao"
                title="Visão consolidada para acompanhamento da Direção"
                className={navClass(
                  isDirection
                )}
              >
                {isDirection && (
                  <ActiveIndicator />
                )}

                <span
                  className={iconClass(
                    isDirection
                  )}
                >
                  <BarChart3
                    size={
                      16
                    }
                  />
                </span>

                <span className="min-w-0 flex-1">
                  Visão Executiva
                </span>

                <span className="rounded-md bg-primary/15 px-1.5 py-0.5 text-[8px] font-[650] uppercase tracking-wide text-red-300/80">
                  Direção
                </span>
              </Link>
            )}

            {/* ===============================================
                PENDÊNCIAS
            ================================================ */}

            <Link
              href="/pendencias"
              title={
                !loadingPending
                  ? `${pendingCount} pendências totais · ${criticalCount} críticas · ${attentionCount} em atenção`
                  : "Central de pendências"
              }
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
                  size={
                    16
                  }
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
                    status={
                      pendingStatus
                    }
                  />
                )}
            </Link>
          </div>

          {/* =================================================
              MINHA OPERAÇÃO
          ================================================== */}

          <SidebarDivider />

          <SidebarSection>
            Minha operação
          </SidebarSection>

          <div className="space-y-1">
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
                  size={
                    16
                  }
                />
              </span>

              Solicitações
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
                  size={
                    16
                  }
                />
              </span>

              Devoluções
            </Link>

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
                  size={
                    16
                  }
                />
              </span>

              <span className="flex-1">
                Meus pedidos
              </span>

              <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[8px] font-[650] uppercase tracking-wide text-white/30">
                Sienge
              </span>
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
                      size={
                        16
                      }
                    />
                  </span>

                  Solicitações
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
                      size={
                        16
                      }
                    />
                  </span>

                  Cartões
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
                      size={
                        16
                      }
                    />
                  </span>

                  Conferências
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
                      size={
                        16
                      }
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
                      size={
                        16
                      }
                    />
                  </span>

                  Usuários e acessos
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* ===================================================
            STATUS OPERACIONAL
        ==================================================== */}

        <div className="px-3 pb-3">
          <PendingStatusPanel
            loading={
              loadingPending
            }
            total={
              pendingCount
            }
            critical={
              criticalCount
            }
            attention={
              attentionCount
            }
            status={
              pendingStatus
            }
          />
        </div>

        {/* ===================================================
            PERFIL
        ==================================================== */}

        <div className="border-t border-white/[0.06] p-3">
          <div className="flex items-center gap-3 rounded-xl px-2 py-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.07] text-[10px] font-[750] text-white/75">
              {initials}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-[650] text-white/75">
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
                  size={
                    15
                  }
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
        ].join(
          " "
        )}
      >
        {/* DASHBOARD */}

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
            size={
              17
            }
          />

          Início
        </Link>

        {/* ===============================================
            VISÃO EXECUTIVA
        ================================================ */}

        {canDirection && (
          <Link
            href="/direcao"
            className={mobileClass(
              isDirection
            )}
          >
            <MobileActive
              active={
                isDirection
              }
            />

            <BarChart3
              size={
                17
              }
            />

            Executivo
          </Link>
        )}

        {/* SOLICITAR */}

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
            size={
              17
            }
          />

          Solicitar
        </Link>

        {/* SOLICITAÇÕES */}

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
            size={
              17
            }
          />

          Cartões
        </Link>

        {/* DEVOLUÇÕES */}

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
            size={
              17
            }
          />

          Devolver
        </Link>

        {/* PEDIDOS */}

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
            size={
              17
            }
          />

          Pedidos
        </Link>

        {/* PENDÊNCIAS */}

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
              size={
                17
              }
            />

            {!loadingPending &&
              pendingCount >
                0 && (
                <span
                  className={[
                    "absolute -right-2.5 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[7px] font-[750] text-white",
                    pendingStatus ===
                    "critical"
                      ? "bg-error"
                      : "bg-warning",
                  ].join(
                    " "
                  )}
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

        {/* FINANCEIRO */}

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
              size={
                17
              }
            />

            Financ.
          </Link>
        )}
      </nav>
    </>
  );
}

// ============================================================
// BADGE
// ============================================================

function PendingBadge({
  count,
  status,
}: {
  count: number;

  status: PendingStatus;
}) {
  return (
    <span
      className={[
        "relative flex min-w-6 items-center justify-center rounded-lg px-1.5 py-1 text-[9px] font-[750] leading-none",
        status ===
        "critical"
          ? "bg-error/15 text-red-300"
          : status ===
              "attention"
            ? "bg-warning/15 text-amber-300"
            : "bg-success/15 text-emerald-300",
      ].join(
        " "
      )}
    >
      {status ===
        "critical" && (
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
// STATUS PANEL
// ============================================================

function PendingStatusPanel({
  loading,
  total,
  critical,
  attention,
  status,
}: {
  loading: boolean;

  total: number;

  critical: number;

  attention: number;

  status: PendingStatus;
}) {
  if (
    loading
  ) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
        <div className="flex items-center gap-2">
          <span className="loading loading-spinner loading-xs text-white/20" />

          <p className="text-[9px] font-[550] text-white/30">
            Atualizando operação...
          </p>
        </div>
      </div>
    );
  }

  if (
    status ===
      "healthy"
  ) {
    return (
      <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/[0.035] p-3">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="h-2 w-2 rounded-full bg-success" />

            <div className="absolute inset-0 animate-ping rounded-full bg-success opacity-30" />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-[650] text-white/65">
              Operação estável
            </p>

            <p className="mt-0.5 text-[8px] text-white/25">
              Nenhuma pendência ativa
            </p>
          </div>

          <CheckCircle2
            size={
              14
            }
            className="ml-auto text-success"
          />
        </div>
      </div>
    );
  }

  return (
    <Link
      href="/pendencias"
      className={[
        "group block rounded-xl border p-3 transition",
        status ===
        "critical"
          ? "border-error/15 bg-error/[0.045] hover:bg-error/[0.075]"
          : "border-warning/15 bg-warning/[0.045] hover:bg-warning/[0.075]",
      ].join(
        " "
      )}
    >
      <div className="flex items-start gap-2.5">
        <div
          className={[
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            status ===
            "critical"
              ? "bg-error/10 text-red-300"
              : "bg-warning/10 text-amber-300",
          ].join(
            " "
          )}
        >
          <AlertTriangle
            size={
              13
            }
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-[650] text-white/65">
              Central de atenção
            </p>

            <span className="text-[10px] font-[750] tabular-nums text-white/65">
              {total}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3">
            {critical >
              0 && (
              <span className="flex items-center gap-1 text-[8px] font-[650] text-red-300/80">
                <span className="h-1.5 w-1.5 rounded-full bg-error" />

                {critical} críticas
              </span>
            )}

            {attention >
              0 && (
              <span className="flex items-center gap-1 text-[8px] font-[650] text-amber-300/75">
                <span className="h-1.5 w-1.5 rounded-full bg-warning" />

                {attention} atenção
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================================
// SECTION
// ============================================================

function SidebarSection({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <p className="mb-2 px-3 text-[8px] font-[650] uppercase tracking-[0.2em] text-white/20">
      {children}
    </p>
  );
}

// ============================================================
// DIVIDER
// ============================================================

function SidebarDivider() {
  return (
    <div className="my-5 border-t border-white/[0.055]" />
  );
}

// ============================================================
// ACTIVE
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
  if (
    !active
  ) {
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
      .split(
        /\s+/
      )
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