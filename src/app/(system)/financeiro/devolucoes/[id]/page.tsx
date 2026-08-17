import type {
  ElementType,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CircleDollarSign,
  ExternalLink,
  FileText,
  Hash,
  Mail,
  Receipt,
  Store,
  User,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import CardRequestStatus from "@/components/cards/card-request-status";

import {
  createClient,
} from "@/lib/supabase/server";

import ReviewForm from "./review-form";

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
      dateStyle: "short",
      timeStyle: "short",
    }
  ).format(
    new Date(value)
  );
}

function formatFileSize(
  bytes:
    | number
    | string
    | null
) {
  const size =
    Number(bytes ?? 0);

  if (!size) {
    return "-";
  }

  if (
    size < 1024 * 1024
  ) {
    return `${(
      size / 1024
    ).toFixed(1)} KB`;
  }

  return `${(
    size /
    1024 /
    1024
  ).toFixed(1)} MB`;
}

export default async function FinanceReturnDetailsPage({
  params,
}: PageProps) {
  const { id } =
    await params;

  const supabase =
    await createClient();

  // =========================================================
  // AUTENTICAÇÃO
  // =========================================================

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
  // PERMISSÃO
  // =========================================================

  const {
    data: roleRows,
  } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  const roles =
    (roleRows ?? []).map(
      (item) => item.role
    );

  const canAccess =
    roles.includes("finance") ||
    roles.includes("admin") ||
    roles.includes("superadmin");

  if (!canAccess) {
    redirect("/dashboard");
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

      request_date,
      sienge_request_number,
      cost_center_or_site,
      suppliers_text,

      estimated_amount,
      approved_amount,

      purpose,
      status,

      assigned_card_id,

      returned_at,
      completed_at,
      updated_at
      `
    )
    .eq("id", id)
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
  // COMPLEMENTARES
  // =========================================================

  const [
    profileResult,
    accountabilityResult,
    attachmentsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        `
        id,
        full_name,
        email
        `
      )
      .eq(
        "id",
        request.requester_id
      )
      .single(),

    supabase
      .from(
        "card_accountability"
      )
      .select(
        `
        card_request_id,
        actual_amount,
        purchase_date,
        supplier_name,
        return_notes,

        reviewed_by,
        reviewed_at,
        review_notes,
        approved,

        created_at,
        updated_at
        `
      )
      .eq(
        "card_request_id",
        request.id
      )
      .maybeSingle(),

    supabase
      .from("attachments")
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
        request.id
      )
      .is(
        "deleted_at",
        null
      )
      .in(
        "category",
        [
          "invoice",
          "payment_receipt",
        ]
      )
      .order(
        "created_at",
        {
          ascending: false,
        }
      ),
  ]);

  const requester =
    profileResult.data;

  const accountability =
    accountabilityResult.data;

  if (!accountability) {
    notFound();
  }

  // =========================================================
  // CARTÃO
  // =========================================================

  let card: {
    id: string;
    name: string;
    bank_name: string | null;
    last_four_digits: string;
  } | null = null;

  if (
    request.assigned_card_id
  ) {
    const {
      data: cardRow,
    } = await supabase
      .from("credit_cards")
      .select(
        `
        id,
        name,
        bank_name,
        last_four_digits
        `
      )
      .eq(
        "id",
        request.assigned_card_id
      )
      .maybeSingle();

    card =
      cardRow ?? null;
  }

  // =========================================================
  // URLs TEMPORÁRIAS DOS DOCUMENTOS
  // =========================================================

  const attachments =
    attachmentsResult.data ??
    [];

  const documents =
    await Promise.all(
      attachments.map(
        async (
          attachment
        ) => {
          const {
            data:
              signedData,
            error:
              signedError,
          } =
            await supabase.storage
              .from(
                "card-documents"
              )
              .createSignedUrl(
                attachment.storage_path,
                60 * 10
              );

          if (
            signedError
          ) {
            console.error(
              "Erro ao gerar link:",
              signedError
            );
          }

          return {
            ...attachment,

            signedUrl:
              signedData?.signedUrl ??
              null,
          };
        }
      )
    );

  const invoice =
    documents.find(
      (document) =>
        document.category ===
        "invoice"
    );

  const receipt =
    documents.find(
      (document) =>
        document.category ===
        "payment_receipt"
    );

  // =========================================================
  // COMPARAÇÃO DE VALORES
  // =========================================================

  const requestedAmount =
    Number(
      request.estimated_amount ??
      0
    );

  const approvedAmount =
    Number(
      request.approved_amount ??
      0
    );

  const actualAmount =
    Number(
      accountability.actual_amount ??
      0
    );

  const difference =
    approvedAmount -
    actualAmount;

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* VOLTAR */}

      <Link
        href="/financeiro/devolucoes"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft
          size={16}
        />

        Voltar para devoluções
      </Link>

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="mb-7">
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

        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
          Conferência da Prestação
        </h1>

        <p className="mt-2 text-sm text-slate-500">
          Confira valores e
          documentos antes de
          concluir a solicitação.
        </p>
      </div>

      {/* =====================================================
          VALORES
      ====================================================== */}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ValueCard
          label="Valor solicitado"
          value={formatCurrency(
            requestedAmount
          )}
        />

        <ValueCard
          label="Valor aprovado"
          value={formatCurrency(
            approvedAmount
          )}
        />

        <ValueCard
          label="Valor utilizado"
          value={formatCurrency(
            actualAmount
          )}
          highlight
        />

        <ValueCard
          label={
            difference >= 0
              ? "Saldo não utilizado"
              : "Valor excedente"
          }
          value={formatCurrency(
            Math.abs(
              difference
            )
          )}
          danger={
            difference < 0
          }
        />
      </div>

      {/* =====================================================
          GRID
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-[1fr_410px]">
        <div className="space-y-6">
          {/* DADOS */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Dados da prestação
              </h2>
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
                icon={Building2}
                label="Centro de custo / Obra"
                value={
                  request.cost_center_or_site ??
                  "-"
                }
              />

              <DataField
                icon={Store}
                label="Fornecedor"
                value={
                  accountability.supplier_name ??
                  "-"
                }
              />

              <DataField
                icon={CalendarDays}
                label="Data da compra"
                value={formatDate(
                  accountability.purchase_date
                )}
              />

              <DataField
                icon={
                  CircleDollarSign
                }
                label="Valor utilizado"
                value={formatCurrency(
                  accountability.actual_amount
                )}
              />

              <DataField
                icon={Receipt}
                label="Devolvido em"
                value={formatDateTime(
                  request.returned_at
                )}
              />

              {card && (
                <div className="md:col-span-2">
                  <DataField
                    icon={Receipt}
                    label="Cartão utilizado"
                    value={`${card.name} · ${card.bank_name ?? "Banco não informado"} · •••• ${card.last_four_digits}`}
                  />
                </div>
              )}
            </div>
          </section>

          {/* FINALIDADE */}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              Finalidade original
            </p>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {
                request.purpose
              }
            </p>

            {accountability.return_notes && (
              <>
                <div className="my-5 border-t border-slate-100" />

                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Observação da devolução
                </p>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-600">
                  {
                    accountability.return_notes
                  }
                </p>
              </>
            )}
          </section>

          {/* DOCUMENTOS */}

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Documentos
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Nota Fiscal e
                comprovante da
                transação.
              </p>
            </div>

            <div className="grid gap-4 p-6 md:grid-cols-2">
              <DocumentCard
                title="Nota Fiscal / Cupom Fiscal"
                document={
                  invoice
                }
              />

              <DocumentCard
                title="Comprovante da transação"
                document={
                  receipt
                }
              />
            </div>
          </section>

          {/* CONFERÊNCIA ANTERIOR */}

          {accountability.review_notes && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Última observação da conferência
              </p>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
                {
                  accountability.review_notes
                }
              </p>

              {accountability.reviewed_at && (
                <p className="mt-3 text-xs text-slate-400">
                  {formatDateTime(
                    accountability.reviewed_at
                  )}
                </p>
              )}
            </section>
          )}
        </div>

        {/* ===================================================
            PAINEL DE DECISÃO
        ==================================================== */}

        <aside>
          <section className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-xs font-semibold text-[#AF1B1B]">
              Financeiro
            </p>

            <h2 className="mt-1 text-lg font-semibold text-slate-950">
              Conferência
            </h2>

            <p className="mb-6 mt-2 text-xs leading-5 text-slate-500">
              Confira os valores e
              documentos antes de
              aprovar ou solicitar uma
              correção ao colaborador.
            </p>

            {difference < 0 && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-800">
                  Atenção
                </p>

                <p className="mt-1 text-xs leading-5 text-amber-700">
                  O valor utilizado
                  ultrapassou o valor
                  aprovado em{" "}
                  <strong>
                    {formatCurrency(
                      Math.abs(
                        difference
                      )
                    )}
                  </strong>
                  .
                </p>
              </div>
            )}

            <ReviewForm
              requestId={
                request.id
              }
              status={
                request.status
              }
              previousNotes={
                accountability.review_notes
              }
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

function ValueCard({
  label,
  value,
  highlight = false,
  danger = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p
        className={[
          "mt-2 text-xl font-semibold",
          danger
            ? "text-red-600"
            : highlight
              ? "text-[#AF1B1B]"
              : "text-slate-950",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

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

function DocumentCard({
  title,
  document,
}: {
  title: string;

  document:
    | {
        file_name: string;
        file_size:
          | number
          | string
          | null;
        mime_type: string;
        signedUrl:
          | string
          | null;
      }
    | undefined;
}) {
  if (!document) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <FileText
          size={20}
          className="text-red-400"
        />

        <p className="mt-3 text-sm font-semibold text-red-700">
          {title}
        </p>

        <p className="mt-1 text-xs text-red-500">
          Documento não encontrado.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm">
        <FileText
          size={19}
        />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-800">
        {title}
      </p>

      <p className="mt-1 truncate text-xs text-slate-500">
        {
          document.file_name
        }
      </p>

      <p className="mt-1 text-[11px] text-slate-400">
        {formatFileSize(
          document.file_size
        )}
      </p>

      {document.signedUrl ? (
        <a
          href={
            document.signedUrl
          }
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-[#AF1B1B] transition hover:underline"
        >
          Abrir documento

          <ExternalLink
            size={14}
          />
        </a>
      ) : (
        <p className="mt-4 text-xs font-medium text-red-500">
          Não foi possível gerar
          acesso ao documento.
        </p>
      )}
    </div>
  );
}