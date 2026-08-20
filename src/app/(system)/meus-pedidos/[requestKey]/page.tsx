import type {
  LucideIcon,
} from "lucide-react";

import type {
  ReactNode,
} from "react";

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

import {
  MotionCard,
  MotionList,
  MotionListItem,
  MotionPage,
  MotionReveal,
  MotionStatus,
} from "@/components/ui/motion";

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
  // MESMO AGRUPAMENTO DA VIEW
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
    <MotionPage className="mx-auto max-w-[1500px]">
      {/* =====================================================
          VOLTAR
      ====================================================== */}

      <MotionReveal>
        <Link
          href="/financeiro/sienge?tab=pedidos"
          className="btn btn-ghost btn-sm mb-6 gap-2 px-2 text-base-content/55 hover:text-primary"
        >
          <ArrowLeft
            size={16}
          />

          Voltar para pedidos importados
        </Link>
      </MotionReveal>

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <MotionReveal
        delay={0.04}
      >
        <div className="mb-7">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold text-primary">
              SC{" "}
              {
                summary.sc_number
              }
            </p>

            <MotionStatus>
              <StatusBadge
                status={
                  summary.tracking_status
                }
              />
            </MotionStatus>
          </div>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-base-content">
            Acompanhamento da solicitação
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-base-content/55">
            Consulte os itens, pedidos, fornecedores e informações de entrega importadas do Sienge.
          </p>
        </div>
      </MotionReveal>

      {/* =====================================================
          RESUMO
      ====================================================== */}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MotionCard
          delay={0.05}
        >
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
        </MotionCard>

        <MotionCard
          delay={0.1}
        >
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
        </MotionCard>

        <MotionCard
          delay={0.15}
        >
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
        </MotionCard>

        <MotionCard
          delay={0.2}
        >
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
        </MotionCard>
      </div>

      {/* =====================================================
          INDICADORES
      ====================================================== */}

      <MotionReveal
        delay={0.12}
      >
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          <MotionCard
            delay={0.05}
          >
            <MiniMetric
              icon={
                Package
              }
              label="Itens"
              value={
                summary.items_count ??
                items.length
              }
            />
          </MotionCard>

          <MotionCard
            delay={0.1}
          >
            <MiniMetric
              icon={
                ShoppingCart
              }
              label="Pedidos gerados"
              value={
                summary.orders_count ??
                0
              }
            />
          </MotionCard>

          <MotionCard
            delay={0.15}
          >
            <MiniMetric
              icon={
                Store
              }
              label="Fornecedores"
              value={
                summary.suppliers_count ??
                0
              }
            />
          </MotionCard>
        </div>
      </MotionReveal>

      {/* =====================================================
          ITENS
      ====================================================== */}

      <MotionReveal
        delay={0.2}
      >
        <section className="card overflow-hidden border border-base-300 bg-base-100">
          {/* CABEÇALHO */}

          <div className="border-b border-base-300 px-6 py-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold text-base-content">
                  Itens da solicitação
                </h2>

                <p className="mt-1 text-xs text-base-content/50">
                  Cada item pode possuir pedido, fornecedor e previsão de entrega diferentes.
                </p>
              </div>

              <span className="badge badge-ghost">
                {items.length}{" "}
                item
                {items.length ===
                1
                  ? ""
                  : "s"}
              </span>
            </div>
          </div>

          {/* LISTA */}

          <MotionList className="divide-y divide-base-300">
            {items.map(
              (
                item,
                index
              ) => {
                const forecast =
                  item.delivery_or_pickup_forecast ??
                  item.initial_delivery_forecast;

                return (
                  <MotionListItem
                    key={
                      item.id
                    }
                  >
                    <article className="p-6 transition-colors duration-200 hover:bg-base-200/40">
                      {/* =====================================
                          CABEÇALHO DO ITEM
                      ====================================== */}

                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="badge badge-primary badge-outline badge-sm">
                              Item{" "}
                              {index + 1}
                            </span>

                            {item.supply_status && (
                              <ItemStatusBadge
                                value={
                                  item.supply_status
                                }
                              />
                            )}

                            {item.authorization_status && (
                              <span className="badge badge-warning badge-outline badge-sm">
                                Autorização:{" "}
                                {
                                  item.authorization_status
                                }
                              </span>
                            )}

                            {item.delivery_status && (
                              <span className="badge badge-info badge-outline badge-sm">
                                Entrega:{" "}
                                {
                                  item.delivery_status
                                }
                              </span>
                            )}
                          </div>

                          <h3 className="mt-3 text-base font-semibold leading-6 text-base-content">
                            {
                              item.insumo
                            }
                          </h3>
                        </div>

                        {/* QUANTIDADE */}

                        <div className="rounded-box border border-base-300 bg-base-200/50 px-5 py-3 xl:min-w-[170px]">
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">
                            Quantidade
                          </p>

                          <p className="mt-1 text-sm font-semibold text-base-content">
                            {formatQuantity(
                              item.quantity
                            )}{" "}
                            {item.unit ??
                              ""}
                          </p>
                        </div>
                      </div>

                      {/* =====================================
                          DADOS PRINCIPAIS
                      ====================================== */}

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

                      {/* =====================================
                          DATAS DE PROCESSO
                      ====================================== */}

                      {(item.supply_status_date ||
                        item.authorization_date) && (
                        <MotionReveal
                          delay={0.08}
                        >
                          <div className="mt-6 grid gap-4 rounded-box border border-base-300 bg-base-200/35 p-4 sm:grid-cols-2">
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
                        </MotionReveal>
                      )}

                      {/* =====================================
                          ENTREGA / NF
                      ====================================== */}

                      {(item.received_by ||
                        item.invoice_number ||
                        item.delivery_status) && (
                        <MotionReveal
                          delay={0.1}
                        >
                          <div className="mt-4 grid gap-4 rounded-box border border-base-300 bg-base-200/35 p-4 sm:grid-cols-2 xl:grid-cols-3">
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
                        </MotionReveal>
                      )}

                      {/* =====================================
                          FORNECEDOR
                      ====================================== */}

                      {(item.supplier_contact ||
                        item.supplier_phone) && (
                        <MotionReveal
                          delay={0.12}
                        >
                          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-2 border-t border-base-300 pt-4 text-xs text-base-content/55">
                            {item.supplier_contact && (
                              <span>
                                Contato:{" "}
                                <strong className="font-semibold text-base-content">
                                  {
                                    item.supplier_contact
                                  }
                                </strong>
                              </span>
                            )}

                            {item.supplier_phone && (
                              <span>
                                Telefone:{" "}
                                <strong className="font-semibold text-base-content">
                                  {
                                    item.supplier_phone
                                  }
                                </strong>
                              </span>
                            )}
                          </div>
                        </MotionReveal>
                      )}
                    </article>
                  </MotionListItem>
                );
              }
            )}
          </MotionList>
        </section>
      </MotionReveal>
    </MotionPage>
  );
}

// ============================================================
// INFO CARD
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
    <div className="card h-full border border-base-300 bg-base-100">
      <div className="card-body p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-box bg-base-200 text-base-content/55">
          <Icon
            size={18}
          />
        </div>

        <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-base-content/40">
          {label}
        </p>

        <p className="break-words text-sm font-semibold text-base-content">
          {value}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// MINI MÉTRICA
// ============================================================

function MiniMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;

  label: string;

  value:
    | number
    | string;
}) {
  return (
    <div className="card h-full border border-base-300 bg-base-100">
      <div className="card-body flex-row items-center gap-4 p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-box bg-primary/10 text-primary">
          <Icon
            size={19}
          />
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">
            {label}
          </p>

          <p className="mt-1 text-xl font-semibold text-base-content">
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// DETALHE
// ============================================================

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
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-box bg-base-200 text-base-content/45">
        <Icon
          size={16}
        />
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">
          {label}
        </p>

        <p className="mt-1 break-words text-xs font-semibold text-base-content/75">
          {value}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// DETALHE SIMPLES
// ============================================================

function SimpleDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-base-content/40">
        {label}
      </p>

      <p className="mt-1 break-words text-xs font-semibold text-base-content/75">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// BADGE DE STATUS DO ITEM
// ============================================================

function ItemStatusBadge({
  value,
}: {
  value: string;
}) {
  const normalized =
    value
      .trim()
      .toUpperCase();

  let style =
    "badge-ghost";

  if (
    normalized ===
    "COMPRADO"
  ) {
    style =
      "badge-success";
  } else if (
    normalized.includes(
      "APROVA"
    )
  ) {
    style =
      "badge-warning";
  } else if (
    normalized.includes(
      "COTA"
    )
  ) {
    style =
      "badge-warning badge-outline";
  } else if (
    normalized ===
      "RETIRAR" ||
    normalized ===
      "ENTREGAR"
  ) {
    style =
      "badge-info";
  } else if (
    normalized ===
      "CARTAO" ||
    normalized ===
      "CARTÃO"
  ) {
    style =
      "badge-secondary";
  }

  return (
    <MotionStatus>
      <span
        className={[
          "badge badge-sm",
          style,
        ].join(" ")}
      >
        {value}
      </span>
    </MotionStatus>
  );
}

// ============================================================
// BADGE STATUS DA SC
// ============================================================

function StatusBadge({
  status,
}: {
  status: string;
}) {
  return (
    <span
      className={[
        "badge",
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
      return "badge-success";

    case "Disponível para retirada":
    case "Em processo de entrega":
      return "badge-info";

    case "Compra realizada":
    case "Compra via cartão":
      return "badge-secondary";

    case "Em aprovação":
      return "badge-warning";

    case "Em cotação":
      return "badge-warning badge-outline";

    default:
      return "badge-ghost";
  }
}