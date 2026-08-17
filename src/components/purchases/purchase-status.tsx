type PurchaseStatusProps = {
  status: string;
};

const labels: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Solicitado",
  under_review: "Em análise",
  awaiting_information:
    "Aguardando informações",
  quotation: "Em cotação",
  awaiting_approval:
    "Aguardando aprovação",
  approved: "Aprovado",
  rejected: "Reprovado",
  sienge_registered:
    "Registrado no Sienge",
  order_issued: "Pedido emitido",
  awaiting_delivery:
    "Aguardando entrega",
  partially_received:
    "Recebido parcialmente",
  received: "Recebido",
  completed: "Concluído",
  cancelled: "Cancelado",
};

const styles: Record<string, string> = {
  draft:
    "bg-slate-100 text-slate-600 border-slate-200",

  submitted:
    "bg-blue-50 text-blue-700 border-blue-200",

  under_review:
    "bg-sky-50 text-sky-700 border-sky-200",

  awaiting_information:
    "bg-amber-50 text-amber-700 border-amber-200",

  quotation:
    "bg-violet-50 text-violet-700 border-violet-200",

  awaiting_approval:
    "bg-orange-50 text-orange-700 border-orange-200",

  approved:
    "bg-emerald-50 text-emerald-700 border-emerald-200",

  rejected:
    "bg-red-50 text-red-700 border-red-200",

  sienge_registered:
    "bg-indigo-50 text-indigo-700 border-indigo-200",

  order_issued:
    "bg-cyan-50 text-cyan-700 border-cyan-200",

  awaiting_delivery:
    "bg-yellow-50 text-yellow-700 border-yellow-200",

  partially_received:
    "bg-lime-50 text-lime-700 border-lime-200",

  received:
    "bg-green-50 text-green-700 border-green-200",

  completed:
    "bg-emerald-50 text-emerald-800 border-emerald-200",

  cancelled:
    "bg-slate-100 text-slate-500 border-slate-200",
};

export default function PurchaseStatus({
  status,
}: PurchaseStatusProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        styles[status] ??
          "bg-slate-100 text-slate-600 border-slate-200",
      ].join(" ")}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function getPurchaseStatusLabel(
  status: string
) {
  return labels[status] ?? status;
}