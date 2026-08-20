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
  // CLASSES
  // =========================================================

  function linkClasses(
    active: boolean
  ) {
    return [
      "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition",
      active
        ? "bg-[#AF1B1B] text-white"
        : "text-white/55 hover:bg-white/[0.06] hover:text-white",
    ].join(" ");
  }

  function mobileLinkClasses(
    active: boolean
  ) {
    return [
      "flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[9px] transition",
      active
        ? "text-[#AF1B1B]"
        : "text-slate-400",
    ].join(" ");
  }

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
  // MEUS PEDIDOS - SIENGE
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
  // MOBILE GRID
  //
  // Todos:
  // Dashboard
  // Solicitar
  // Solicitações
  // Devoluções
  // Pedidos
  //
  // + Financeiro
  // + Admin
  // =========================================================

  const mobileColumns =
    canFinance &&
    canAdmin
      ? "grid-cols-7"
      : (
          canFinance ||
          canAdmin
            ? "grid-cols-6"
            : "grid-cols-5"
        );

  return (
    <>
      {/* =====================================================
          DESKTOP
      ====================================================== */}

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-[#171717] text-white lg:flex">
        {/* LOGO */}

        <div className="flex h-20 items-center gap-3 border-b border-white/[0.07] px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#AF1B1B] font-bold">
            P
          </div>

          <div>
            <p className="text-sm font-semibold">
              PROJETA
            </p>

            <p className="text-[9px] uppercase tracking-[0.22em] text-white/40">
              Compras
            </p>
          </div>
        </div>

        {/* ===================================================
            MENU
        ==================================================== */}

        <nav className="flex-1 overflow-y-auto p-4">
          {/* =================================================
              SOLICITAÇÕES
          ================================================== */}

          <p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">
            Solicitações
          </p>

          <div className="space-y-1">
            <Link
              href="/dashboard"
              className={linkClasses(
                isDashboard
              )}
            >
              <LayoutDashboard
                size={18}
              />

              Dashboard
            </Link>

            <Link
              href="/solicitacoes/nova"
              className={linkClasses(
                isNewRequest
              )}
            >
              <Send
                size={18}
              />

              Solicitar Cartão
            </Link>

            <Link
              href="/solicitacoes"
              className={linkClasses(
                isMyRequests
              )}
            >
              <CreditCard
                size={18}
              />

              Minhas Solicitações
            </Link>

            <Link
              href="/devolucoes"
              className={linkClasses(
                isReturns
              )}
            >
              <RotateCcw
                size={18}
              />

              Devoluções
            </Link>
          </div>

          {/* =================================================
              COMPRAS / SIENGE
          ================================================== */}

          <div className="my-5 border-t border-white/[0.07]" />

          <p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">
            Compras
          </p>

          <div className="space-y-1">
            <Link
              href="/meus-pedidos"
              className={linkClasses(
                isMyOrders
              )}
            >
              <PackageSearch
                size={18}
              />

              Meus Pedidos
            </Link>
          </div>

          {/* =================================================
              FINANCEIRO
          ================================================== */}

          {canFinance && (
            <>
              <div className="my-5 border-t border-white/[0.07]" />

              <p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">
                Financeiro
              </p>

              <div className="space-y-1">
                {/* GERENCIAR SOLICITAÇÕES */}

                <Link
                  href="/financeiro/solicitacoes"
                  className={linkClasses(
                    isFinanceRequests
                  )}
                >
                  <WalletCards
                    size={18}
                  />

                  Gerenciar Solicitações
                </Link>

                {/* CARTÕES */}

                <Link
                  href="/financeiro/cartoes"
                  className={linkClasses(
                    isFinanceCards
                  )}
                >
                  <CreditCard
                    size={18}
                  />

                  Cartões Corporativos
                </Link>

                {/* DEVOLUÇÕES */}

                <Link
                  href="/financeiro/devolucoes"
                  className={linkClasses(
                    isFinanceReturns
                  )}
                >
                  <FileCheck2
                    size={18}
                  />

                  Conferir Devoluções
                </Link>

                {/* SIENGE */}

                <Link
                  href="/financeiro/sienge"
                  className={linkClasses(
                    isFinanceSienge
                  )}
                >
                  <FileSpreadsheet
                    size={18}
                  />

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
              <div className="my-5 border-t border-white/[0.07]" />

              <p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-white/25">
                Administração
              </p>

              <div className="space-y-1">
                <Link
                  href="/administracao/usuarios"
                  className={linkClasses(
                    isAdminUsers
                  )}
                >
                  <UsersRound
                    size={18}
                  />

                  Usuários e Permissões
                </Link>
              </div>
            </>
          )}
        </nav>

        {/* ===================================================
            USUÁRIO
        ==================================================== */}

        <div className="border-t border-white/[0.07] p-4">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-medium text-white/80">
              {
                profile.full_name
              }
            </p>

            <p className="truncate text-[11px] text-white/35">
              {
                profile.email
              }
            </p>
          </div>

          <form
            action={logout}
          >
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-white/45 transition hover:bg-white/[0.06] hover:text-white"
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

      <nav
        className={[
          "fixed bottom-0 left-0 right-0 z-40 grid border-t border-slate-200 bg-white p-2 lg:hidden",
          mobileColumns,
        ].join(" ")}
      >
        {/* DASHBOARD */}

        <Link
          href="/dashboard"
          className={mobileLinkClasses(
            isDashboard
          )}
        >
          <LayoutDashboard
            size={18}
          />

          Dashboard
        </Link>

        {/* SOLICITAR */}

        <Link
          href="/solicitacoes/nova"
          className={mobileLinkClasses(
            isNewRequest
          )}
        >
          <Send
            size={18}
          />

          Solicitar
        </Link>

        {/* SOLICITAÇÕES */}

        <Link
          href="/solicitacoes"
          className={mobileLinkClasses(
            isMyRequests
          )}
        >
          <CreditCard
            size={18}
          />

          Solicitações
        </Link>

        {/* DEVOLUÇÕES */}

        <Link
          href="/devolucoes"
          className={mobileLinkClasses(
            isReturns
          )}
        >
          <RotateCcw
            size={18}
          />

          Devoluções
        </Link>

        {/* MEUS PEDIDOS */}

        <Link
          href="/meus-pedidos"
          className={mobileLinkClasses(
            isMyOrders
          )}
        >
          <PackageSearch
            size={18}
          />

          Pedidos
        </Link>

        {/* FINANCEIRO */}

        {canFinance && (
          <Link
            href="/financeiro/solicitacoes"
            className={mobileLinkClasses(
              pathname.startsWith(
                "/financeiro"
              )
            )}
          >
            <WalletCards
              size={18}
            />

            Financeiro
          </Link>
        )}

        {/* ADMIN */}

        {canAdmin && (
          <Link
            href="/administracao/usuarios"
            className={mobileLinkClasses(
              pathname.startsWith(
                "/administracao"
              )
            )}
          >
            <UsersRound
              size={18}
            />

            Admin
          </Link>
        )}
      </nav>
    </>
  );
}