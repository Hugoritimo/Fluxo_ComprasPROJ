"use client";

import Link from "next/link";

import {
  usePathname,
} from "next/navigation";

import {
  CreditCard,
  FileCheck2,
  FileSpreadsheet,
  LayoutDashboard,
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

type SystemSidebarProps = {
  profile: {
    full_name: string;
    email: string;
  };

  roles: string[];
};

export default function SystemSidebar({
  profile,
  roles,
}: SystemSidebarProps) {
  const pathname =
    usePathname();

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

  // =========================================================
  // MEUS PEDIDOS
  // =========================================================

  const isMyOrders =
    pathname ===
      "/meus-pedidos" ||
    pathname.startsWith(
      "/meus-pedidos/"
    );

  // =========================================================
  // FINANCEIRO
  // =========================================================

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

  // =========================================================
  // ADMIN
  // =========================================================

  const isAdminUsers =
    pathname.startsWith(
      "/administracao/usuarios"
    );

  // =========================================================
  // HELPERS
  // =========================================================

  function desktopLinkClass(
    active: boolean
  ) {
    return [
      "gap-3",
      active
        ? "bg-primary text-primary-content font-semibold hover:bg-primary"
        : "",
    ].join(" ");
  }

  function mobileLinkClass(
    active: boolean
  ) {
    return active
      ? "dock-active text-primary"
      : "";
  }

  return (
    <>
      {/* =====================================================
          DESKTOP
      ====================================================== */}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-neutral text-neutral-content lg:flex">
        {/* ===================================================
            LOGO
        ==================================================== */}

        <div className="flex h-20 items-center gap-3 border-b border-neutral-content/10 px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-box bg-primary text-lg font-bold text-primary-content">
            P
          </div>

          <div>
            <p className="text-sm font-semibold">
              PROJETA
            </p>

            <p className="text-[10px] uppercase tracking-[0.2em] opacity-40">
              Compras
            </p>
          </div>
        </div>

        {/* ===================================================
            NAVEGAÇÃO
        ==================================================== */}

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {/* =================================================
              SOLICITAÇÕES
          ================================================== */}

          <ul className="menu w-full gap-1">
            <li className="menu-title text-neutral-content/35">
              Solicitações
            </li>

            <li>
              <Link
                href="/dashboard"
                className={desktopLinkClass(
                  isDashboard
                )}
              >
                <LayoutDashboard
                  size={18}
                />

                Dashboard
              </Link>
            </li>

            <li>
              <Link
                href="/solicitacoes/nova"
                className={desktopLinkClass(
                  isNewRequest
                )}
              >
                <Send
                  size={18}
                />

                Solicitar Cartão
              </Link>
            </li>

            <li>
              <Link
                href="/solicitacoes"
                className={desktopLinkClass(
                  isMyRequests
                )}
              >
                <CreditCard
                  size={18}
                />

                Minhas Solicitações
              </Link>
            </li>

            <li>
              <Link
                href="/devolucoes"
                className={desktopLinkClass(
                  isReturns
                )}
              >
                <RotateCcw
                  size={18}
                />

                Devoluções
              </Link>
            </li>
          </ul>

          {/* DIVISOR */}

          <div className="divider my-3 opacity-20" />

          {/* =================================================
              COMPRAS
          ================================================== */}

          <ul className="menu w-full gap-1">
            <li className="menu-title text-neutral-content/35">
              Compras
            </li>

            <li>
              <Link
                href="/meus-pedidos"
                className={desktopLinkClass(
                  isMyOrders
                )}
              >
                <PackageSearch
                  size={18}
                />

                Meus Pedidos
              </Link>
            </li>
          </ul>

          {/* =================================================
              FINANCEIRO
          ================================================== */}

          {canFinance && (
            <>
              <div className="divider my-3 opacity-20" />

              <ul className="menu w-full gap-1">
                <li className="menu-title text-neutral-content/35">
                  Financeiro
                </li>

                <li>
                  <Link
                    href="/financeiro/solicitacoes"
                    className={desktopLinkClass(
                      isFinanceRequests
                    )}
                  >
                    <WalletCards
                      size={18}
                    />

                    Gerenciar Solicitações
                  </Link>
                </li>

                <li>
                  <Link
                    href="/financeiro/cartoes"
                    className={desktopLinkClass(
                      isFinanceCards
                    )}
                  >
                    <CreditCard
                      size={18}
                    />

                    Cartões Corporativos
                  </Link>
                </li>

                <li>
                  <Link
                    href="/financeiro/devolucoes"
                    className={desktopLinkClass(
                      isFinanceReturns
                    )}
                  >
                    <FileCheck2
                      size={18}
                    />

                    Conferir Devoluções
                  </Link>
                </li>

                <li>
                  <Link
                    href="/financeiro/sienge"
                    className={desktopLinkClass(
                      isFinanceSienge
                    )}
                  >
                    <FileSpreadsheet
                      size={18}
                    />

                    Acompanhamento Sienge
                  </Link>
                </li>
              </ul>
            </>
          )}

          {/* =================================================
              ADMINISTRAÇÃO
          ================================================== */}

          {canAdmin && (
            <>
              <div className="divider my-3 opacity-20" />

              <ul className="menu w-full gap-1">
                <li className="menu-title text-neutral-content/35">
                  Administração
                </li>

                <li>
                  <Link
                    href="/administracao/usuarios"
                    className={desktopLinkClass(
                      isAdminUsers
                    )}
                  >
                    <UsersRound
                      size={18}
                    />

                    Usuários e Permissões
                  </Link>
                </li>
              </ul>
            </>
          )}
        </nav>

        {/* ===================================================
            USUÁRIO
        ==================================================== */}

        <div className="border-t border-neutral-content/10 p-4">
          <div className="mb-3 flex items-center gap-3 px-2">
            <div className="avatar avatar-placeholder">
              <div className="w-9 rounded-full bg-primary text-primary-content">
                <span className="text-xs font-semibold">
                  {getInitials(
                    profile.full_name
                  )}
                </span>
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                {
                  profile.full_name
                }
              </p>

              <p className="truncate text-xs opacity-40">
                {
                  profile.email
                }
              </p>
            </div>
          </div>

          <form
            action={logout}
          >
            <button
              type="submit"
              className="btn btn-ghost btn-sm w-full justify-start gap-3 font-normal text-neutral-content/60 hover:text-neutral-content"
            >
              <LogOut
                size={17}
              />

              Sair do sistema
            </button>
          </form>
        </div>
      </aside>

      {/* =====================================================
          MOBILE
      ====================================================== */}

      <div className="dock dock-sm z-40 border-t border-base-300 bg-base-100 lg:hidden">
        {/* DASHBOARD */}

        <Link
          href="/dashboard"
          className={mobileLinkClass(
            isDashboard
          )}
        >
          <LayoutDashboard
            size={18}
          />

          <span className="dock-label">
            Início
          </span>
        </Link>

        {/* SOLICITAR */}

        <Link
          href="/solicitacoes/nova"
          className={mobileLinkClass(
            isNewRequest
          )}
        >
          <Send
            size={18}
          />

          <span className="dock-label">
            Solicitar
          </span>
        </Link>

        {/* SOLICITAÇÕES */}

        <Link
          href="/solicitacoes"
          className={mobileLinkClass(
            isMyRequests
          )}
        >
          <CreditCard
            size={18}
          />

          <span className="dock-label">
            Cartões
          </span>
        </Link>

        {/* DEVOLUÇÕES */}

        <Link
          href="/devolucoes"
          className={mobileLinkClass(
            isReturns
          )}
        >
          <RotateCcw
            size={18}
          />

          <span className="dock-label">
            Devolver
          </span>
        </Link>

        {/* MEUS PEDIDOS */}

        <Link
          href="/meus-pedidos"
          className={mobileLinkClass(
            isMyOrders
          )}
        >
          <PackageSearch
            size={18}
          />

          <span className="dock-label">
            Pedidos
          </span>
        </Link>

        {/* FINANCEIRO */}

        {canFinance && (
          <Link
            href="/financeiro/solicitacoes"
            className={mobileLinkClass(
              pathname.startsWith(
                "/financeiro"
              )
            )}
          >
            <WalletCards
              size={18}
            />

            <span className="dock-label">
              Financeiro
            </span>
          </Link>
        )}

        {/* ADMIN */}

        {canAdmin && (
          <Link
            href="/administracao/usuarios"
            className={mobileLinkClass(
              pathname.startsWith(
                "/administracao"
              )
            )}
          >
            <UsersRound
              size={18}
            />

            <span className="dock-label">
              Admin
            </span>
          </Link>
        )}
      </div>
    </>
  );
}

// ============================================================
// INICIAIS
// ============================================================

function getInitials(
  name: string
) {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return "U";
  }

  if (
    parts.length === 1
  ) {
    return parts[0]
      .slice(
        0,
        2
      )
      .toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`
    .toUpperCase();
}