import { logout } from "@/app/actions/auth";
import NotificationBell from "@/components/system/notification-bell";
import { createClient } from "@/lib/supabase/server";
import { LogOut, Plus, Search, UserRound } from "lucide-react";
import Link from "next/link";

type ProfileRow = {
  full_name: string | null;
  email: string | null;
};

export default async function SystemTopbar() {
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
    profileResult,
    rolesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "profiles"
        )
        .select(
          `
          full_name,
          email
          `
        )
        .eq(
          "id",
          userId
        )
        .maybeSingle(),

      supabase
        .from(
          "user_roles"
        )
        .select(
          "role"
        )
        .eq(
          "user_id",
          userId
        ),
    ]);

  const profile =
    profileResult.data as
      | ProfileRow
      | null;

  const roles =
    (
      rolesResult.data ??
      []
    ).map(
      (item) =>
        item.role
    );

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

  const fullName =
    profile?.full_name?.trim() ||
    "Usuário";

  const email =
    profile?.email?.trim() ||
    "";

  const initials =
    getInitials(
      fullName
    );

  const roleLabel =
    getRoleLabel(
      roles
    );

  const searchAction =
    canFinance
      ? "/financeiro/sienge"
      : "/meus-pedidos";

  return (
    <header className="fixed left-0 right-0 top-0 z-30 h-[72px] border-b border-base-300/80 bg-base-100/90 backdrop-blur-xl lg:left-64">
      <div className="flex h-full items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* ===================================================
            BUSCA
        ==================================================== */}

        <div className="hidden min-w-0 flex-1 sm:block">
          <form
            action={
              searchAction
            }
            method="get"
            className="max-w-[520px]"
          >
            {canFinance && (
              <input
                type="hidden"
                name="tab"
                value="pedidos"
              />
            )}

            <label className="group flex h-10 w-full items-center gap-3 rounded-xl border border-base-300 bg-base-200/45 px-3.5 transition-all focus-within:border-primary/30 focus-within:bg-base-100 focus-within:shadow-[0_0_0_4px_rgba(175,27,27,0.06)]">
              <Search
                size={16}
                className="shrink-0 text-base-content/35 transition-colors group-focus-within:text-primary"
              />

              <input
                name="q"
                type="search"
                placeholder={
                  canFinance
                    ? "Buscar SC, solicitante ou centro de custo..."
                    : "Buscar minhas solicitações..."
                }
                className="min-w-0 flex-1 bg-transparent text-sm text-base-content outline-none placeholder:text-base-content/35"
              />

              <span className="hidden rounded-md border border-base-300 bg-base-100 px-1.5 py-0.5 text-[9px] font-semibold text-base-content/35 xl:inline">
                ENTER
              </span>
            </label>
          </form>
        </div>

        {/* MOBILE BRAND */}

        <div className="min-w-0 flex-1 sm:hidden">
          <p className="truncate text-sm font-bold text-base-content">
            Projeta Compras
          </p>

          <p className="text-[10px] text-base-content/40">
            Gestão integrada
          </p>
        </div>

        {/* ===================================================
            AÇÕES
        ==================================================== */}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link
            href="/solicitacoes/nova"
            className="btn btn-primary btn-sm hidden gap-2 rounded-xl shadow-sm md:inline-flex"
          >
            <Plus
              size={15}
            />

            Nova solicitação
          </Link>

          <NotificationBell />

          {/* =================================================
              PERFIL
          ================================================== */}

          <details className="dropdown dropdown-end">
            <summary className="btn btn-ghost h-11 min-h-0 gap-2 rounded-xl px-2 normal-case">
              <div className="avatar avatar-placeholder">
                <div className="w-8 rounded-lg bg-neutral text-neutral-content">
                  <span className="text-[10px] font-bold">
                    {initials}
                  </span>
                </div>
              </div>

              <div className="hidden max-w-[150px] text-left xl:block">
                <p className="truncate text-xs font-semibold leading-4 text-base-content">
                  {fullName}
                </p>

                <p className="truncate text-[10px] font-normal text-base-content/40">
                  {roleLabel}
                </p>
              </div>
            </summary>

            <div className="dropdown-content z-[100] mt-3 w-72 overflow-hidden rounded-2xl border border-base-300 bg-base-100 shadow-2xl">
              <div className="border-b border-base-300 p-4">
                <div className="flex items-center gap-3">
                  <div className="avatar avatar-placeholder">
                    <div className="w-10 rounded-xl bg-neutral text-neutral-content">
                      <span className="text-xs font-bold">
                        {initials}
                      </span>
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {fullName}
                    </p>

                    <p className="truncate text-xs text-base-content/45">
                      {email}
                    </p>
                  </div>
                </div>

                <span className="badge badge-ghost badge-sm mt-3">
                  {roleLabel}
                </span>
              </div>

              <div className="p-2">
                <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs text-base-content/55">
                  <UserRound
                    size={16}
                  />

                  Minha conta
                </div>

                <form
                  action={logout}
                >
                  <button
                    type="submit"
                    className="btn btn-ghost btn-sm w-full justify-start gap-3 rounded-xl font-normal text-error"
                  >
                    <LogOut
                      size={16}
                    />

                    Sair do sistema
                  </button>
                </form>
              </div>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getInitials(
  name: string
) {
  const words =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

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