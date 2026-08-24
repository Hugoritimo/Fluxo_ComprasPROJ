"use client";

import {
  useActionState,
  useState,
} from "react";

import {
  CheckCircle2,
  Clipboard,
  KeyRound,
  LoaderCircle,
  Plus,
  ShieldCheck,
  UserPlus,
  X,
} from "lucide-react";

import {
  createSystemUser,
  type CreateUserState,
} from "./actions";

const initialState: CreateUserState = {
  success: false,
  error: null,
};

type Props = {
  canCreateSuperadmin: boolean;
};

export default function CreateUserDialog({
  canCreateSuperadmin,
}: Props) {
  const [
    open,
    setOpen,
  ] =
    useState(false);

  const [
    formKey,
    setFormKey,
  ] =
    useState(0);

  function close() {
    setOpen(false);

    window.setTimeout(
      () => {
        setFormKey(
          (current) =>
            current + 1
        );
      },
      200
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        className="btn btn-primary btn-sm h-10 gap-2 rounded-xl px-4"
      >
        <Plus size={16} />

        Novo usuário
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
          <button
            type="button"
            aria-label="Fechar"
            onClick={close}
            className="absolute inset-0"
          />

          <div className="relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-base-300 bg-base-100 shadow-2xl">
            <CreateUserForm
              key={formKey}
              canCreateSuperadmin={
                canCreateSuperadmin
              }
              onClose={close}
            />
          </div>
        </div>
      )}
    </>
  );
}

// ============================================================
// FORM
// ============================================================

function CreateUserForm({
  canCreateSuperadmin,
  onClose,
}: {
  canCreateSuperadmin: boolean;
  onClose: () => void;
}) {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      createSystemUser,
      initialState
    );

  if (
    state.success &&
    state.invitationLink
  ) {
    return (
      <CreatedUserSuccess
        email={
          state.email ?? ""
        }
        invitationLink={
          state.invitationLink
        }
        onClose={onClose}
      />
    );
  }

  return (
    <>
      <div className="flex items-start justify-between border-b border-base-300 px-6 py-5">
        <div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserPlus
              size={18}
            />
          </div>

          <h2 className="mt-4 text-xl font-semibold tracking-tight">
            Novo usuário
          </h2>

          <p className="mt-1 text-xs text-base-content/45">
            Crie o acesso e gere um link seguro de
            primeiro acesso.
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-sm btn-circle"
        >
          <X size={17} />
        </button>
      </div>

      <form action={formAction}>
        <div className="grid gap-5 p-6 sm:grid-cols-2">
          <Field
            label="Nome completo"
            required
          >
            <input
              name="fullName"
              required
              disabled={pending}
              placeholder="Nome do colaborador"
              className="input w-full"
            />
          </Field>

          <Field
            label="E-mail corporativo"
            required
          >
            <input
              name="email"
              type="email"
              required
              disabled={pending}
              placeholder="nome@projetacs.com"
              className="input w-full"
            />
          </Field>

          <Field label="Setor">
            <input
              name="department"
              disabled={pending}
              placeholder="Ex.: TI, Financeiro..."
              className="input w-full"
            />
          </Field>

          <Field label="Cargo">
            <input
              name="jobTitle"
              disabled={pending}
              placeholder="Ex.: Analista de TI"
              className="input w-full"
            />
          </Field>

          <Field label="Telefone">
            <input
              name="phone"
              disabled={pending}
              placeholder="Opcional"
              className="input w-full"
            />
          </Field>

          <Field
            label="Perfil de acesso"
            required
          >
            <select
              name="role"
              defaultValue="collaborator"
              disabled={pending}
              className="select w-full"
            >
              <option value="collaborator">
                Colaborador
              </option>

              <option value="finance">
                Financeiro
              </option>

              <option value="admin">
                Administrador
              </option>

              {canCreateSuperadmin && (
                <option value="superadmin">
                  Superadministrador
                </option>
              )}
            </select>
          </Field>

          <div className="sm:col-span-2">
            <div className="rounded-2xl border border-info/15 bg-info/[0.04] p-4">
              <div className="flex gap-3">
                <KeyRound
                  size={19}
                  className="mt-0.5 shrink-0 text-info"
                />

                <div>
                  <p className="text-xs font-semibold">
                    Primeiro acesso
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-base-content/45">
                    Nenhuma senha será criada pelo
                    administrador. O sistema gerará um
                    link individual para o colaborador
                    definir a própria senha.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {state.error && (
            <div className="sm:col-span-2 rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-sm font-medium text-error">
              {state.error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-base-300 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="btn btn-ghost btn-sm rounded-xl"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary btn-sm min-w-40 gap-2 rounded-xl"
          >
            {pending ? (
              <>
                <LoaderCircle
                  size={15}
                  className="animate-spin"
                />

                Criando...
              </>
            ) : (
              <>
                <UserPlus
                  size={15}
                />

                Criar usuário
              </>
            )}
          </button>
        </div>
      </form>
    </>
  );
}

// ============================================================
// SUCESSO
// ============================================================

function CreatedUserSuccess({
  email,
  invitationLink,
  onClose,
}: {
  email: string;
  invitationLink: string;
  onClose: () => void;
}) {
  const [
    copied,
    setCopied,
  ] =
    useState(false);

  async function copyLink() {
    await navigator.clipboard.writeText(
      invitationLink
    );

    setCopied(true);

    window.setTimeout(
      () =>
        setCopied(false),
      2000
    );
  }

  return (
    <div className="p-7">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-success/10 text-success">
        <CheckCircle2
          size={25}
        />
      </div>

      <h2 className="mt-5 text-2xl font-semibold tracking-tight">
        Usuário criado
      </h2>

      <p className="mt-2 text-sm leading-6 text-base-content/50">
        A conta foi criada. Agora envie o link de
        primeiro acesso ao colaborador.
      </p>

      <div className="mt-6 rounded-2xl border border-base-300 bg-base-200/30 p-4">
        <p className="text-[9px] font-bold uppercase tracking-wider text-base-content/35">
          Usuário
        </p>

        <p className="mt-1 text-sm font-semibold">
          {email}
        </p>
      </div>

      <div className="mt-3 rounded-2xl border border-primary/15 bg-primary/[0.035] p-4">
        <div className="flex gap-3">
          <KeyRound
            size={18}
            className="mt-0.5 shrink-0 text-primary"
          />

          <div>
            <p className="text-xs font-semibold">
              Link de primeiro acesso gerado
            </p>

            <p className="mt-1 text-[11px] leading-5 text-base-content/45">
              Copie e envie pelo Teams ou outro canal
              interno. O usuário ainda precisará confirmar
              a ativação e criar a própria senha.
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={copyLink}
        className="btn btn-primary mt-5 w-full gap-2 rounded-xl"
      >
        {copied ? (
          <CheckCircle2
            size={17}
          />
        ) : (
          <Clipboard
            size={17}
          />
        )}

        {copied
          ? "Link copiado"
          : "Copiar link de primeiro acesso"}
      </button>

      <div className="mt-4 rounded-xl border border-warning/20 bg-warning/5 p-4">
        <div className="flex gap-3">
          <ShieldCheck
            size={17}
            className="mt-0.5 shrink-0 text-warning"
          />

          <p className="text-xs leading-5 text-base-content/50">
            Para testar o acesso sem substituir sua
            própria sessão administrativa, abra o link
            em uma <strong>janela anônima/privada</strong>.
          </p>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-sm rounded-xl px-6"
        >
          Concluir
        </button>
      </div>
    </div>
  );
}

// ============================================================
// FIELD
// ============================================================

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold text-base-content/65">
        {label}

        {required && (
          <span className="ml-1 text-primary">
            *
          </span>
        )}
      </span>

      {children}
    </label>
  );
}