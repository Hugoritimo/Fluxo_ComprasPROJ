"use client";

import {
  useActionState,
} from "react";

import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  LoaderCircle,
  Mail,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import {
  inviteUser,
  type InviteUserState,
} from "./actions";

type InviteFormProps = {
  actorIsSuperadmin: boolean;
};

const initialState: InviteUserState = {
  error: null,
  success: null,
};

const permissions = [
  {
    value: "requester",
    label: "Solicitante",
    description:
      "Cria solicitações e acompanha os próprios processos.",
  },

  {
    value: "buyer",
    label: "Comprador",
    description:
      "Perfil destinado às atividades de compras.",
  },

  {
    value: "finance",
    label: "Financeiro",
    description:
      "Analisa solicitações, controla cartões e confere devoluções.",
  },

  {
    value: "approver",
    label: "Aprovador",
    description:
      "Participa das etapas de aprovação.",
  },

  {
    value: "manager",
    label: "Gestor",
    description:
      "Possui visão gerencial ampliada.",
  },

  {
    value: "admin",
    label: "Administrador",
    description:
      "Administra usuários e configurações do sistema.",
  },

  {
    value: "superadmin",
    label: "Superadministrador",
    description:
      "Possui acesso administrativo completo.",
  },
];

export default function InviteForm({
  actorIsSuperadmin,
}: InviteFormProps) {
  const [
    state,
    formAction,
    pending,
  ] = useActionState(
    inviteUser,
    initialState
  );

  return (
    <form
      action={formAction}
      className="space-y-7"
    >
      {/* =====================================================
          MENSAGENS
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

          <div>
            <p className="font-semibold">
              Convite enviado
            </p>

            <p className="mt-1">
              {state.success}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          DADOS
      ====================================================== */}

      <div className="grid gap-5 md:grid-cols-2">
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Nome completo *
          </label>

          <div className="relative">
            <UserRound
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              name="full_name"
              required
              disabled={pending}
              placeholder="Ex.: João da Silva"
              className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            E-mail corporativo *
          </label>

          <div className="relative">
            <Mail
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              type="email"
              name="email"
              required
              disabled={pending}
              placeholder="usuario@projetacs.com"
              className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Cargo
          </label>

          <div className="relative">
            <BriefcaseBusiness
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              name="job_title"
              disabled={pending}
              placeholder="Ex.: Engenheiro"
              className="h-12 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          PERMISSÕES
      ====================================================== */}

      <section>
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck
              size={18}
              className="text-[#AF1B1B]"
            />

            <h2 className="text-sm font-semibold text-slate-800">
              Permissões iniciais
            </h2>
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-500">
            O perfil Solicitante será
            concedido automaticamente.
            Selecione acessos adicionais
            conforme a função do colaborador.
          </p>
        </div>

        <div className="space-y-3">
          {permissions.map(
            (
              permission
            ) => {
              const requester =
                permission.value ===
                "requester";

              const superadmin =
                permission.value ===
                "superadmin";

              if (
                superadmin &&
                !actorIsSuperadmin
              ) {
                return null;
              }

              return (
                <label
                  key={
                    permission.value
                  }
                  className={[
                    "flex gap-4 rounded-xl border p-4 transition",
                    requester
                      ? "cursor-not-allowed border-slate-200 bg-slate-50"
                      : "cursor-pointer border-slate-200 bg-white hover:border-[#AF1B1B]/30",
                  ].join(" ")}
                >
                  <input
                    type="checkbox"
                    name="roles"
                    value={
                      permission.value
                    }
                    defaultChecked={
                      requester
                    }
                    disabled={
                      pending ||
                      requester
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
          AVISO
      ====================================================== */}

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <div className="flex gap-3">
          <Mail
            size={19}
            className="mt-0.5 shrink-0 text-blue-600"
          />

          <div>
            <p className="text-sm font-semibold text-blue-800">
              Convite por e-mail
            </p>

            <p className="mt-1 text-xs leading-5 text-blue-700">
              O usuário receberá um link
              para ativar a conta e criar
              sua própria senha. Nenhuma
              senha será definida pelo
              administrador.
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          ENVIAR
      ====================================================== */}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white transition hover:bg-[#921717] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <>
            <LoaderCircle
              size={18}
              className="animate-spin"
            />

            Enviando convite...
          </>
        ) : (
          <>
            <Send
              size={18}
            />

            Enviar convite
          </>
        )}
      </button>
    </form>
  );
}