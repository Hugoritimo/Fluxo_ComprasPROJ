"use client";

import {
  useActionState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  type UserAccessState,
  updateUserAccess,
} from "./actions";

type UserFormProps = {
  user: {
    id: string;
    full_name: string;
    email: string;
    job_title: string | null;
    active: boolean;
    roles: string[];
  };

  currentUserId: string;

  actorIsSuperadmin: boolean;

  canEditTarget: boolean;
};

const initialState: UserAccessState = {
  error: null,
  success: null,
};

const permissions = [
  {
    value: "requester",
    label: "Solicitante",
    description:
      "Pode criar solicitações e acompanhar os próprios processos.",
  },

  {
    value: "buyer",
    label: "Comprador",
    description:
      "Perfil reservado para funções de compras.",
  },

  {
    value: "finance",
    label: "Financeiro",
    description:
      "Analisa solicitações, controla cartões e prestações de contas.",
  },

  {
    value: "approver",
    label: "Aprovador",
    description:
      "Permissão destinada às etapas de aprovação.",
  },

  {
    value: "manager",
    label: "Gestor",
    description:
      "Pode possuir acesso gerencial e visão ampliada do processo.",
  },

  {
    value: "admin",
    label: "Administrador",
    description:
      "Pode administrar usuários e configurações administrativas.",
  },

  {
    value: "superadmin",
    label: "Superadministrador",
    description:
      "Possui o maior nível de acesso ao sistema.",
  },
];

export default function UserForm({
  user,
  currentUserId,
  actorIsSuperadmin,
  canEditTarget,
}: UserFormProps) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    updateUserAccess,
    initialState
  );

  const isOwnAccount =
    user.id ===
    currentUserId;

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="user_id"
        value={user.id}
      />

      {/* =====================================================
          ALERTAS
      ====================================================== */}

      {state.error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          {state.error}
        </div>
      )}

      {state.success && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          {state.success}
        </div>
      )}

      {!canEditTarget && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          <ShieldCheck
            size={18}
            className="mt-0.5 shrink-0"
          />

          Somente um Superadministrador
          pode alterar este usuário.
        </div>
      )}

      {/* =====================================================
          DADOS DO USUÁRIO
      ====================================================== */}

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Nome
        </label>

        <div className="relative">
          <UserRound
            size={17}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            name="full_name"
            required
            defaultValue={
              user.full_name
            }
            disabled={
              pending ||
              !canEditTarget
            }
            className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:bg-slate-50"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          E-mail
        </label>

        <input
          value={
            user.email
          }
          readOnly
          className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-500"
        />

        <p className="mt-2 text-[11px] text-slate-400">
          O e-mail de autenticação não é
          alterado nesta tela.
        </p>
      </div>

      <div>
        <label className="mb-2 block text-sm font-semibold text-slate-700">
          Cargo
        </label>

        <input
          name="job_title"
          defaultValue={
            user.job_title ??
            ""
          }
          disabled={
            pending ||
            !canEditTarget
          }
          placeholder="Ex.: Analista Financeiro"
          className="h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:bg-slate-50"
        />
      </div>

      {/* =====================================================
          STATUS
      ====================================================== */}

      <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
        <div className="flex items-center justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Usuário ativo
            </p>

            <p className="mt-1 text-xs leading-5 text-slate-500">
              Usuários inativos não devem
              utilizar as áreas protegidas
              do sistema.
            </p>
          </div>

          <label className="relative inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              name="active"
              defaultChecked={
                user.active
              }
              disabled={
                pending ||
                !canEditTarget ||
                isOwnAccount
              }
              className="peer sr-only"
            />

            <div className="h-6 w-11 rounded-full bg-slate-300 transition after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#AF1B1B] peer-checked:after:translate-x-full peer-disabled:cursor-not-allowed peer-disabled:opacity-50" />
          </label>
        </div>

        {isOwnAccount && (
          <p className="mt-3 text-[11px] text-amber-600">
            Você não pode desativar sua
            própria conta.
          </p>
        )}

        {isOwnAccount &&
          user.active && (
            <input
              type="hidden"
              name="active"
              value="on"
            />
          )}
      </section>

      {/* =====================================================
          PERMISSÕES
      ====================================================== */}

      <section>
        <div className="mb-4">
          <p className="text-sm font-semibold text-slate-800">
            Permissões
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Defina quais módulos e funções
            estarão disponíveis para este
            usuário.
          </p>
        </div>

        <div className="space-y-3">
          {permissions.map(
            (permission) => {
              const isSuperadmin =
                permission.value ===
                "superadmin";

              const requester =
                permission.value ===
                "requester";

              const disabled =
                pending ||
                !canEditTarget ||
                requester ||
                (
                  isSuperadmin &&
                  !actorIsSuperadmin
                ) ||
                (
                  isSuperadmin &&
                  isOwnAccount &&
                  user.roles.includes(
                    "superadmin"
                  )
                );

              return (
                <label
                  key={
                    permission.value
                  }
                  className={[
                    "flex gap-4 rounded-xl border p-4 transition",
                    disabled
                      ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-70"
                      : "cursor-pointer border-slate-200 bg-white hover:border-[#AF1B1B]/30",
                  ].join(
                    " "
                  )}
                >
                  <input
                    type="checkbox"
                    name="roles"
                    value={
                      permission.value
                    }
                    defaultChecked={
                      requester ||
                      user.roles.includes(
                        permission.value
                      )
                    }
                    disabled={
                      disabled
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 accent-[#AF1B1B]"
                  />

                  {requester && (
                    <input
                      type="hidden"
                      name="roles"
                      value="requester"
                    />
                  )}

                  {isSuperadmin &&
                    isOwnAccount &&
                    user.roles.includes(
                      "superadmin"
                    ) && (
                      <input
                        type="hidden"
                        name="roles"
                        value="superadmin"
                      />
                    )}

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {
                        permission.label
                      }
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {
                        permission.description
                      }
                    </p>
                  </div>
                </label>
              );
            }
          )}
        </div>
      </section>

      {/* =====================================================
          SALVAR
      ====================================================== */}

      {canEditTarget && (
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white transition hover:bg-[#921717] disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle
              size={18}
              className="animate-spin"
            />
          ) : (
            <Save size={18} />
          )}

          {pending
            ? "Salvando..."
            : "Salvar alterações"}
        </button>
      )}
    </form>
  );
}