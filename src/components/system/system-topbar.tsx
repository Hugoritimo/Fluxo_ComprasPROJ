import Link from "next/link";

import {
  ChevronRight,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import {
  logout,
} from "@/app/actions/auth";

import CommandMenu from "@/components/system/command-menu";

import NotificationBell from "@/components/system/notification-bell";

import QuickActionsMenu from "@/components/system/quick-actions-menu";

// ============================================================
// TIPOS
// ============================================================

type SystemTopbarProps = {
  profile: {
    full_name: string;
    email: string;
  };

  roles: string[];
};

// ============================================================
// TOPBAR
// ============================================================

export default function SystemTopbar({
  profile,
  roles,
}: SystemTopbarProps) {
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

  const isSuperadmin =
    roles.includes(
      "superadmin"
    );

  // =========================================================
  // PERFIL
  // =========================================================

  const fullName =
    profile.full_name.trim() ||
    "Usuário";

  const email =
    profile.email.trim();

  const initials =
    getInitials(
      fullName
    );

  const roleLabel =
    getRoleLabel(
      roles
    );

  const firstName =
    fullName
      .split(
        /\s+/
      )
      .filter(
        Boolean
      )[0] ??
    "Usuário";

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <header className="fixed left-0 right-0 top-0 z-40 h-[72px] border-b border-base-300/70 bg-base-100/85 backdrop-blur-2xl lg:left-[272px]">
      <div className="flex h-full items-center gap-3 px-4 sm:px-5 lg:px-7">
        {/* ===================================================
            CONTEXTO
        ==================================================== */}

        <div className="hidden min-w-0 shrink-0 xl:block">
          <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-base-content/30">
            Projeta

            <ChevronRight
              size={11}
              strokeWidth={1.8}
            />

            Operação
          </div>

          <p className="mt-1 max-w-[180px] truncate text-[12px] font-semibold tracking-[-0.01em] text-base-content/75">
            Olá, {firstName}
          </p>
        </div>

        {/* ===================================================
            COMMAND PALETTE
        ==================================================== */}

        <div className="min-w-0 flex-1">
          <CommandMenu
            canFinance={
              canFinance
            }
            canAdmin={
              canAdmin
            }
          />
        </div>

        {/* ===================================================
            AÇÕES
        ==================================================== */}

        <div className="flex shrink-0 items-center gap-1.5">
          <QuickActionsMenu
            canFinance={
              canFinance
            }
            canAdmin={
              canAdmin
            }
          />

          {/* =================================================
              NOTIFICAÇÕES
          ================================================== */}

          <NotificationBell />

          {/* =================================================
              PERFIL
          ================================================== */}

          <div className="dropdown dropdown-end">
            <button
              type="button"
              tabIndex={0}
              className="group flex h-10 items-center gap-2 rounded-xl px-1.5 transition hover:bg-base-200"
            >
              <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-[#171717] text-[9px] font-bold text-white shadow-sm">
                {initials}

                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-base-100 bg-success" />
              </div>

              <div className="hidden max-w-[145px] text-left 2xl:block">
                <p className="truncate text-[11px] font-semibold leading-4 text-base-content/75">
                  {fullName}
                </p>

                <p className="truncate text-[9px] text-base-content/35">
                  {roleLabel}
                </p>
              </div>
            </button>

            {/* ===============================================
                DROPDOWN
            ================================================ */}

            <div
              tabIndex={0}
              className="dropdown-content z-[120] mt-3 w-[290px] overflow-hidden rounded-[20px] border border-base-300 bg-base-100 shadow-[0_20px_60px_rgba(0,0,0,0.14)]"
            >
              {/* PERFIL */}

              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#171717] text-[11px] font-bold text-white">
                    {initials}

                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-base-100 bg-success" />
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-[-0.01em]">
                      {fullName}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] text-base-content/40">
                      {email}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={[
                      "badge badge-sm gap-1.5",
                      isSuperadmin
                        ? "badge-neutral"
                        : canAdmin
                          ? "badge-primary"
                          : canFinance
                            ? "badge-info"
                            : "badge-ghost",
                    ].join(
                      " "
                    )}
                  >
                    {(canAdmin ||
                      isSuperadmin) && (
                      <ShieldCheck
                        size={10}
                      />
                    )}

                    {roleLabel}
                  </span>

                  <span className="flex items-center gap-1 text-[9px] font-medium text-success">
                    <span className="h-1.5 w-1.5 rounded-full bg-success" />

                    Online
                  </span>
                </div>
              </div>

              <div className="border-t border-base-300 p-2">
                {canAdmin && (
                  <Link
                    href="/administracao/usuarios"
                    className="flex h-10 items-center gap-3 rounded-xl px-3 text-[11px] font-medium text-base-content/65 transition hover:bg-base-200 hover:text-base-content"
                  >
                    <ShieldCheck
                      size={15}
                      className="text-base-content/35"
                    />

                    Usuários e acessos
                  </Link>
                )}

                <form
                  action={
                    logout
                  }
                >
                  <button
                    type="submit"
                    className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-[11px] font-semibold text-error transition hover:bg-error/5"
                  >
                    <LogOut
                      size={15}
                    />

                    Encerrar sessão
                  </button>
                </form>
              </div>

              <div className="border-t border-base-300 bg-base-200/40 px-4 py-2.5">
                <p className="text-[8px] font-medium uppercase tracking-[0.12em] text-base-content/25">
                  Projeta Compras OS
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
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

// ============================================================
// ROLE
// ============================================================

function getRoleLabel(
  roles: string[]
) {
  if (
    roles.includes(
      "superadmin"
    )
  ) {
    return "Superadministrador";
  }

  if (
    roles.includes(
      "admin"
    )
  ) {
    return "Administrador";
  }

  if (
    roles.includes(
      "finance"
    )
  ) {
    return "Financeiro";
  }

  return "Colaborador";
}