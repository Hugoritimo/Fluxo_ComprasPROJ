const labels: Record<string, string> = {
  draft: "Rascunho",

  submitted:
    "Solicitação enviada",

  under_review:
    "Em análise",

  awaiting_information:
    "Aguardando informações",

  awaiting_approval:
    "Aguardando aprovação",

  approved:
    "Aprovado",

  rejected:
    "Reprovado",

  card_reserved:
    "Cartão reservado",

  card_delivered:
    "Cartão liberado",

  in_use:
    "Em utilização",

  awaiting_return:
    "Aguardando devolução",

  returned:
    "Devolvido",

  accountability_review:
    "Em conferência",

  completed:
    "Concluído",

  cancelled:
    "Cancelado",
};

const styles: Record<string, string> = {
  draft:
    "border-slate-200 bg-slate-100 text-slate-600",

  submitted:
    "border-blue-200 bg-blue-50 text-blue-700",

  under_review:
    "border-sky-200 bg-sky-50 text-sky-700",

  awaiting_information:
    "border-amber-200 bg-amber-50 text-amber-700",

  awaiting_approval:
    "border-orange-200 bg-orange-50 text-orange-700",

  approved:
    "border-emerald-200 bg-emerald-50 text-emerald-700",

  rejected:
    "border-red-200 bg-red-50 text-red-700",

  card_reserved:
    "border-indigo-200 bg-indigo-50 text-indigo-700",

  card_delivered:
    "border-cyan-200 bg-cyan-50 text-cyan-700",

  in_use:
    "border-violet-200 bg-violet-50 text-violet-700",

  awaiting_return:
    "border-orange-200 bg-orange-50 text-orange-700",

  returned:
    "border-sky-200 bg-sky-50 text-sky-700",

  accountability_review:
    "border-yellow-200 bg-yellow-50 text-yellow-700",

  completed:
    "border-emerald-200 bg-emerald-50 text-emerald-800",

  cancelled:
    "border-slate-200 bg-slate-100 text-slate-500",
};

export default function CardRequestStatus({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        styles[status] ??
          styles.draft,
      ].join(" ")}
    >
      {getCardRequestStatusLabel(
        status
      )}
    </span>
  );
}

export function getCardRequestStatusLabel(
  status: string
) {
  return labels[status] ?? status;
}