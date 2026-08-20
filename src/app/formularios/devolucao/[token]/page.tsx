import {
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import ExternalReturnForm from "./external-return-form";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function ExternalReturnPage({
  params,
}: PageProps) {
  const {
    token,
  } = await params;

  const supabase =
    await createClient();

  // ==========================================================
  // BUSCA A SOLICITAÇÃO PELO TOKEN EXTERNO
  // ==========================================================

  const {
    data,
    error,
  } =
    await supabase.rpc(
      "get_external_card_return_context",
      {
        p_token: token,
      }
    );

  // ==========================================================
  // LINK INVÁLIDO / INDISPONÍVEL
  // ==========================================================

  if (
    error ||
    !data ||
    data.length === 0
  ) {
    if (error) {
      console.error(
        "Erro ao consultar devolução externa:",
        error
      );
    }

    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2 bg-[#AF1B1B]" />

        <div className="p-8 text-center sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle
              size={27}
            />
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-950">
            Link indisponível
          </h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            Este link de devolução é inválido,
            foi desativado ou a solicitação ainda
            não possui um cartão liberado.
          </p>
        </div>
      </section>
    );
  }

  const context =
    data[0];

  const status =
    String(
      context.request_status
    );

  // ==========================================================
  // PRESTAÇÃO JÁ ENVIADA
  // ==========================================================

  if (
    status === "returned" ||
    status ===
      "accountability_review"
  ) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2 bg-[#AF1B1B]" />

        <div className="p-8 text-center sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2
              size={28}
            />
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-950">
            Prestação já enviada
          </h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            A devolução da solicitação{" "}
            <strong className="font-semibold text-slate-900">
              {context.request_number}
            </strong>{" "}
            já foi enviada e está aguardando
            conferência do Financeiro.
          </p>
        </div>
      </section>
    );
  }

  // ==========================================================
  // PROCESSO JÁ CONCLUÍDO
  // ==========================================================

  if (
    status === "completed"
  ) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-2 bg-[#AF1B1B]" />

        <div className="p-8 text-center sm:p-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2
              size={28}
            />
          </div>

          <h1 className="mt-5 text-xl font-bold text-slate-950">
            Processo concluído
          </h1>

          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">
            A prestação de contas desta
            solicitação já foi aprovada pelo
            Financeiro.
          </p>
        </div>
      </section>
    );
  }

  // ==========================================================
  // FORMULÁRIO DE DEVOLUÇÃO
  // ==========================================================

  return (
    <ExternalReturnForm
      token={
        token
      }
      requestId={
        String(
          context.request_id
        )
      }
      requestNumber={
        context.request_number
      }
      requesterName={
        context.requester_name
      }
      requesterEmail={
        context.requester_email
      }
      cardName={
        context.card_name ??
        "Cartão corporativo"
      }
      cardBankName={
        context.card_bank_name
      }
      cardLastFourDigits={
        context.card_last_four_digits ??
        "----"
      }
      approvedAmount={
        Number(
          context.approved_amount ??
            0
        )
      }
      additionsTotal={
        Number(
          context.additions_total ??
            0
        )
      }
      authorizedTotal={
        Number(
          context.authorized_total ??
            0
        )
      }
      expectedReturnDate={
        context.expected_return_date
      }
    />
  );
}