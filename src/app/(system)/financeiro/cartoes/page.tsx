import type {
  ElementType,
} from "react";

import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Ban,
  CircleDollarSign,
  CreditCard,
  Plus,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import {
  changeCardStatus,
} from "./actions";

import { createClient } from "@/lib/supabase/server";

function formatCurrency(
  value:
    | number
    | string
    | null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "Não informado";
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(
    Number(value)
  );
}

function getStatus(
  status: string
) {
  const config: Record<
    string,
    {
      label: string;
      className: string;
    }
  > = {
    available: {
      label: "Disponível",
      className:
        "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    },

    reserved: {
      label: "Reservado",
      className:
        "bg-amber-50 text-amber-700 ring-amber-600/20",
    },

    in_use: {
      label: "Em uso",
      className:
        "bg-blue-50 text-blue-700 ring-blue-600/20",
    },

    blocked: {
      label: "Bloqueado",
      className:
        "bg-red-50 text-red-700 ring-red-600/20",
    },

    inactive: {
      label: "Inativo",
      className:
        "bg-slate-100 text-slate-500 ring-slate-500/20",
    },
  };

  return (
    config[status] ?? {
      label: status,
      className:
        "bg-slate-100 text-slate-600 ring-slate-500/20",
    }
  );
}

export default async function CorporateCardsPage() {
  const supabase =
    await createClient();

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect("/login");
  }

  const {
    data: roleRows,
  } =
    await supabase
      .from("user_roles")
      .select("role")
      .eq(
        "user_id",
        userId
      );

  const roles = (
    roleRows ?? []
  ).map(
    (item) => item.role
  );

  const canManage =
    roles.includes("finance") ||
    roles.includes("admin") ||
    roles.includes(
      "superadmin"
    );

  if (!canManage) {
    redirect("/dashboard");
  }

  const {
    data: cards,
    error,
  } = await supabase
    .from("credit_cards")
    .select(
      `
      id,
      name,
      bank_name,
      last_four_digits,
      credit_limit,
      status,
      active,
      notes,
      created_at,
      updated_at
      `
    )
    .order(
      "name",
      {
        ascending: true,
      }
    );

  if (error) {
    console.error(
      "Erro ao carregar cartões:",
      error
    );
  }

  const data =
    cards ?? [];

  const available =
    data.filter(
      (card) =>
        card.status ===
        "available"
    ).length;

  const reserved =
    data.filter(
      (card) =>
        card.status ===
        "reserved"
    ).length;

  const inUse =
    data.filter(
      (card) =>
        card.status ===
        "in_use"
    ).length;

  const blocked =
    data.filter(
      (card) =>
        card.status ===
          "blocked" ||
        card.status ===
          "inactive"
    ).length;

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* CABEÇALHO */}

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#AF1B1B]">
            Financeiro
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Cartões Corporativos
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Controle a disponibilidade
            dos cartões utilizados nas
            solicitações.
          </p>
        </div>

        <Link
          href="/financeiro/cartoes/novo"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white transition hover:bg-[#921717]"
        >
          <Plus size={18} />

          Novo Cartão
        </Link>
      </div>

      {/* INDICADORES */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={ShieldCheck}
          label="Disponíveis"
          value={available}
        />

        <SummaryCard
          icon={WalletCards}
          label="Reservados"
          value={reserved}
        />

        <SummaryCard
          icon={CreditCard}
          label="Em uso"
          value={inUse}
        />

        <SummaryCard
          icon={Ban}
          label="Bloqueados / Inativos"
          value={blocked}
        />
      </div>

      {/* LISTAGEM */}

      {data.length === 0 ? (
        <section className="flex min-h-[380px] flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <CreditCard
              size={28}
            />
          </div>

          <h2 className="mt-5 text-lg font-semibold text-slate-800">
            Nenhum cartão cadastrado
          </h2>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
            Cadastre o primeiro cartão
            corporativo para iniciar as
            reservas e liberações.
          </p>

          <Link
            href="/financeiro/cartoes/novo"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white"
          >
            <Plus size={18} />

            Cadastrar primeiro cartão
          </Link>
        </section>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {data.map(
            (card) => {
              const status =
                getStatus(
                  card.status
                );

              return (
                <article
                  key={card.id}
                  className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <CreditCard
                        size={21}
                      />
                    </div>

                    <span
                      className={[
                        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ring-1 ring-inset",
                        status.className,
                      ].join(" ")}
                    >
                      {
                        status.label
                      }
                    </span>
                  </div>

                  <h2 className="mt-5 text-lg font-semibold text-slate-950">
                    {card.name}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    {card.bank_name}{" "}
                    · ••••{" "}
                    {
                      card.last_four_digits
                    }
                  </p>

                  <div className="my-5 border-t border-slate-100" />

                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400">
                      <CircleDollarSign
                        size={17}
                      />
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Limite
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-slate-800">
                        {formatCurrency(
                          card.credit_limit
                        )}
                      </p>
                    </div>
                  </div>

                  {card.notes && (
                    <p className="mt-5 line-clamp-2 text-xs leading-5 text-slate-500">
                      {card.notes}
                    </p>
                  )}

                  <div className="mt-6 flex flex-wrap gap-2">
                    {card.status ===
                      "available" && (
                      <form
                        action={
                          changeCardStatus
                        }
                      >
                        <input
                          type="hidden"
                          name="card_id"
                          value={
                            card.id
                          }
                        />

                        <input
                          type="hidden"
                          name="status"
                          value="blocked"
                        />

                        <button
                          type="submit"
                          className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                        >
                          Bloquear
                        </button>
                      </form>
                    )}

                    {card.status ===
                      "blocked" && (
                      <form
                        action={
                          changeCardStatus
                        }
                      >
                        <input
                          type="hidden"
                          name="card_id"
                          value={
                            card.id
                          }
                        />

                        <input
                          type="hidden"
                          name="status"
                          value="available"
                        />

                        <button
                          type="submit"
                          className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                        >
                          Desbloquear
                        </button>
                      </form>
                    )}

                    {card.status ===
                      "available" && (
                      <form
                        action={
                          changeCardStatus
                        }
                      >
                        <input
                          type="hidden"
                          name="card_id"
                          value={
                            card.id
                          }
                        />

                        <input
                          type="hidden"
                          name="status"
                          value="inactive"
                        />

                        <button
                          type="submit"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:bg-slate-50"
                        >
                          Inativar
                        </button>
                      </form>
                    )}

                    {card.status ===
                      "inactive" && (
                      <form
                        action={
                          changeCardStatus
                        }
                      >
                        <input
                          type="hidden"
                          name="card_id"
                          value={
                            card.id
                          }
                        />

                        <input
                          type="hidden"
                          name="status"
                          value="available"
                        />

                        <button
                          type="submit"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Reativar
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              );
            }
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon size={19} />
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