import type {
  ElementType,
} from "react";

import Link from "next/link";

import {
  ArrowRight,
  Plus,
  Search,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserRound,
  UserX,
} from "lucide-react";

import {
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
  }>;
};

const roleLabels: Record<
  string,
  string
> = {
  requester:
    "Solicitante",

  buyer:
    "Comprador",

  finance:
    "Financeiro",

  approver:
    "Aprovador",

  manager:
    "Gestor",

  admin:
    "Administrador",

  superadmin:
    "Superadmin",
};

const roleStyles: Record<
  string,
  string
> = {
  requester:
    "bg-slate-100 text-slate-600",

  buyer:
    "bg-violet-50 text-violet-700",

  finance:
    "bg-blue-50 text-blue-700",

  approver:
    "bg-amber-50 text-amber-700",

  manager:
    "bg-indigo-50 text-indigo-700",

  admin:
    "bg-red-50 text-red-700",

  superadmin:
    "bg-[#AF1B1B]/10 text-[#AF1B1B]",
};

export default async function UsersPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const supabase =
    await createClient();

  // =========================================================
  // AUTENTICAÇÃO
  // =========================================================

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  // =========================================================
  // PERMISSÕES
  // =========================================================

  const {
    data:
      actorRolesRows,
  } =
    await supabase
      .from(
        "user_roles"
      )
      .select("role")
      .eq(
        "user_id",
        userId
      );

  const actorRoles =
    (
      actorRolesRows ??
      []
    ).map(
      (item) =>
        item.role
    );

  if (
    !actorRoles.includes(
      "admin"
    ) &&
    !actorRoles.includes(
      "superadmin"
    )
  ) {
    redirect(
      "/dashboard"
    );
  }

  // =========================================================
  // DADOS
  // =========================================================

  const [
    profilesResult,
    rolesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "profiles"
        )
        .select(
          `
          id,
          full_name,
          email,
          job_title,
          active,
          must_set_password,
          invited_at,
          created_at,
          updated_at
          `
        )
        .order(
          "full_name",
          {
            ascending: true,
          }
        ),

      supabase
        .from(
          "user_roles"
        )
        .select(
          `
          user_id,
          role
          `
        ),
    ]);

  if (
    profilesResult.error
  ) {
    console.error(
      "Erro ao carregar usuários:",
      profilesResult.error
    );
  }

  if (
    rolesResult.error
  ) {
    console.error(
      "Erro ao carregar permissões:",
      rolesResult.error
    );
  }

  const profiles =
    profilesResult.data ??
    [];

  const allRoles =
    rolesResult.data ??
    [];

  // =========================================================
  // MAP DE ROLES
  // =========================================================

  const rolesMap =
    new Map<
      string,
      string[]
    >();

  for (
    const roleRow
    of allRoles
  ) {
    const current =
      rolesMap.get(
        roleRow.user_id
      ) ?? [];

    current.push(
      roleRow.role
    );

    rolesMap.set(
      roleRow.user_id,
      current
    );
  }

  // =========================================================
  // FILTROS
  // =========================================================

  const search =
    (
      params.q ??
      ""
    )
      .trim()
      .toLowerCase();

  const status =
    (
      params.status ??
      ""
    ).trim();

  const filtered =
    profiles.filter(
      (profile) => {
        const matchesSearch =
          !search ||
          profile.full_name
            ?.toLowerCase()
            .includes(
              search
            ) ||
          profile.email
            ?.toLowerCase()
            .includes(
              search
            ) ||
          profile.job_title
            ?.toLowerCase()
            .includes(
              search
            );

        const matchesStatus =
          !status ||
          (
            status ===
              "active" &&
            profile.active
          ) ||
          (
            status ===
              "inactive" &&
            !profile.active
          ) ||
          (
            status ===
              "invited" &&
            profile.must_set_password
          );

        return (
          matchesSearch &&
          matchesStatus
        );
      }
    );

  // =========================================================
  // INDICADORES
  // =========================================================

  const activeCount =
    profiles.filter(
      (profile) =>
        profile.active
    ).length;

  const invitedCount =
    profiles.filter(
      (profile) =>
        profile.must_set_password
    ).length;

  const financeCount =
    profiles.filter(
      (profile) =>
        (
          rolesMap.get(
            profile.id
          ) ?? []
        ).includes(
          "finance"
        )
    ).length;

  const adminCount =
    profiles.filter(
      (profile) => {
        const roles =
          rolesMap.get(
            profile.id
          ) ?? [];

        return (
          roles.includes(
            "admin"
          ) ||
          roles.includes(
            "superadmin"
          )
        );
      }
    ).length;

  return (
    <div className="mx-auto max-w-[1550px]">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#AF1B1B]">
            Administração
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Usuários e Permissões
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Controle o acesso,
            permissões e convites dos
            usuários do sistema.
          </p>
        </div>

        <Link
          href="/administracao/usuarios/novo"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white transition hover:bg-[#921717]"
        >
          <Plus
            size={18}
          />

          Novo Usuário
        </Link>
      </div>

      {/* =====================================================
          INDICADORES
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={
            UserCheck
          }
          label="Usuários ativos"
          value={
            activeCount
          }
        />

        <SummaryCard
          icon={
            UserRound
          }
          label="Aguardando ativação"
          value={
            invitedCount
          }
        />

        <SummaryCard
          icon={
            ShieldCheck
          }
          label="Financeiro"
          value={
            financeCount
          }
        />

        <SummaryCard
          icon={
            UserCog
          }
          label="Administradores"
          value={
            adminCount
          }
        />
      </div>

      {/* =====================================================
          LISTAGEM
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <form
            method="get"
            className="grid gap-3 lg:grid-cols-[1fr_230px_auto]"
          >
            <div className="relative">
              <Search
                size={
                  17
                }
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                name="q"
                defaultValue={
                  params.q ??
                  ""
                }
                placeholder="Buscar por nome, e-mail ou cargo..."
                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
              />
            </div>

            <select
              name="status"
              defaultValue={
                params.status ??
                ""
              }
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
            >
              <option value="">
                Todos
              </option>

              <option value="active">
                Ativos
              </option>

              <option value="inactive">
                Inativos
              </option>

              <option value="invited">
                Aguardando ativação
              </option>
            </select>

            <button
              type="submit"
              className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Filtrar
            </button>
          </form>
        </div>

        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-xs text-slate-500">
            {
              filtered.length
            }{" "}
            usuário
            {filtered.length ===
            1
              ? ""
              : "s"}{" "}
            encontrado
            {filtered.length ===
            1
              ? ""
              : "s"}.
          </p>
        </div>

        {filtered.length ===
        0 ? (
          <div className="flex min-h-[340px] flex-col items-center justify-center p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <UserRound
                size={27}
              />
            </div>

            <h2 className="mt-5 text-lg font-semibold text-slate-800">
              Nenhum usuário encontrado
            </h2>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map(
              (profile) => {
                const roles =
                  rolesMap.get(
                    profile.id
                  ) ?? [];

                return (
                  <Link
                    key={
                      profile.id
                    }
                    href={`/administracao/usuarios/${profile.id}`}
                    className="group block px-6 py-5 transition hover:bg-slate-50/70"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
                        {getInitials(
                          profile.full_name
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold text-slate-900">
                            {
                              profile.full_name
                            }
                          </h2>

                          {profile.must_set_password ? (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
                              Convite pendente
                            </span>
                          ) : (
                            <span
                              className={[
                                "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                                profile.active
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-red-50 text-red-600",
                              ].join(
                                " "
                              )}
                            >
                              {profile.active
                                ? "Ativo"
                                : "Inativo"}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-xs text-slate-500">
                          {
                            profile.email
                          }
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {profile.job_title ??
                            "Cargo não informado"}
                        </p>
                      </div>

                      <div className="flex max-w-xl flex-wrap gap-2">
                        {roles.map(
                          (
                            role
                          ) => (
                            <span
                              key={
                                role
                              }
                              className={[
                                "rounded-lg px-2.5 py-1 text-[10px] font-semibold",
                                roleStyles[
                                  role
                                ] ??
                                  "bg-slate-100 text-slate-600",
                              ].join(
                                " "
                              )}
                            >
                              {roleLabels[
                                role
                              ] ??
                                role}
                            </span>
                          )
                        )}
                      </div>

                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition group-hover:bg-white group-hover:text-[#AF1B1B]">
                        <ArrowRight
                          size={18}
                        />
                      </div>
                    </div>
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon:
    ElementType;

  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon
          size={19}
        />
      </div>

      <p className="mt-4 text-2xl font-semibold text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {label}
      </p>
    </div>
  );
}

function getInitials(
  name: string
) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]
          ?.toUpperCase()
    )
    .join("");
}