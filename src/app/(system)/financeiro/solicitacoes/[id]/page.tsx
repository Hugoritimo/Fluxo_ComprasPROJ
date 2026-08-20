import type {
  ElementType,
} from "react";

import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  CreditCard,
  FileText,
  Hash,
  Mail,
  Store,
  User,
} from "lucide-react";

import CardRequestStatus, {
  getCardRequestStatusLabel,
} from "@/components/cards/card-request-status";

import {
  createClient,
} from "@/lib/supabase/server";

import CopyReturnLinkButton from "./copy-return-link-button";

import WorkflowForm from "./workflow-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

// ============================================================
// STATUS QUE JÁ POSSUEM LINK DE DEVOLUÇÃO
// ============================================================

const returnLinkStatuses = [
  "card_delivered",
  "in_use",
  "awaiting_return",
  "returned",
  "accountability_review",
  "completed",
];

// ============================================================
// FORMATADORES
// ============================================================

function formatCurrency(
  value:
    | number
    | string
    | null
) {
  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(
    Number(value ?? 0)
  );
}

function formatDate(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "pt-BR"
  ).format(
    new Date(
      `${value}T12:00:00`
    )
  );
}

function formatDateTime(
  value: string | null
) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle:
        "short",

      timeStyle:
        "short",
    }
  ).format(
    new Date(value)
  );
}

function reasonLabel(
  reason:
    | string
    | null,

  other:
    | string
    | null
) {
  if (
    reason ===
    "emergency"
  ) {
    return "Emergencial";
  }

  if (
    reason ===
    "supplier_not_registered"
  ) {
    return "Sem fornecedor cadastrado";
  }

  if (
    reason ===
    "other"
  ) {
    return other
      ? `Outro: ${other}`
      : "Outro";
  }

  return "-";
}

// ============================================================
// PAGE
// ============================================================

export default async function FinanceRequestDetailsPage({
  params,
}: PageProps) {
  const {
    id,
  } = await params;

  const supabase =
    await createClient();

  // =========================================================
  // USUÁRIO LOGADO
  // =========================================================

  const {
    data: claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    redirect(
      "/login"
    );
  }

  // =========================================================
  // VERIFICA PERMISSÃO FINANCEIRA
  // =========================================================

  const {
    data: roleRows,
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
        userId
      );

  const roles = (
    roleRows ?? []
  ).map(
    (item) =>
      item.role
  );

  const canAccess =
    roles.includes(
      "finance"
    ) ||
    roles.includes(
      "admin"
    ) ||
    roles.includes(
      "superadmin"
    );

  if (!canAccess) {
    redirect(
      "/dashboard"
    );
  }

  // =========================================================
  // SOLICITAÇÃO
  // =========================================================

  const {
    data: request,
    error,
  } =
    await supabase
      .from(
        "card_requests"
      )
      .select(
        `
        id,
        request_number,
        requester_id,

        request_date,
        requester_email_snapshot,

        sienge_request_number,
        cost_center_or_site,
        suppliers_text,

        estimated_amount,
        approved_amount,

        purchase_reason,
        purchase_reason_other,

        purpose,
        justification,

        status,

        assigned_card_id,
        expected_return_date,

        finance_notes,

        external_return_token,
        external_return_enabled,

        submitted_at,
        approved_at,
        delivered_at,
        returned_at,
        completed_at,

        created_at,
        updated_at
        `
      )
      .eq(
        "id",
        id
      )
      .is(
        "deleted_at",
        null
      )
      .single();

  if (
    error ||
    !request
  ) {
    console.error(
      "Erro ao carregar solicitação:",
      error
    );

    notFound();
  }

  // =========================================================
  // DADOS COMPLEMENTARES
  // =========================================================

  const [
    profileResult,
    historyResult,
    cardsResult,
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
          job_title
          `
        )
        .eq(
          "id",
          request.requester_id
        )
        .single(),

      supabase
        .from(
          "card_request_status_history"
        )
        .select(
          `
          id,
          previous_status,
          new_status,
          notes,
          created_at
          `
        )
        .eq(
          "card_request_id",
          request.id
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        ),

      supabase
        .from(
          "credit_cards"
        )
        .select(
          `
          id,
          name,
          bank_name,
          last_four_digits,
          status,
          active
          `
        )
        .order(
          "name",
          {
            ascending:
              true,
          }
        ),
    ]);

  const requester =
    profileResult.data;

  const history =
    historyResult.data ??
    [];

  const cards =
    cardsResult.data ??
    [];

  // =========================================================
  // LINK EXTERNO DE DEVOLUÇÃO
  // =========================================================

  const canShowReturnLink =
    returnLinkStatuses.includes(
      request.status
    ) &&
    Boolean(
      request.external_return_token
    );

  // =========================================================
  // PÁGINA
  // =========================================================

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* VOLTAR */}

      <Link
        href="/financeiro/solicitacoes"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft
          size={16}
        />

        Voltar para
        solicitações
      </Link>

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-[#AF1B1B]">
              {
                request.request_number
              }
            </span>

            <CardRequestStatus
              status={
                request.status
              }
            />
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Análise da
            Solicitação
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Pedido Sienge{" "}
            <strong className="text-slate-700">
              {request.sienge_request_number ??
                "Ainda não informado"}
            </strong>
          </p>
        </div>

        <div className="min-w-56 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Valor solicitado
          </p>

          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {formatCurrency(
              request.estimated_amount
            )}
          </p>

          {request.approved_amount !==
            null && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Valor aprovado
              </p>

              <p className="mt-1 text-sm font-semibold text-emerald-700">
                {formatCurrency(
                  request.approved_amount
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          GRID PRINCIPAL
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-[1fr_410px]">
        {/* ===================================================
            COLUNA ESQUERDA
        ==================================================== */}

        <div className="space-y-6">
          {/* RESUMO */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              icon={Hash}
              label="Pedido Sienge"
              value={
                request.sienge_request_number ??
                "-"
              }
            />

            <InfoCard
              icon={User}
              label="Solicitante"
              value={
                requester?.full_name ??
                "-"
              }
            />

            <InfoCard
              icon={
                Building2
              }
              label="Centro de custo / Obra"
              value={
                request.cost_center_or_site ??
                "-"
              }
            />

            <InfoCard
              icon={
                CalendarDays
              }
              label="Solicitado em"
              value={formatDate(
                request.request_date
              )}
            />
          </section>

          {/* =================================================
              DADOS DA COMPRA
          ================================================== */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Dados da compra
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Informações fornecidas
                pelo solicitante.
              </p>
            </div>

            <div className="grid gap-6 p-6 md:grid-cols-2">
              <DataField
                icon={User}
                label="Solicitante"
                value={
                  requester?.full_name ??
                  "-"
                }
              />

              <DataField
                icon={Mail}
                label="E-mail"
                value={
                  requester?.email ??
                  request.requester_email_snapshot ??
                  "-"
                }
              />

              <DataField
                icon={Hash}
                label="Pedido Sienge"
                value={
                  request.sienge_request_number ??
                  "-"
                }
              />

              <DataField
                icon={Store}
                label="Fornecedor(es)"
                value={
                  request.suppliers_text ??
                  "-"
                }
              />

              <DataField
                icon={
                  CircleDollarSign
                }
                label="Valor previsto"
                value={formatCurrency(
                  request.estimated_amount
                )}
              />

              <DataField
                icon={
                  CreditCard
                }
                label="Forma de pagamento"
                value="Cartão de crédito"
              />

              <div className="md:col-span-2">
                <DataField
                  icon={
                    FileText
                  }
                  label="Motivo da compra"
                  value={reasonLabel(
                    request.purchase_reason,
                    request.purchase_reason_other
                  )}
                />
              </div>
            </div>
          </section>

          {/* =================================================
              FINALIDADE
          ================================================== */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Finalidade da
                compra
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Onde será utilizado
                e qual necessidade
                será atendida.
              </p>
            </div>

            <div className="p-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {
                  request.purpose
                }
              </p>

              {request.justification && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Observações
                    adicionais
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {
                      request.justification
                    }
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              HISTÓRICO
          ================================================== */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Histórico da
                solicitação
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Todas as mudanças de
                status realizadas no
                processo.
              </p>
            </div>

            <div className="p-6">
              {history.length ===
              0 ? (
                <p className="py-8 text-center text-sm text-slate-400">
                  Nenhuma
                  movimentação
                  registrada.
                </p>
              ) : (
                <div>
                  {history.map(
                    (
                      entry,
                      index
                    ) => {
                      const isLast =
                        index ===
                        history.length -
                          1;

                      return (
                        <div
                          key={
                            entry.id
                          }
                          className="relative flex gap-4 pb-8 last:pb-0"
                        >
                          {!isLast && (
                            <div className="absolute left-[8px] top-5 h-full w-px bg-slate-200" />
                          )}

                          <div className="relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full border-[3px] border-white bg-[#AF1B1B] ring-1 ring-slate-200" />

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800">
                              {getCardRequestStatusLabel(
                                entry.new_status
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {formatDateTime(
                                entry.created_at
                              )}
                            </p>

                            {entry.notes && (
                              <p className="mt-2 text-xs leading-5 text-slate-500">
                                {
                                  entry.notes
                                }
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* ===================================================
            PAINEL FINANCEIRO
        ==================================================== */}

        <aside>
          <div className="sticky top-24 space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <p className="text-xs font-semibold text-[#AF1B1B]">
                  Gestão Financeira
                </p>

                <h2 className="mt-1 text-lg font-semibold text-slate-950">
                  Atualizar
                  andamento
                </h2>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  As alterações
                  feitas aqui
                  aparecerão para
                  o solicitante no
                  Dashboard e na
                  timeline.
                </p>
              </div>

              <WorkflowForm
                request={{
                  id:
                    request.id,

                  status:
                    request.status,

                  estimated_amount:
                    request.estimated_amount,

                  approved_amount:
                    request.approved_amount,

                  assigned_card_id:
                    request.assigned_card_id,

                  expected_return_date:
                    request.expected_return_date,

                  finance_notes:
                    request.finance_notes,
                }}
                cards={
                  cards
                }
              />
            </section>

            {/* ===============================================
                LINK EXTERNO DE DEVOLUÇÃO
            ================================================ */}

            {canShowReturnLink &&
              request.external_return_token && (
                <CopyReturnLinkButton
                  token={
                    request.external_return_token
                  }
                  enabled={
                    request.external_return_enabled
                  }
                />
              )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ============================================================
// INFO CARD
// ============================================================

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Icon
        size={18}
        className="text-slate-400"
      />

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// DATA FIELD
// ============================================================

function DataField({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
        <Icon
          size={16}
        />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-sm font-medium text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}