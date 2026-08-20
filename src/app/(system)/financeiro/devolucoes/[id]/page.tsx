import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  Hash,
  Receipt,
  Store,
  User,
  UserRoundCheck,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import ReviewForm from "./review-form";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

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

function date(
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

export default async function FinanceReturnDetailsPage({
  params,
}: PageProps) {
  const {
    id,
  } = await params;

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

  const [
    summaryResult,
    purchasesResult,
    attachmentsResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "v_card_accountability_summary"
        )
        .select("*")
        .eq(
          "card_request_id",
          id
        )
        .single(),

      supabase
        .from(
          "card_accountability_purchases"
        )
        .select(
          `
          id,
          supplier_name,
          amount,
          purchase_date,
          notes
          `
        )
        .eq(
          "card_request_id",
          id
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
          "attachments"
        )
        .select(
          `
          id,
          category,
          file_name,
          storage_path,
          mime_type,
          file_size,
          created_at
          `
        )
        .eq(
          "card_request_id",
          id
        )
        .in(
          "category",
          [
            "invoice",
            "payment_receipt",
            "other",
            "accountability",
          ]
        )
        .order(
          "created_at",
          {
            ascending:
              true,
          }
        ),
    ]);

  if (
    summaryResult.error ||
    !summaryResult.data
  ) {
    console.error(
      "Erro ao carregar prestação:",
      summaryResult.error
    );

    notFound();
  }

  const summary =
    summaryResult.data;

  const purchases =
    purchasesResult.data ??
    [];

  const attachments =
    attachmentsResult.data ??
    [];

  // ==========================================================
  // URLS PRIVADAS
  // ==========================================================

  const documents =
    await Promise.all(
      attachments.map(
        async (
          attachment
        ) => {
          const {
            data,
          } =
            await supabase.storage
              .from(
                "card-documents"
              )
              .createSignedUrl(
                attachment.storage_path,
                3600
              );

          return {
            ...attachment,

            signedUrl:
              data?.signedUrl ??
              null,
          };
        }
      )
    );

  const canReview =
    summary.status ===
      "returned" ||
    summary.status ===
      "accountability_review";

  return (
    <div className="mx-auto max-w-[1500px]">
      <Link
        href="/financeiro/devolucoes"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft
          size={16}
        />

        Voltar para
        devoluções
      </Link>

      <div className="mb-7">
        <p className="text-sm font-bold text-[#AF1B1B]">
          {
            summary.request_number
          }
        </p>

        <h1 className="mt-2 text-2xl font-semibold text-slate-950 sm:text-3xl">
          Prestação de contas
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Confira os valores,
          fornecedores e documentos
          apresentados pelo
          colaborador.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_410px]">
        <div className="space-y-6">
          {/* DADOS */}

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Info
              icon={User}
              label="Solicitante"
              value={
                summary.requester_name ??
                "-"
              }
            />

            <Info
              icon={Hash}
              label="Sienge"
              value={
                summary.sienge_request_number ??
                "-"
              }
            />

            <Info
              icon={
                CreditCard
              }
              label="Cartão"
              value={
                `${summary.card_name ?? "Cartão"} •••• ${summary.card_last_four_digits ?? "----"}`
              }
            />

            <Info
              icon={
                UserRoundCheck
              }
              label="Recebido por"
              value={
                summary.received_by_name ??
                "-"
              }
            />
          </section>

          {/* VALORES */}

          <section className="grid gap-4 md:grid-cols-3">
            <Value
              label="Total autorizado"
              value={
                summary.authorized_total
              }
            />

            <Value
              label="Total utilizado"
              value={
                summary.used_total
              }
            />

            <Value
              label={
                Number(
                  summary.balance
                ) >= 0
                  ? "Saldo não utilizado"
                  : "Valor excedente"
              }
              value={Math.abs(
                Number(
                  summary.balance ??
                    0
                )
              )}
              alert={
                Number(
                  summary.balance
                ) < 0
              }
            />
          </section>

          {/* COMPRAS */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Compras realizadas
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Valores informados
                pelo colaborador.
              </p>
            </div>

            <div className="divide-y divide-slate-100">
              {purchases.map(
                (
                  purchase,
                  index
                ) => (
                  <div
                    key={
                      purchase.id
                    }
                    className="grid gap-4 p-6 md:grid-cols-[1fr_160px_140px]"
                  >
                    <div className="flex gap-3">
                      <Store
                        size={18}
                        className="mt-0.5 shrink-0 text-[#AF1B1B]"
                      />

                      <div>
                        <p className="text-xs text-slate-400">
                          Compra{" "}
                          {index + 1}
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {
                            purchase.supplier_name
                          }
                        </p>

                        {purchase.notes && (
                          <p className="mt-1 text-xs text-slate-500">
                            {
                              purchase.notes
                            }
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        Valor
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {currency(
                          purchase.amount
                        )}
                      </p>
                    </div>

                    <div>
                      <p className="text-[10px] font-semibold uppercase text-slate-400">
                        Data
                      </p>

                      <p className="mt-1 text-xs font-medium text-slate-700">
                        {date(
                          purchase.purchase_date
                        )}
                      </p>
                    </div>
                  </div>
                )
              )}
            </div>
          </section>

          {/* DOCUMENTOS */}

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Documentos
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Notas fiscais,
                cupons e comprovantes.
              </p>
            </div>

            <div className="p-6">
              {documents.length ===
              0 ? (
                <p className="py-6 text-center text-sm text-slate-400">
                  Nenhum documento
                  encontrado.
                </p>
              ) : (
                <div className="space-y-3">
                  {documents.map(
                    (document) => (
                      <div
                        key={
                          document.id
                        }
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {document.category ===
                          "payment_receipt" ? (
                            <Receipt
                              size={18}
                              className="shrink-0 text-[#AF1B1B]"
                            />
                          ) : (
                            <FileText
                              size={18}
                              className="shrink-0 text-[#AF1B1B]"
                            />
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {
                                document.file_name
                              }
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-400">
                              {documentLabel(
                                document.category
                              )}
                            </p>
                          </div>
                        </div>

                        {document.signedUrl && (
                          <div className="flex gap-2">
                            <a
                              href={
                                document.signedUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                            >
                              <ExternalLink
                                size={14}
                              />

                              Visualizar
                            </a>

                            <a
                              href={
                                document.signedUrl
                              }
                              download={
                                document.file_name
                              }
                              className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                            >
                              <Download
                                size={14}
                              />

                              Baixar
                            </a>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* PAINEL */}

        <aside>
          <div className="sticky top-24 space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-xs font-semibold text-[#AF1B1B]">
                Conferência Financeira
              </p>

              <h2 className="mt-1 text-lg font-semibold text-slate-950">
                Analisar prestação
              </h2>

              <p className="mt-2 text-xs leading-5 text-slate-500">
                A aprovação encerra
                definitivamente o
                processo.
              </p>

              <div className="mt-6">
                {canReview ? (
                  <ReviewForm
                    requestId={
                      id
                    }
                  />
                ) : summary.status ===
                  "awaiting_return" ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">
                      Correção solicitada
                    </p>

                    <p className="mt-1 text-xs leading-5 text-amber-800">
                      O formulário
                      externo está
                      disponível para
                      novo envio.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <CheckCircle2
                      size={18}
                      className="text-emerald-700"
                    />

                    <p className="mt-3 text-sm font-semibold text-emerald-900">
                      Processo concluído
                    </p>

                    <p className="mt-1 text-xs text-emerald-700">
                      Esta prestação
                      já foi aprovada.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Devolução registrada
              </p>

              <p className="mt-2 text-sm font-semibold text-slate-800">
                {dateTime(
                  summary.returned_at
                )}
              </p>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Info({
  icon: Icon,
  label,
  value,
}: {
  icon:
    typeof User;

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

function Value({
  label,
  value,
  alert = false,
}: {
  label: string;

  value:
    | number
    | string
    | null;

  alert?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border bg-white p-5 shadow-sm",
        alert
          ? "border-red-200"
          : "border-slate-200",
      ].join(" ")}
    >
      <CircleDollarSign
        size={18}
        className={
          alert
            ? "text-red-500"
            : "text-slate-400"
        }
      />

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={[
          "mt-1 text-lg font-bold",
          alert
            ? "text-red-700"
            : "text-slate-950",
        ].join(" ")}
      >
        {currency(
          value
        )}
      </p>
    </div>
  );
}

function documentLabel(
  category: string
) {
  switch (
    category
  ) {
    case "invoice":
      return "Nota Fiscal / Cupom";

    case "payment_receipt":
      return "Comprovante da transação";

    case "accountability":
      return "Prestação de contas";

    default:
      return "Outro documento";
  }
}