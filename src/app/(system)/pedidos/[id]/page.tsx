import Link from "next/link";
import { notFound } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileCheck2,
  Hash,
  PackageCheck,
} from "lucide-react";

import PurchaseStatus, {
  getPurchaseStatusLabel,
} from "@/components/purchases/purchase-status";

import { createClient } from "@/lib/supabase/server";

import WorkflowForm from "./workflow-form";

function formatCurrency(
  value: number | string | null
) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value ?? 0));
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
    new Date(`${value}T12:00:00`)
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
  ).format(new Date(value));
}

export default async function PurchaseRequestDetailsPage({
  params,
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: claimsData } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub ?? null;

  const { data: request, error } =
    await supabase
      .from("purchase_requests")
      .select(
        `
        id,
        request_number,
        requester_id,
        company_id,
        department_id,
        project_id,
        cost_center_id,
        supplier_id,

        title,
        justification,
        priority,

        estimated_total,
        approved_total,

        required_date,
        status,

        sienge_request_number,
        sienge_order_number,

        order_date,
        expected_delivery_date,

        internal_notes,

        submitted_at,
        approved_at,
        completed_at,

        created_at,
        updated_at,

        company:companies(name),
        department:departments(name),
        project:projects(name),
        cost_center:cost_centers(name, code),
        supplier:suppliers(name)
        `
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();

  if (error || !request) {
    notFound();
  }

  const [
    itemsResult,
    historyResult,
    rolesResult,
  ] = await Promise.all([
    supabase
      .from("purchase_request_items")
      .select(
        `
        id,
        description,
        quantity,
        unit,
        estimated_unit_price,
        estimated_total,
        approved_unit_price,
        approved_total,
        notes
        `
      )
      .eq("purchase_request_id", id)
      .order("created_at", {
        ascending: true,
      }),

    supabase
      .from(
        "purchase_request_status_history"
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
      .eq("purchase_request_id", id)
      .order("created_at", {
        ascending: true,
      }),

    userId
      ? supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
      : Promise.resolve({
          data: [],
          error: null,
        }),
  ]);

  const roles = (
    rolesResult.data ?? []
  ).map((item) => item.role);

  const canManage =
    roles.includes("buyer") ||
    roles.includes("admin") ||
    roles.includes("superadmin");

  let suppliers: {
    id: string;
    name: string;
  }[] = [];

  if (canManage) {
    const suppliersResult =
      await supabase
        .from("suppliers")
        .select("id, name")
        .eq("active", true)
        .order("name");

    suppliers =
      suppliersResult.data ?? [];
  }

  const items = itemsResult.data ?? [];
  const history =
    historyResult.data ?? [];

  return (
    <div className="mx-auto max-w-[1500px]">
      <Link
        href="/pedidos"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft size={16} />
        Voltar para pedidos
      </Link>

      <div className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-bold text-[#AF1B1B]">
              {request.request_number}
            </span>

            <PurchaseStatus
              status={request.status}
            />
          </div>

          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
            {request.title}
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            {request.justification}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Valor estimado
          </p>

          <p className="mt-1 text-2xl font-semibold text-slate-950">
            {formatCurrency(
              request.estimated_total
            )}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <InfoCard
              icon={CalendarDays}
              label="Data necessária"
              value={formatDate(
                request.required_date
              )}
            />

            <InfoCard
              icon={Hash}
              label="Solicitação Sienge"
              value={
                request.sienge_request_number ??
                "Ainda não informado"
              }
            />

            <InfoCard
              icon={PackageCheck}
              label="Pedido Sienge"
              value={
                request.sienge_order_number ??
                "Ainda não informado"
              }
            />

            <InfoCard
              icon={Clock3}
              label="Criado em"
              value={formatDateTime(
                request.created_at
              )}
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <ClipboardList
                  size={20}
                  className="text-slate-500"
                />

                <div>
                  <h2 className="font-semibold text-slate-950">
                    Itens do pedido
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {items.length} item
                    {items.length === 1
                      ? ""
                      : "s"}{" "}
                    registrado
                    {items.length === 1
                      ? ""
                      : "s"}
                  </p>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60 text-left">
                    <th className="px-6 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Item
                    </th>

                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Qtd.
                    </th>

                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Unidade
                    </th>

                    <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Unitário
                    </th>

                    <th className="px-6 py-3 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map(
                    (item, index) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4">
                          <div className="flex gap-3">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-semibold text-slate-500">
                              {index + 1}
                            </span>

                            <div>
                              <p className="text-sm font-medium text-slate-800">
                                {
                                  item.description
                                }
                              </p>

                              {item.notes && (
                                <p className="mt-1 text-xs text-slate-400">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {Number(
                            item.quantity
                          ).toLocaleString(
                            "pt-BR",
                            {
                              maximumFractionDigits: 3,
                            }
                          )}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {item.unit ?? "-"}
                        </td>

                        <td className="px-4 py-4 text-sm text-slate-600">
                          {formatCurrency(
                            item.estimated_unit_price
                          )}
                        </td>

                        <td className="px-6 py-4 text-right text-sm font-semibold text-slate-800">
                          {formatCurrency(
                            item.estimated_total
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <CircleDollarSign
                size={18}
                className="text-[#AF1B1B]"
              />

              <span className="text-xs text-slate-500">
                Total estimado
              </span>

              <span className="text-lg font-semibold text-slate-950">
                {formatCurrency(
                  request.estimated_total
                )}
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-5">
              <h2 className="font-semibold text-slate-950">
                Acompanhamento
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Histórico de movimentações do
                pedido.
              </p>
            </div>

            <div className="p-6">
              {history.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Nenhuma movimentação
                  registrada.
                </p>
              ) : (
                <div className="space-y-0">
                  {history.map(
                    (entry, index) => {
                      const last =
                        index ===
                        history.length - 1;

                      return (
                        <div
                          key={entry.id}
                          className="relative flex gap-4 pb-7 last:pb-0"
                        >
                          {!last && (
                            <div className="absolute left-[7px] top-5 h-full w-px bg-slate-200" />
                          )}

                          <div className="relative z-10 mt-1 h-[15px] w-[15px] shrink-0 rounded-full border-4 border-white bg-[#AF1B1B] ring-1 ring-slate-200" />

                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {getPurchaseStatusLabel(
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

        <aside className="space-y-6">
          {canManage && (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5">
                <p className="text-xs font-semibold text-[#AF1B1B]">
                  Área operacional
                </p>

                <h2 className="mt-1 font-semibold text-slate-950">
                  Atualizar andamento
                </h2>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Atualize as informações do
                  pedido conforme o andamento no
                  Sienge.
                </p>
              </div>

              <WorkflowForm
                request={{
                  id: request.id,
                  status: request.status,
                  sienge_request_number:
                    request.sienge_request_number,
                  sienge_order_number:
                    request.sienge_order_number,
                  supplier_id:
                    request.supplier_id,
                  order_date:
                    request.order_date,
                  expected_delivery_date:
                    request.expected_delivery_date,
                  internal_notes:
                    request.internal_notes,
                }}
                suppliers={suppliers}
              />
            </section>
          )}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <FileCheck2
                size={20}
                className="text-slate-500"
              />

              <h2 className="font-semibold text-slate-950">
                Dados do processo
              </h2>
            </div>

            <div className="mt-5 space-y-4">
              <DataRow
                label="Status"
                value={getPurchaseStatusLabel(
                  request.status
                )}
              />

              <DataRow
                label="Departamento"
                value={
                  request.department?.name ??
                  "Não informado"
                }
              />

              <DataRow
                label="Projeto"
                value={
                  request.project?.name ??
                  "Não informado"
                }
              />

              <DataRow
                label="Centro de custo"
                value={
                  request.cost_center
                    ? request.cost_center.code
                      ? `${request.cost_center.code} - ${request.cost_center.name}`
                      : request.cost_center
                          .name
                    : "Não informado"
                }
              />

              <DataRow
                label="Fornecedor"
                value={
                  request.supplier?.name ??
                  "Não definido"
                }
              />

              <DataRow
                label="Previsão entrega"
                value={formatDate(
                  request.expected_delivery_date
                )}
              />
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Icon
        size={18}
        className="text-slate-400"
      />

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-medium text-slate-800">
        {value}
      </p>
    </div>
  );
}

function DataRow({
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

      <p className="mt-1 text-sm font-medium text-slate-700">
        {value}
      </p>
    </div>
  );
}