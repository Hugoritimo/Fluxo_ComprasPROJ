import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  CheckCircle2,
  Clock3,
  KeyRound,
  Search,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  MotionCard,
  MotionPage,
  MotionReveal,
} from "@/components/ui/motion";

import PageHeader from "@/components/ui/projeta/page-header";

import MetricCard from "@/components/ui/projeta/metric-card";

import CreateUserDialog from "./create-user-dialog";

import DeleteUserButton from "./delete-user-button";

import FirstAccessLinkButton from "./first-access-link-button";

import UserStatusButton from "./user-status-button";

// ============================================================
// TIPOS
// ============================================================

type PageProps = {
  searchParams: Promise<{
    q?: string;
    perfil?: string;
    status?: string;
  }>;
};

type UserRow = {
  id: string;

  full_name:
    | string
    | null;

  email:
    | string
    | null;

  department:
    | string
    | null;

  job_title:
    | string
    | null;

  phone:
    | string
    | null;

  is_active: boolean;

  must_change_password: boolean;

  last_login_at:
    | string
    | null;

  last_password_change_at:
    | string
    | null;

  created_at: string;

  updated_at: string;

  roles:
    | string[]
    | null;
};

// ============================================================
// PAGE
// ============================================================

export default async function UsersPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const supabase =
    await createClient();

  // =========================================================
  // AUTH
  // =========================================================

  const {
    data:
      claimsData,
  } =
    await supabase.auth.getClaims();

  const currentUserId =
    claimsData?.claims?.sub;

  if (
    !currentUserId
  ) {
    redirect(
      "/login"
    );
  }

  // =========================================================
  // ROLES DO USUÁRIO ATUAL
  // =========================================================

  const {
    data:
      currentRoleRows,
    error:
      currentRolesError,
  } =
    await supabase
      .from(
        "user_roles"
      )
      .select(
        "role"
      )
      .eq(
        "user_id",
        currentUserId
      );

  if (
    currentRolesError
  ) {
    console.error(
      "Erro ao carregar permissões do usuário atual:",
      currentRolesError
    );
  }

  const currentRoles =
    (
      currentRoleRows ??
      []
    ).map(
      (
        row
      ) =>
        String(
          row.role
        )
    );

  const isSuperadmin =
    currentRoles.includes(
      "superadmin"
    );

  const canManageUsers =
    currentRoles.includes(
      "admin"
    ) ||
    isSuperadmin;

  if (
    !canManageUsers
  ) {
    redirect(
      "/dashboard"
    );
  }

  // =========================================================
  // CONSULTAS
  // =========================================================

  const [
    usersResult,
    summaryResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "v_user_management"
        )
        .select(
          "*"
        )
        .order(
          "full_name",
          {
            ascending:
              true,

            nullsFirst:
              false,
          }
        ),

      supabase
        .from(
          "v_user_management_summary"
        )
        .select(
          "*"
        )
        .maybeSingle(),
    ]);

  if (
    usersResult.error
  ) {
    console.error(
      "Erro ao carregar usuários:",
      usersResult.error
    );
  }

  if (
    summaryResult.error
  ) {
    console.error(
      "Erro ao carregar resumo dos usuários:",
      summaryResult.error
    );
  }

  const users =
    (
      usersResult.data ??
      []
    ) as UserRow[];

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

  const roleFilter =
    params.perfil ??
    "todos";

  const statusFilter =
    params.status ??
    "todos";

  const filteredUsers =
    users.filter(
      (
        user
      ) => {
        const roles =
          user.roles ??
          [];

        const effectiveRole =
          getEffectiveRole(
            roles
          );

        // ====================================================
        // BUSCA
        // ====================================================

        if (
          search
        ) {
          const haystack =
            [
              user.full_name,
              user.email,
              user.department,
              user.job_title,
              effectiveRole,
              getRoleLabel(
                effectiveRole
              ),
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
              .toLowerCase();

          if (
            !haystack.includes(
              search
            )
          ) {
            return false;
          }
        }

        // ====================================================
        // PERFIL
        // ====================================================

        if (
          roleFilter !==
            "todos" &&
          effectiveRole !==
            roleFilter
        ) {
          return false;
        }

        // ====================================================
        // STATUS
        // ====================================================

        if (
          statusFilter ===
            "ativos" &&
          (
            !user.is_active ||
            user.must_change_password
          )
        ) {
          return false;
        }

        if (
          statusFilter ===
            "inativos" &&
          user.is_active
        ) {
          return false;
        }

        if (
          statusFilter ===
            "primeiro-acesso" &&
          (
            !user.is_active ||
            !user.must_change_password
          )
        ) {
          return false;
        }

        return true;
      }
    );

  // =========================================================
  // MÉTRICAS
  // =========================================================

  const firstAccessCount =
    users.filter(
      (
        user
      ) =>
        user.is_active &&
        user.must_change_password
    ).length;

  const fullyActiveCount =
    users.filter(
      (
        user
      ) =>
        user.is_active &&
        !user.must_change_password
    ).length;

  const inactiveCount =
    users.filter(
      (
        user
      ) =>
        !user.is_active
    ).length;

  const summary = {
    total:
      Number(
        summaryResult.data
          ?.total ??
          users.length
      ),

    active:
      fullyActiveCount,

    inactive:
      inactiveCount,

    firstAccess:
      firstAccessCount,
  };

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <MotionPage className="mx-auto max-w-[1580px]">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <MotionReveal>
        <PageHeader
          eyebrow="Administração"
          title="Usuários e acessos"
          description="Gerencie contas, perfis de acesso, primeiro acesso e segurança dos colaboradores."
          actions={
            <CreateUserDialog
              canCreateSuperadmin={
                isSuperadmin
              }
            />
          }
        />
      </MotionReveal>

      {/* =====================================================
          MÉTRICAS
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MotionCard
          delay={
            0.04
          }
        >
          <MetricCard
            icon={
              UsersRound
            }
            label="Usuários"
            value={
              summary.total
            }
            description="Contas cadastradas"
            variant="neutral"
          />
        </MotionCard>

        <MotionCard
          delay={
            0.08
          }
        >
          <MetricCard
            icon={
              CheckCircle2
            }
            label="Ativos"
            value={
              summary.active
            }
            description="Acesso configurado"
            variant="success"
          />
        </MotionCard>

        <MotionCard
          delay={
            0.12
          }
        >
          <MetricCard
            icon={
              XCircle
            }
            label="Desativados"
            value={
              summary.inactive
            }
            description="Acesso bloqueado"
            variant={
              summary.inactive >
              0
                ? "warning"
                : "neutral"
            }
          />
        </MotionCard>

        <MotionCard
          delay={
            0.16
          }
        >
          <MetricCard
            icon={
              KeyRound
            }
            label="Primeiro acesso"
            value={
              summary.firstAccess
            }
            description="Aguardando criação de senha"
            variant={
              summary.firstAccess >
              0
                ? "info"
                : "neutral"
            }
          />
        </MotionCard>
      </div>

      {/* =====================================================
          FILTROS
      ====================================================== */}

      <MotionReveal
        delay={
          0.12
        }
      >
        <form
          method="get"
          action="/administracao/usuarios"
          className="mb-5 grid gap-3 rounded-[20px] border border-base-300 bg-base-100 p-3 lg:grid-cols-[1fr_200px_190px_auto]"
        >
          <label className="flex h-10 items-center gap-2.5 rounded-xl border border-base-300 bg-base-200/30 px-3 focus-within:border-primary/30">
            <Search
              size={
                15
              }
              className="text-base-content/30"
            />

            <input
              name="q"
              defaultValue={
                params.q ??
                ""
              }
              placeholder="Buscar nome, e-mail, setor ou cargo..."
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
          </label>

          <select
            name="perfil"
            defaultValue={
              roleFilter
            }
            className="select w-full"
          >
            <option value="todos">
              Todos os perfis
            </option>

            <option value="collaborator">
              Colaboradores
            </option>

            <option value="finance">
              Financeiro
            </option>

            <option value="admin">
              Administradores
            </option>

            <option value="superadmin">
              Superadministradores
            </option>
          </select>

          <select
            name="status"
            defaultValue={
              statusFilter
            }
            className="select w-full"
          >
            <option value="todos">
              Todos os status
            </option>

            <option value="ativos">
              Ativos
            </option>

            <option value="primeiro-acesso">
              Aguardando primeiro acesso
            </option>

            <option value="inativos">
              Desativados
            </option>
          </select>

          <button
            type="submit"
            className="btn btn-neutral btn-sm h-10 rounded-xl px-5"
          >
            Filtrar
          </button>
        </form>
      </MotionReveal>

      {/* =====================================================
          TABELA
      ====================================================== */}

      <MotionReveal
        delay={
          0.18
        }
      >
        <section className="overflow-hidden rounded-[22px] border border-base-300 bg-base-100">
          <div className="flex items-center justify-between border-b border-base-300 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-sm font-semibold">
                Colaboradores
              </h2>

              <p className="mt-1 text-[10px] text-base-content/40">
                {
                  filteredUsers.length
                }{" "}
                resultado
                {filteredUsers.length ===
                1
                  ? ""
                  : "s"}
              </p>
            </div>

            {(search ||
              roleFilter !==
                "todos" ||
              statusFilter !==
                "todos") && (
              <Link
                href="/administracao/usuarios"
                className="btn btn-ghost btn-xs"
              >
                Limpar filtros
              </Link>
            )}
          </div>

          {filteredUsers.length ===
          0 ? (
            <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-base-200">
                <UserRound
                  size={
                    23
                  }
                  className="text-base-content/25"
                />
              </div>

              <p className="mt-4 text-sm font-semibold">
                Nenhum usuário encontrado
              </p>

              <p className="mt-1 text-xs text-base-content/40">
                Ajuste os filtros e tente novamente.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr className="border-base-300 text-[9px] uppercase tracking-[0.12em] text-base-content/35">
                    <th>
                      Usuário
                    </th>

                    <th>
                      Setor / Cargo
                    </th>

                    <th>
                      Perfil
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Último acesso
                    </th>

                    <th className="text-right">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map(
                    (
                      user
                    ) => {
                      const role =
                        getEffectiveRole(
                          user.roles ??
                            []
                        );

                      const targetIsSuperadmin =
                        role ===
                        "superadmin";

                      const isCurrentUser =
                        user.id ===
                        currentUserId;

                      const cannotChangeStatus =
                        isCurrentUser ||
                        (
                          targetIsSuperadmin &&
                          !isSuperadmin
                        );

                      const awaitingFirstAccess =
                        user.is_active &&
                        user.must_change_password;

                      // =======================================
                      // EXCLUSÃO
                      //
                      // Somente Superadmin.
                      // Nunca a própria conta.
                      // =======================================

                      const canDeleteUser =
                        isSuperadmin &&
                        !isCurrentUser;

                      return (
                        <tr
                          key={
                            user.id
                          }
                          className="border-base-300/70 transition-colors hover:bg-base-200/25"
                        >
                          {/* USUÁRIO */}

                          <td>
                            <div className="flex items-center gap-3">
                              <Avatar
                                name={
                                  user.full_name ??
                                  user.email ??
                                  "Usuário"
                                }
                              />

                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="max-w-56 truncate text-xs font-semibold text-base-content/80">
                                    {
                                      user.full_name ??
                                      "Sem nome"
                                    }
                                  </p>

                                  {isCurrentUser && (
                                    <span className="badge badge-ghost badge-xs">
                                      Você
                                    </span>
                                  )}
                                </div>

                                <p className="mt-0.5 max-w-60 truncate text-[10px] text-base-content/40">
                                  {
                                    user.email ??
                                    "Sem e-mail"
                                  }
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* SETOR / CARGO */}

                          <td>
                            <p className="text-xs font-medium text-base-content/65">
                              {
                                user.department ??
                                "—"
                              }
                            </p>

                            <p className="mt-0.5 text-[10px] text-base-content/35">
                              {
                                user.job_title ??
                                "Cargo não informado"
                              }
                            </p>
                          </td>

                          {/* PERFIL */}

                          <td>
                            <RoleBadge
                              role={
                                role
                              }
                            />
                          </td>

                          {/* STATUS */}

                          <td>
                            <UserAccessStatus
                              active={
                                user.is_active
                              }
                              mustChangePassword={
                                user.must_change_password
                              }
                            />
                          </td>

                          {/* ÚLTIMO ACESSO */}

                          <td>
                            <div className="flex items-center gap-2">
                              <Clock3
                                size={
                                  13
                                }
                                className="text-base-content/25"
                              />

                              <span className="text-[11px] text-base-content/50">
                                {formatLastLogin(
                                  user.last_login_at
                                )}
                              </span>
                            </div>
                          </td>

                          {/* AÇÕES */}

                          <td>
                            <div className="flex items-center justify-end gap-1">
                              {awaitingFirstAccess && (
                                <FirstAccessLinkButton
                                  userId={
                                    user.id
                                  }
                                />
                              )}

                              <UserStatusButton
                                userId={
                                  user.id
                                }
                                active={
                                  user.is_active
                                }
                                disabled={
                                  cannotChangeStatus
                                }
                              />

                              {/* =============================
                                  EXCLUIR
                              ============================== */}

                              {canDeleteUser && (
                                <>
                                  <span className="mx-1 h-5 w-px bg-base-300" />

                                  <DeleteUserButton
                                    userId={
                                      user.id
                                    }
                                    userName={
                                      user.full_name ??
                                      user.email ??
                                      "Usuário"
                                    }
                                    userEmail={
                                      user.email
                                    }
                                    isSuperadminUser={
                                      targetIsSuperadmin
                                    }
                                  />
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </MotionReveal>
    </MotionPage>
  );
}

// ============================================================
// AVATAR
// ============================================================

function Avatar({
  name,
}: {
  name: string;
}) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-base-200 text-[10px] font-bold text-base-content/55">
      {getInitials(
        name
      )}
    </div>
  );
}

// ============================================================
// ROLE
// ============================================================

function RoleBadge({
  role,
}: {
  role: string;
}) {
  const config =
    role ===
    "superadmin"
      ? {
          label:
            "Superadmin",

          className:
            "badge-error",
        }
      : role ===
          "admin"
        ? {
            label:
              "Administrador",

            className:
              "badge-primary",
          }
        : role ===
            "finance"
          ? {
              label:
                "Financeiro",

              className:
                "badge-info",
            }
          : {
              label:
                "Colaborador",

              className:
                "badge-ghost",
            };

  return (
    <span
      className={[
        "badge badge-sm gap-1 whitespace-nowrap",
        config.className,
      ].join(
        " "
      )}
    >
      {(role ===
        "admin" ||
        role ===
          "superadmin") && (
        <ShieldCheck
          size={
            10
          }
        />
      )}

      {
        config.label
      }
    </span>
  );
}

// ============================================================
// STATUS DE ACESSO
// ============================================================

function UserAccessStatus({
  active,
  mustChangePassword,
}: {
  active: boolean;

  mustChangePassword: boolean;
}) {
  if (
    !active
  ) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-error">
          <span className="h-1.5 w-1.5 rounded-full bg-error" />

          Desativado
        </span>

        <span className="text-[9px] text-base-content/35">
          Acesso bloqueado
        </span>
      </div>
    );
  }

  if (
    mustChangePassword
  ) {
    return (
      <div className="flex flex-col items-start gap-1">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold text-warning">
          <span className="h-1.5 w-1.5 rounded-full bg-warning" />

          Aguardando acesso
        </span>

        <span className="flex items-center gap-1 text-[9px] font-medium text-info">
          <KeyRound
            size={
              10
            }
          />

          Criar senha
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-success">
        <span className="h-1.5 w-1.5 rounded-full bg-success" />

        Ativo
      </span>

      <span className="text-[9px] text-base-content/35">
        Acesso configurado
      </span>
    </div>
  );
}

// ============================================================
// PERFIL EFETIVO
// ============================================================

function getEffectiveRole(
  roles: string[]
) {
  if (
    roles.includes(
      "superadmin"
    )
  ) {
    return "superadmin";
  }

  if (
    roles.includes(
      "admin"
    )
  ) {
    return "admin";
  }

  if (
    roles.includes(
      "finance"
    )
  ) {
    return "finance";
  }

  return "collaborator";
}

// ============================================================
// LABEL DO PERFIL
// ============================================================

function getRoleLabel(
  role: string
) {
  if (
    role ===
    "superadmin"
  ) {
    return "Superadministrador";
  }

  if (
    role ===
    "admin"
  ) {
    return "Administrador";
  }

  if (
    role ===
    "finance"
  ) {
    return "Financeiro";
  }

  return "Colaborador";
}

// ============================================================
// ÚLTIMO LOGIN
// ============================================================

function formatLastLogin(
  value:
    | string
    | null
) {
  if (
    !value
  ) {
    return "Nunca acessou";
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

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