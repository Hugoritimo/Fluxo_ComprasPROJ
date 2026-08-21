import Link from "next/link";

import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Package,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
} from "lucide-react";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{
    requestKey: string;
  }>;
};

function formatDate(
  value:
    | string
    | null
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
    | number
    | string
    | null
) {
  if (
    value ===
      null ||
    value ===
      undefined
  ) {
    return "-";
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      maximumFractionDigits:
        4,
    }
  ).format(
    Number(value)
  );
}

export default async function SiengeRequestDetailsPage({
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

  // =========================================================
  // RESUMO
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
      .single();

  if (
    summaryError ||
    !summary
  ) {
    notFound();
  }

  // =========================================================
  // ITENS
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
        cost_center_or_site,
        request_date,
        quantity,
        unit,

        supply_status,
        supply_status_date,

        authorization_status,
        authorization_date,

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
      "created_at",
      {
        ascending:
          true,
      }
    );

  if (itemsError) {
    console.error(
      "Erro ao carregar itens Sienge:",
      itemsError
    );
  }

  const items =
    itemsData ??
    [];

  return (
    <div className="mx-auto max-w-[1500px]">
      <Link
        href="/financeiro/sienge?tab=pedidos"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft
          size={16}
        />

        Voltar para pedidos
      </Link>

      {/* CABEÇALHO */}

      <div className="mb-7">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-bold text-[#AF1B1B]">
            SC{" "}
            {
              summary.sc_number
            }
          </p>

          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
            {
              summary.tracking_status
            }
          </span>
        </div>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Acompanhamento da solicitação
        </h1>
      </div>

      {/* RESUMO */}

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
          label="Itens"
          value={
            String(
              summary.items_count
            )
          }
        />
      </div>

      {/* ITENS */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-semibold text-slate-950">
            Itens da solicitação
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Acompanhamento individual dos itens importados do Sienge.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {items.map(
            (
              item,
              index
            ) => (
              <div
                key={
                  item.id
                }
                className="p-6"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-[#AF1B1B]">
                      Item{" "}
                      {index + 1}
                    </p>

                    <h3 className="mt-1 text-sm font-semibold leading-6 text-slate-900">
                      {
                        item.insumo
                      }
                    </h3>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {item.supply_status && (
                        <Badge>
                          {
                            item.supply_status
                          }
                        </Badge>
                      )}

                      {item.delivery_status && (
                        <Badge>
                          Entrega:{" "}
                          {
                            item.delivery_status
                          }
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="min-w-[160px]">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Quantidade
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-800">
                      {formatQuantity(
                        item.quantity
                      )}{" "}
                      {item.unit ??
                        ""}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <Detail
                    icon={
                      ShoppingCart
                    }
                    label="Pedido"
                    value={
                      item.order_number ??
                      "-"
                    }
                  />

                  <Detail
                    icon={
                      Store
                    }
                    label="Fornecedor"
                    value={
                      item.supplier_name ??
                      "-"
                    }
                  />

                  <Detail
                    icon={
                      Truck
                    }
                    label="Previsão"
                    value={
                      formatDate(
                        item.delivery_or_pickup_forecast ??
                          item.initial_delivery_forecast
                      )
                    }
                  />

                  <Detail
                    icon={
                      CalendarDays
                    }
                    label="Entrega realizada"
                    value={
                      formatDate(
                        item.delivery_date
                      )
                    }
                  />
                </div>

                {(item.received_by ||
                  item.invoice_number ||
                  item.supplier_contact ||
                  item.supplier_phone) && (
                  <div className="mt-5 rounded-xl bg-slate-50 p-4">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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

                      <SimpleDetail
                        label="Contato"
                        value={
                          item.supplier_contact ??
                          "-"
                        }
                      />

                      <SimpleDetail
                        label="Telefone"
                        value={
                          item.supplier_phone ??
                          "-"
                        }
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          )}
        </div>
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
    typeof UserRound;

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

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon:
    typeof ShoppingCart;

  label: string;

  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon
        size={17}
        className="mt-0.5 shrink-0 text-slate-400"
      />

      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-xs font-semibold text-slate-700">
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

      <p className="mt-1 text-xs font-semibold text-slate-700">
        {value}
      </p>
    </div>
  );
}

function Badge({
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