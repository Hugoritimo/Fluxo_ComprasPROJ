import Link from "next/link";

import {
  ArrowLeft,
  Building2,
  CreditCard,
  Hash,
  RotateCcw,
  Store,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

import ReturnForm from "./return-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

export default async function CardReturnPage({
  params,
}: PageProps) {
  const { id } =
    await params;

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

      sienge_request_number,
      cost_center_or_site,
      suppliers_text,

      estimated_amount,
      approved_amount,

      status,
      expected_return_date
      `
    )
    .eq(
      "id",
      id
    )
    .eq(
      "requester_id",
      userId
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
    notFound();
  }

  // =========================================================
  // SOMENTE STATUS APTOS
  // =========================================================

  const allowedStatuses = [
    "card_delivered",
    "in_use",
    "awaiting_return",
  ];

  if (
    !allowedStatuses.includes(
      request.status
    )
  ) {
    redirect(
      `/solicitacoes/${request.id}`
    );
  }

  // =========================================================
  // PRESTAÇÃO ANTERIOR
  //
  // Isso permite reabrir o formulário caso
  // o Financeiro solicite correção.
  // =========================================================

  const {
    data: accountability,
  } = await supabase
    .from(
      "card_accountability"
    )
    .select(
      `
      actual_amount,
      purchase_date,
      supplier_name,
      return_notes,
      review_notes
      `
    )
    .eq(
      "card_request_id",
      request.id
    )
    .maybeSingle();

  return (
    <div className="mx-auto max-w-4xl">
      {/* VOLTAR */}

      <Link
        href={`/solicitacoes/${request.id}`}
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft size={16} />

        Voltar para solicitação
      </Link>

      {/* CABEÇALHO */}

      <div className="mb-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#AF1B1B]/10 text-[#AF1B1B]">
          <RotateCcw
            size={22}
          />
        </div>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950">
          Devolução e Prestação
          de Contas
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Registre os dados reais da
          compra e envie os documentos
          necessários para conferência
          do Financeiro.
        </p>
      </div>

      {/* CORREÇÃO SOLICITADA */}

      {request.status ===
        "awaiting_return" &&
        accountability
          ?.review_notes && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
              Correção solicitada
            </p>

            <p className="mt-2 text-sm font-medium leading-6 text-red-800">
              {
                accountability.review_notes
              }
            </p>
          </div>
        )}

      {/* RESUMO */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard
          icon={CreditCard}
          label="Solicitação"
          value={
            request.request_number ??
            "-"
          }
        />

        <InfoCard
          icon={Hash}
          label="Pedido Sienge"
          value={
            request.sienge_request_number ??
            "-"
          }
        />

        <InfoCard
          icon={Building2}
          label="Obra / Centro"
          value={
            request.cost_center_or_site ??
            "-"
          }
        />

        <InfoCard
          icon={Store}
          label="Fornecedor previsto"
          value={
            request.suppliers_text ??
            "-"
          }
        />
      </div>

      {/* VALORES */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Valor solicitado
          </p>

          <p className="mt-2 text-xl font-semibold text-slate-950">
            {formatCurrency(
              request.estimated_amount
            )}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Valor aprovado
          </p>

          <p className="mt-2 text-xl font-semibold text-slate-950">
            {request.approved_amount !==
            null
              ? formatCurrency(
                  request.approved_amount
                )
              : "Não informado"}
          </p>
        </div>
      </div>

      {/* FORM */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <ReturnForm
          requestId={
            request.id
          }
          userId={
            userId
          }
          defaultValues={{
            actualAmount:
              accountability
                ?.actual_amount !==
              undefined &&
              accountability
                ?.actual_amount !==
              null
                ? String(
                    accountability.actual_amount
                  )
                : "",

            purchaseDate:
              accountability
                ?.purchase_date ??
              "",

            supplierName:
              accountability
                ?.supplier_name ??
              request.suppliers_text ??
              "",

            returnNotes:
              accountability
                ?.return_notes ??
              "",
          }}
        />
      </section>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon:
    React.ElementType;

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