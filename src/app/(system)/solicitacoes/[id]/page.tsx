import type { ElementType } from "react";

import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  Clock3,
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

import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatCurrency(
  value: number | string | null
) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR").format(
    new Date(`${value}T12:00:00`)
  );
}

function formatDateTime(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getReasonLabel(
  reason: string | null,
  other: string | null
) {
  if (reason === "emergency") {
    return "Emergencial";
  }

  if (reason === "supplier_not_registered") {
    return "Sem fornecedor cadastrado";
  }

  if (reason === "other") {
    return other ? `Outro: ${other}` : "Outro";
  }

  return "-";
}

function getNextStep(status: string) {
  const steps: Record<string, string> = {
    draft:
      "Finalize e envie a solicitação.",

    submitted:
      "Sua solicitação foi enviada e aguarda análise do setor responsável.",

    under_review:
      "Sua solicitação está sendo analisada pelo Financeiro.",

    awaiting_information:
      "Existem informações pendentes para continuidade da análise.",

    awaiting_approval:
      "Sua solicitação está aguardando aprovação.",

    approved:
      "Sua solicitação foi aprovada. O Financeiro irá preparar o cartão.",

    rejected:
      "Sua solicitação foi reprovada.",

    card_reserved:
      "Um cartão já foi reservado para sua solicitação.",

    card_delivered:
      "O cartão foi liberado para realização da compra.",

    in_use:
      "Após realizar a compra, será necessário devolver o cartão e enviar os comprovantes.",

    awaiting_return:
      "Realize a devolução do cartão e envie os documentos obrigatórios.",

    returned:
      "A devolução foi registrada e aguarda conferência do Financeiro.",

    accountability_review:
      "Os documentos e valores estão sendo conferidos pelo Financeiro.",

    completed:
      "Processo concluído.",

    cancelled:
      "Esta solicitação foi cancelada.",
  };

  return (
    steps[status] ??
    "Aguarde a próxima atualização da solicitação."
  );
}

export default async function CardRequestDetailsPage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  // =========================================================
  // SOLICITAÇÃO
  // =========================================================

  const {
    data: request,
    error,
  } = await supabase
    .from("card_requests")
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

      payment_type,

      purchase_reason,
      purchase_reason_other,

      purpose,
      justification,

      status,

      expected_return_date,

      submitted_at,
      approved_at,
      delivered_at,
      returned_at,
      completed_at,

      created_at,
      updated_at
      `
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !request) {
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
    historyResult,
    profileResult,
  ] = await Promise.all([
    supabase
      .from("card_request_status_history")
      .select(
        `
        id,
        previous_status,
        new_status,
        notes,
        created_at
        `
      )
      .eq("card_request_id", id)
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from("profiles")
      .select(
        `
        full_name,
        email
        `
      )
      .eq("id", request.requester_id)
      .single(),
  ]);

  const history =
    historyResult.data ?? [];

  const requester =
    profileResult.data;

  return (
    <div className="mx-auto max-w-[1450px]">
      {/* =====================================================
          VOLTAR
      ====================================================== */}

      <Link
        href="/solicitacoes"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft size={16} />

        Voltar para Minhas Solicitações
      </Link>

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-[#AF1B1B]">
              {request.request_number}
            </span>

            <CardRequestStatus
              status={request.status}
            />
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            Solicitação de Cartão
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Acompanhe os dados e o andamento
            desta solicitação.
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
          RESUMO
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          icon={Hash}
          label="Pedido Sienge"
          value={
            request.sienge_request_number ??
            "-"
          }
        />

        <InfoCard
          icon={CalendarDays}
          label="Data da solicitação"
          value={formatDate(
            request.request_date
          )}
        />

        <InfoCard
          icon={Building2}
          label="Centro de custo / Obra"
          value={
            request.cost_center_or_site ??
            "-"
          }
        />

        <InfoCard
          icon={Clock3}
          label="Última atualização"
          value={formatDateTime(
            request.updated_at
          )}
        />
      </div>

      {/* =====================================================
          CONTEÚDO
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-[1fr_390px]">
        {/* ===================================================
            COLUNA ESQUERDA
        ==================================================== */}

        <div className="space-y-6">
          {/* DADOS DA SOLICITAÇÃO */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <CreditCard
                  size={20}
                  className="text-[#AF1B1B]"
                />

                <div>
                  <h2 className="font-semibold text-slate-950">
                    Dados da solicitação
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Informações registradas
                    no formulário.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-x-8 gap-y-6 p-6 md:grid-cols-2">
              <DataField
                icon={User}
                label="Solicitante"
                value={
                  requester?.full_name ??
                  "Não identificado"
                }
              />

              <DataField
                icon={Mail}
                label="E-mail"
                value={
                  request.requester_email_snapshot ??
                  requester?.email ??
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
                icon={CircleDollarSign}
                label="Valor previsto"
                value={formatCurrency(
                  request.estimated_amount
                )}
              />

              <DataField
                icon={CreditCard}
                label="Forma de pagamento"
                value="Cartão de crédito"
              />

              <div className="md:col-span-2">
                <DataField
                  icon={FileText}
                  label="Motivo da compra"
                  value={getReasonLabel(
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
                Finalidade da compra
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Onde será utilizado e qual
                necessidade será atendida.
              </p>
            </div>

            <div className="p-6">
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {request.purpose}
              </p>

              {request.justification && (
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Observações adicionais
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                    {request.justification}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* =================================================
              TIMELINE
          ================================================== */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Acompanhamento
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Histórico das movimentações
                desta solicitação.
              </p>
            </div>

            <div className="p-6">
              {history.length === 0 ? (
                <div className="py-10 text-center">
                  <Clock3
                    size={26}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm text-slate-400">
                    Nenhuma movimentação
                    registrada.
                  </p>
                </div>
              ) : (
                <div>
                  {history.map(
                    (entry, index) => {
                      const isLast =
                        index ===
                        history.length - 1;

                      return (
                        <div
                          key={entry.id}
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
                                {entry.notes}
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
            COLUNA DIREITA
        ==================================================== */}

        <aside className="space-y-6">
          {/* STATUS */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              Situação atual
            </p>

            <div className="mt-3">
              <CardRequestStatus
                status={request.status}
              />
            </div>

            <h2 className="mt-4 text-lg font-semibold text-slate-950">
              {getCardRequestStatusLabel(
                request.status
              )}
            </h2>

            <p className="mt-2 text-xs leading-5 text-slate-500">
              Esta situação será atualizada
              pelo setor responsável durante
              o andamento do processo.
            </p>
          </section>

          {/* PRÓXIMO PASSO */}

          <section className="rounded-2xl border border-[#AF1B1B]/10 bg-[#AF1B1B]/[0.03] p-6">
            <p className="text-xs font-semibold text-[#AF1B1B]">
              Próximo passo
            </p>

            <p className="mt-2 text-sm font-medium leading-6 text-slate-800">
              {getNextStep(
                request.status
              )}
            </p>
          </section>

          {/* IDENTIFICAÇÃO */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-950">
              Identificação
            </h2>

            <div className="mt-5 space-y-5">
              <SidebarField
                label="Solicitação"
                value={
                  request.request_number ??
                  "-"
                }
              />

              <SidebarField
                label="Pedido Sienge"
                value={
                  request.sienge_request_number ??
                  "-"
                }
              />

              <SidebarField
                label="Centro de custo / Obra"
                value={
                  request.cost_center_or_site ??
                  "-"
                }
              />

              <SidebarField
                label="Fornecedor"
                value={
                  request.suppliers_text ??
                  "-"
                }
              />

              <SidebarField
                label="Data de envio"
                value={formatDateTime(
                  request.submitted_at
                )}
              />

              {request.expected_return_date && (
                <SidebarField
                  label="Previsão de devolução"
                  value={formatDate(
                    request.expected_return_date
                  )}
                />
              )}
            </div>
          </section>
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
        <Icon size={16} />
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

// ============================================================
// SIDEBAR FIELD
// ============================================================

function SidebarField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-700">
        {value}
      </p>
    </div>
  );
}