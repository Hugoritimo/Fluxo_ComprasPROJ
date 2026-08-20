import type {
  LucideIcon,
} from "lucide-react";

import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Package,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    requestKey: string;
  }>;
};

// ============================================================
// FORMATAÇÕES
// ============================================================

function formatDate(
  value:
    | string
    | null
    | undefined
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

function formatQuantity(
  value:
    | string
    | number
    | null
    | undefined
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "-";
  }

  const numeric =
    Number(value);

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return String(value);
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      maximumFractionDigits: 4,
    }
  ).format(
    numeric
  );
}

// ============================================================
// PÁGINA
// ============================================================

export default async function FinanceSiengeRequestDetailsPage({
  params,
}: PageProps) {
  const {
    requestKey,
  } =
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
    redirect(
      "/login"
    );
  }

  // =========================================================
  // PERMISSÃO FINANCEIRO / ADMIN
  // =========================================================

  const {
    data: roleRows,
    error: roleError,
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

  if (roleError) {
    console.error(
      "Erro ao consultar permissões:",
      roleError
    );

    redirect(
      "/dashboard"
    );
  }

  const roles =
    (
      roleRows ??
      []
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
  // RESUMO DA SOLICITAÇÃO
  // =========================================================

  const {
    data: summary,
    error: summaryError,
  } =
    await supabase
      .from(
        "v_sienge_request_summary"
      )
      .select("*")
      .eq(
        "request_key",
        requestKey
      )
      .maybeSingle();

  if (summaryError) {
    console.error(
      "Erro ao carregar resumo da SC:",
      summaryError
    );
  }

  if (!summary) {
    notFound();
  }

  // =========================================================
  // ITENS DA SC
  // =========================================================

  let itemsQuery =
    supabase
      .from(
        "sienge_purchase_items"
      )
      .select(
        `
        id,
        sc_number,
        insumo,

        requester_sienge_username,
        requester_profile_id,

        cost_center_or_site,
        request_date,

        quantity,
        unit,

        supply_status,
        supply_status_date,

        authorization_status,
        authorization_date,

        pending_quantity,
        balance_status,

        order_number,

        supplier_name,
        supplier_contact,
        supplier_phone,

        initial_delivery_forecast,
        delivery_or_pickup_forecast,

        delivery_status,
        delivery_date,

        received_by,
        invoice_number,

        last_seen_at
        `
      )
      .eq(
        "sc_number",
        summary.sc_number
      );

  // =========================================================
  // GARANTE QUE PEGAMOS EXATAMENTE O MESMO AGRUPAMENTO DA VIEW
  // =========================================================

  if (
    summary.requester_profile_id
  ) {
    itemsQuery =
      itemsQuery.eq(
        "requester_profile_id",
        summary.requester_profile_id
      );
  } else if (
    summary.requester_sienge_username
  ) {
    itemsQuery =
      itemsQuery.eq(
        "requester_sienge_username",
        summary.requester_sienge_username
      );
  }

  if (
    summary.cost_center_or_site
  ) {
    itemsQuery =
      itemsQuery.eq(
        "cost_center_or_site",
        summary.cost_center_or_site
      );
  } else {
    itemsQuery =
      itemsQuery.is(
        "cost_center_or_site",
        null
      );
  }

  const {
    data: itemsData,
    error: itemsError,
  } =
    await itemsQuery.order(
      "insumo",
      {
        ascending: true,
      }
    );

  if (itemsError) {
    console.error(
      "Erro ao carregar itens da SC:",
      itemsError
    );
  }

  const items =
    itemsData ??
    [];

  if (
    items.length === 0
  ) {
    notFound();
  }

  // =========================================================
  // TELA
  // =========================================================

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* VOLTAR */}

      <Link
        href="/financeiro/sienge?tab=pedidos"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft
          size={16}
        />

        Voltar para pedidos importados
      </Link>

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="mb-7">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-bold text-[#AF1B1B]">
            SC{" "}
            {
              summary.sc_number
            }
          </p>

          <StatusBadge
            status={
              summary.tracking_status
            }
          />
        </div>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Acompanhamento da solicitação
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Consulte os itens, pedidos, fornecedores e informações de entrega importadas do Sienge.
        </p>
      </div>

      {/* =====================================================
          RESUMO
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          icon={
            UserRound
          }
          label="Solicitante"
          value={
            summary.requester_sienge_username ??
            "-"
          }
        />

        <InfoCard
          icon={
            Building2
          }
          label="Centro de custo / Obra"
          value={
            summary.cost_center_or_site ??
            "-"
          }
        />

        <InfoCard
          icon={
            CalendarDays
          }
          label="Data da solicitação"
          value={
            formatDate(
              summary.request_date
            )
          }
        />

        <InfoCard
          icon={
            Package
          }
          label="Quantidade de itens"
          value={
            String(
              summary.items_count ??
              items.length
            )
          }
        />
      </div>

      {/* =====================================================
          INDICADORES DA SC
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MiniMetric
          label="Itens"
          value={
            summary.items_count ??
            items.length
          }
        />

        <MiniMetric
          label="Pedidos gerados"
          value={
            summary.orders_count ??
            0
          }
        />

        <MiniMetric
          label="Fornecedores"
          value={
            summary.suppliers_count ??
            0
          }
        />
      </div>

      {/* =====================================================
          ITENS
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-semibold text-slate-950">
            Itens da solicitação
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Cada item pode possuir pedido, fornecedor e previsão de entrega diferentes.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {items.map(
            (
              item,
              index
            ) => {
              const forecast =
                item.delivery_or_pickup_forecast ??
                item.initial_delivery_forecast;

              return (
                <article
                  key={
                    item.id
                  }
                  className="p-6"
                >
                  {/* CABEÇALHO DO ITEM */}

                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[#AF1B1B]">
                        Item{" "}
                        {index + 1}
                      </p>

                      <h3 className="mt-1 text-base font-semibold leading-6 text-slate-900">
                        {
                          item.insumo
                        }
                      </h3>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.supply_status && (
                          <ItemBadge>
                            {
                              item.supply_status
                            }
                          </ItemBadge>
                        )}

                        {item.authorization_status && (
                          <ItemBadge>
                            Autorização:{" "}
                            {
                              item.authorization_status
                            }
                          </ItemBadge>
                        )}

                        {item.delivery_status && (
                          <ItemBadge>
                            Entrega:{" "}
                            {
                              item.delivery_status
                            }
                          </ItemBadge>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 px-4 py-3 xl:min-w-[170px]">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Quantidade
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatQuantity(
                          item.quantity
                        )}{" "}
                        {item.unit ??
                          ""}
                      </p>
                    </div>
                  </div>

                  {/* DADOS PRINCIPAIS */}

                  <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                    <Detail
                      icon={
                        ShoppingCart
                      }
                      label="Pedido"
                      value={
                        item.order_number ??
                        "Ainda não gerado"
                      }
                    />

                    <Detail
                      icon={
                        Store
                      }
                      label="Fornecedor"
                      value={
                        item.supplier_name ??
                        "Ainda não definido"
                      }
                    />

                    <Detail
                      icon={
                        Truck
                      }
                      label="Previsão"
                      value={
                        formatDate(
                          forecast
                        )
                      }
                    />

                    <Detail
                      icon={
                        CheckCircle2
                      }
                      label="Entrega"
                      value={
                        item.delivery_date
                          ? formatDate(
                              item.delivery_date
                            )
                          : "Ainda não entregue"
                      }
                    />
                  </div>

                  {/* DATAS DE PROCESSO */}

                  {(item.supply_status_date ||
                    item.authorization_date) && (
                    <div className="mt-6 grid gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2">
                      <SimpleDetail
                        label="Data status suprimentos"
                        value={
                          formatDate(
                            item.supply_status_date
                          )
                        }
                      />

                      <SimpleDetail
                        label="Data autorização"
                        value={
                          formatDate(
                            item.authorization_date
                          )
                        }
                      />
                    </div>
                  )}

                  {/* ENTREGA / NF */}

                  {(item.received_by ||
                    item.invoice_number ||
                    item.delivery_status) && (
                    <div className="mt-4 grid gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-2 xl:grid-cols-3">
                      <SimpleDetail
                        label="Status da entrega"
                        value={
                          item.delivery_status ??
                          "-"
                        }
                      />

                      <SimpleDetail
                        label="Recebido por"
                        value={
                          item.received_by ??
                          "-"
                        }
                      />

                      <SimpleDetail
                        label="Nota Fiscal"
                        value={
                          item.invoice_number ??
                          "-"
                        }
                      />
                    </div>
                  )}

                  {/* FORNECEDOR */}

                  {(item.supplier_contact ||
                    item.supplier_phone) && (
                    <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-xs text-slate-500">
                      {item.supplier_contact && (
                        <span>
                          Contato:{" "}
                          <strong className="font-semibold text-slate-700">
                            {
                              item.supplier_contact
                            }
                          </strong>
                        </span>
                      )}

                      {item.supplier_phone && (
                        <span>
                          Telefone:{" "}
                          <strong className="font-semibold text-slate-700">
                            {
                              item.supplier_phone
                            }
                          </strong>
                        </span>
                      )}
                    </div>
                  )}
                </article>
              );
            }
          )}
        </div>
      </section>
    </div>
  );
}

// ============================================================
// COMPONENTES
// ============================================================

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
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

function MiniMetric({
  label,
  value,
}: {
  label: string;

  value:
    | number
    | string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-xl font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon
        size={17}
        className="mt-0.5 shrink-0 text-slate-400"
      />

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 break-words text-xs font-semibold text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

function SimpleDetail({
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

      <p className="mt-1 break-words text-xs font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function ItemBadge({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
      {children}
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={[
        "rounded-full border px-3 py-1 text-xs font-semibold",
        getStatusStyle(
          status
        ),
      ].join(" ")}
    >
      {status}
    </span>
  );
}

function getStatusStyle(
  status: string
) {
  switch (
    status
  ) {
    case "Entregue":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Disponível para retirada":
    case "Em processo de entrega":
      return "border-blue-200 bg-blue-50 text-blue-700";

    case "Compra realizada":
    case "Compra via cartão":
      return "border-violet-200 bg-violet-50 text-violet-700";

    case "Em aprovação":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "Em cotação":
      return "border-orange-200 bg-orange-50 text-orange-700";

    default:
      return "border-slate-200 bg-slate-50 text-slate-600";
  }
}