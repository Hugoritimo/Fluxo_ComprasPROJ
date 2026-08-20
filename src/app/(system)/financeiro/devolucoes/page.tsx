import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  RotateCcw,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

function currency(
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

function dateTime(
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

export default async function FinanceReturnsPage() {
  const supabase =
    await createClient();

  const {
    data: claims,
  } =
    await supabase.auth.getClaims();

  const userId =
    claims?.claims?.sub;

  if (!userId) {
    redirect(
      "/login"
    );
  }

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
    (row) =>
      row.role
  );

  if (
    !roles.includes(
      "finance"
    ) &&
    !roles.includes(
      "admin"
    ) &&
    !roles.includes(
      "superadmin"
    )
  ) {
    redirect(
      "/dashboard"
    );
  }

  const {
    data,
    error,
  } =
    await supabase
      .from(
        "v_card_accountability_summary"
      )
      .select("*")
      .in(
        "status",
        [
          "returned",
          "accountability_review",
          "awaiting_return",
          "completed",
        ]
      )
      .order(
        "returned_at",
        {
          ascending:
            false,
          nullsFirst:
            false,
        }
      );

  if (error) {
    console.error(
      "Erro ao carregar devoluções:",
      error
    );
  }

  const rows =
    data ?? [];

  return (
    <div className="mx-auto max-w-[1500px]">
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#AF1B1B]">
          Financeiro
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
          Devoluções
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Confira as prestações de
          contas dos cartões
          corporativos.
        </p>
      </div>

      <div className="space-y-3">
        {rows.length ===
        0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <ClipboardCheck
              size={32}
              className="mx-auto text-slate-300"
            />

            <p className="mt-4 text-sm font-semibold text-slate-700">
              Nenhuma devolução
              encontrada.
            </p>
          </div>
        ) : (
          rows.map(
            (row) => (
              <Link
                key={
                  row.card_request_id
                }
                href={`/financeiro/devolucoes/${row.card_request_id}`}
                className="group grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#AF1B1B]/30 hover:shadow-md lg:grid-cols-[1.2fr_1fr_1fr_1fr_auto]"
              >
                <div>
                  <p className="text-xs font-bold text-[#AF1B1B]">
                    {
                      row.request_number
                    }
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-950">
                    {
                      row.requester_name ??
                      "-"
                    }
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {
                      row.requester_email ??
                      "-"
                    }
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Autorizado
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {currency(
                      row.authorized_total
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Utilizado
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {currency(
                      row.used_total
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Devolução
                  </p>

                  <p className="mt-1 text-xs font-medium text-slate-700">
                    {dateTime(
                      row.returned_at
                    )}
                  </p>

                  <div className="mt-2">
                    <Status
                      status={
                        row.status
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <ArrowRight
                    size={18}
                    className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-[#AF1B1B]"
                  />
                </div>
              </Link>
            )
          )
        )}
      </div>
    </div>
  );
}

function Status({
  status,
}: {
  status: string;
}) {
  if (
    status ===
    "completed"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
        <CheckCircle2
          size={12}
        />

        Concluído
      </span>
    );
  }

  if (
    status ===
    "awaiting_return"
  ) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
        <RotateCcw
          size={12}
        />

        Correção solicitada
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">
      <Clock3
        size={12}
      />

      Aguardando conferência
    </span>
  );
}