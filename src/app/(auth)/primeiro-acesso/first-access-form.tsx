"use client";

import type {
  ReactNode,
} from "react";

import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  Check,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";

import {
  changeFirstAccessPassword,
  type PasswordChangeState,
} from "./actions";

// ============================================================
// ESTADO INICIAL
// ============================================================

const initialState: PasswordChangeState = {
  error: null,
};

// ============================================================
// FORM
// ============================================================

export default function FirstAccessForm() {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      changeFirstAccessPassword,
      initialState
    );

  const [
    password,
    setPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  // =========================================================
  // REQUISITOS
  // =========================================================

  const requirements =
    useMemo(
      () => [
        {
          label:
            "Pelo menos 10 caracteres",

          valid:
            password.length >= 10,
        },

        {
          label:
            "Uma letra maiúscula",

          valid:
            /[A-Z]/.test(
              password
            ),
        },

        {
          label:
            "Uma letra minúscula",

          valid:
            /[a-z]/.test(
              password
            ),
        },

        {
          label:
            "Um número",

          valid:
            /[0-9]/.test(
              password
            ),
        },

        {
          label:
            "Um caractere especial",

          valid:
            /[^A-Za-z0-9]/.test(
              password
            ),
        },

        {
          label:
            "Sem espaços",

          valid:
            password.length > 0 &&
            !/\s/.test(
              password
            ),
        },
      ],
      [
        password,
      ]
    );

  const passwordValid =
    requirements.every(
      (
        requirement
      ) =>
        requirement.valid
    );

  const confirmationValid =
    confirmPassword.length >
      0 &&
    password ===
      confirmPassword;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      {/* =====================================================
          NOVA SENHA
      ====================================================== */}

      <div>
        <label
          htmlFor="password"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Nova senha
        </label>

        <div className="relative">
          <LockKeyhole
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            id="password"
            name="password"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            required
            autoFocus
            value={password}
            onChange={(
              event
            ) =>
              setPassword(
                event.target.value
              )
            }
            disabled={pending}
            placeholder="Crie sua nova senha"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
          />

          <button
            type="button"
            onClick={() =>
              setShowPassword(
                (
                  current
                ) =>
                  !current
              )
            }
            disabled={pending}
            aria-label={
              showPassword
                ? "Ocultar senha"
                : "Mostrar senha"
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none"
          >
            {showPassword ? (
              <EyeOff
                size={18}
              />
            ) : (
              <Eye
                size={18}
              />
            )}
          </button>
        </div>
      </div>

      {/* =====================================================
          REQUISITOS
      ====================================================== */}

      <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
        {requirements.map(
          (
            requirement
          ) => (
            <Requirement
              key={
                requirement.label
              }
              valid={
                requirement.valid
              }
            >
              {
                requirement.label
              }
            </Requirement>
          )
        )}
      </div>

      {/* =====================================================
          CONFIRMAÇÃO
      ====================================================== */}

      <div>
        <label
          htmlFor="confirmPassword"
          className="mb-2 block text-sm font-medium text-slate-700"
        >
          Confirmar nova senha
        </label>

        <div className="relative">
          <ShieldCheck
            size={18}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            id="confirmPassword"
            name="confirmPassword"
            type={
              showPassword
                ? "text"
                : "password"
            }
            autoComplete="new-password"
            required
            value={
              confirmPassword
            }
            onChange={(
              event
            ) =>
              setConfirmPassword(
                event.target.value
              )
            }
            disabled={pending}
            placeholder="Digite novamente"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-11 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10 disabled:cursor-not-allowed disabled:bg-slate-50"
          />

          {confirmPassword && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              {confirmationValid ? (
                <Check
                  size={17}
                  className="text-green-600"
                />
              ) : (
                <X
                  size={17}
                  className="text-red-500"
                />
              )}
            </div>
          )}
        </div>

        {confirmPassword &&
          !confirmationValid && (
            <p className="mt-2 text-xs font-medium text-red-600">
              As senhas ainda não são iguais.
            </p>
          )}
      </div>

      {/* =====================================================
          ERRO
      ====================================================== */}

      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-6 text-red-700"
        >
          {state.error}
        </div>
      )}

      {/* =====================================================
          SALVAR
      ====================================================== */}

      <button
        type="submit"
        disabled={
          pending ||
          !passwordValid ||
          !confirmationValid
        }
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(175,27,27,0.18)] transition hover:bg-[#941717] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <>
            <LoaderCircle
              size={18}
              className="animate-spin"
            />

            Configurando conta...
          </>
        ) : (
          <>
            <ShieldCheck
              size={17}
            />

            Criar minha senha
          </>
        )}
      </button>
    </form>
  );
}

// ============================================================
// REQUISITO
// ============================================================

function Requirement({
  valid,
  children,
}: {
  valid: boolean;

  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={[
          "flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition",
          valid
            ? "bg-green-100 text-green-600"
            : "bg-slate-200 text-slate-400",
        ].join(" ")}
      >
        {valid && (
          <Check
            size={12}
            strokeWidth={3}
          />
        )}
      </div>

      <span
        className={[
          "text-[11px] transition",
          valid
            ? "font-medium text-green-700"
            : "text-slate-500",
        ].join(" ")}
      >
        {children}
      </span>
    </div>
  );
}