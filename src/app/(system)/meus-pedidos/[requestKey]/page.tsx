import type {
  ElementType,
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
  Check,
  CheckCircle2,
  Circle,
  Eye,
  FileText,
  Hash,
  Package,
  PackageCheck,
  PencilLine,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import DeliveryConfirmationForm from "./delivery-confirmation-form";

import ReceiptReleaseControl from "./receipt-release-control";

import SupplyItemForm from "./supply-item-form";

// ============================================================
// TIPOS
// ============================================================

type PageProps = {
  params: Promise<{
    requestKey: string;
  }>;
};

type DeliveryConfirmationRow = {
  item_id: string;

  requester_profile_id:
    | string
    | null;

  delivery_status:
    | string
    | null;

  delivery_date:
    | string
    | null;

  received_by:
    | string
    | null;

  invoice_number:
    | string
    | null;

  updated_at:
    | string
    | null;
};

type SupplyUpdateRow = {
  item_id: string;

  supply_status:
    | string
    | null;

  supply_status_date:
    | string
    | null;

  order_number:
    | string
    | null;

  supplier_name:
    | string
    | null;

  supplier_contact:
    | string
    | null;

  supplier_phone:
    | string
    | null;

  delivery_or_pickup_forecast:
    | string
    | null;

  authorization_status:
    | string
    | null;

  updated_at:
    | string
    | null;
};

type ReceiptReleaseRow = {
  item_id: string;

  is_released: boolean;

  released_at:
    | string
    | null;

  released_by:
    | string
    | null;

  revoked_at:
    | string
    | null;

  revoked_by:
    | string
    | null;
};

// ============================================================
// ETAPAS ELEGÍVEIS
// ============================================================

const RECEIPT_ELIGIBLE_STATUSES = [
  "Compra realizada",
  "Compra via cartão",
  "Disponível para retirada",
  "Em processo de entrega",
  "Entregue",
];

// ============================================================
// FORMATADORES
// ============================================================

function formatDate(
  value:
    | string
    | null
    | undefined
) {
  if (
    !value
  ) {
    return "-";
  }

  const iso =
    value.match(
      /^\d{4}-\d{2}-\d{2}/
    )?.[0];

  if (
    !iso
  ) {
    return "-";
  }

  const [
    year,
    month,
    day,
  ] =
    iso.split(
      "-"
    );

  return `${day}/${month}/${year}`;
}

function formatQuantity(
  value:
    | number
    | string
    | null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return "-";
  }

  const numeric =
    Number(
      value
    );

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return String(
      value
    );
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      maximumFractionDigits:
        4,
    }
  ).format(
    numeric
  );
}

// ============================================================
// PAGE
// ============================================================

export default async function MyOrderDetailsPage({
  params,
}: PageProps) {
  const {
    requestKey,
  } =
    await params;

  const supabase =
    await createClient();

  // =========================================================
  // AUTH
  // =========================================================

  const {
    data:
      claimsData,

    error:
      claimsError,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData
      ?.claims
      ?.sub;

  if (
    claimsError ||
    !userId
  ) {
    redirect(
      "/login"
    );
  }

  // =========================================================
  // ROLES
  // =========================================================

  const {
    data:
      rolesData,
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

  const roles =
    (
      rolesData ??
      []
    ).map(
      (
        row
      ) =>
        String(
          row.role
        )
    );
const canManageSupply =
  roles.includes(
    "supply"
  ) ||
  roles.includes(
    "finance"
  ) ||
  roles.includes(
    "admin"
  ) ||
  roles.includes(
    "superadmin"
  );
  const canReleaseReceipt =
    roles.includes(
      "finance"
    ) ||
    roles.includes(
      "admin"
    ) ||
    roles.includes(
      "superadmin"
    );

  const canViewAll =
    canManageSupply ||
    canReleaseReceipt;

  // =========================================================
  // RESUMO
  // =========================================================

  let summaryQuery =
    supabase
      .from(
        "v_sienge_request_summary"
      )
      .select(
        "*"
      )
      .eq(
        "request_key",
        requestKey
      );

  if (
    !canViewAll
  ) {
    summaryQuery =
      summaryQuery.eq(
        "requester_profile_id",
        userId
      );
  }

  const {
    data:
      summary,
  } =
    await summaryQuery
      .maybeSingle();

  if (
    !summary
  ) {
    notFound();
  }

  const isOwnRequest =
    summary.requester_profile_id ===
    userId;

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
        requester_profile_id,
        requester_sienge_username,
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

  if (
    summary.requester_profile_id
  ) {
    itemsQuery =
      itemsQuery.eq(
        "requester_profile_id",
        summary.requester_profile_id
      );
  } else {
    itemsQuery =
      itemsQuery.is(
        "requester_profile_id",
        null
      );

    if (
      summary.requester_sienge_username
    ) {
      itemsQuery =
        itemsQuery.eq(
          "requester_sienge_username",
          summary.requester_sienge_username
        );
    }
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
    data:
      itemsData,
  } =
    await itemsQuery.order(
      "insumo",
      {
        ascending:
          true,
      }
    );

  const items =
    itemsData ??
    [];

  if (
    items.length ===
    0
  ) {
    notFound();
  }

  const itemIds =
    items.map(
      (
        item
      ) =>
        String(
          item.id
        )
    );

  // =========================================================
  // DADOS LOCAIS
  // =========================================================

  const [
    confirmationsResult,
    supplyUpdatesResult,
    releasesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "sienge_requester_delivery_confirmations"
        )
        .select(
          `
          item_id,
          requester_profile_id,
          delivery_status,
          delivery_date,
          received_by,
          invoice_number,
          updated_at
          `
        )
        .in(
          "item_id",
          itemIds
        ),

      supabase
        .from(
          "sienge_supply_item_updates"
        )
        .select(
          `
          item_id,
          supply_status,
          supply_status_date,
          order_number,
          supplier_name,
          supplier_contact,
          supplier_phone,
          delivery_or_pickup_forecast,
          authorization_status,
          updated_at
          `
        )
        .in(
          "item_id",
          itemIds
        ),

      supabase
        .from(
          "sienge_receipt_releases"
        )
        .select(
          `
          item_id,
          is_released,
          released_at,
          released_by,
          revoked_at,
          revoked_by
          `
        )
        .in(
          "item_id",
          itemIds
        ),
    ]);

  const confirmations =
    (
      confirmationsResult.data ??
      []
    ) as DeliveryConfirmationRow[];

  const supplyUpdates =
    (
      supplyUpdatesResult.data ??
      []
    ) as SupplyUpdateRow[];

  const releases =
    (
      releasesResult.data ??
      []
    ) as ReceiptReleaseRow[];

  const confirmationByItem =
    new Map(
      confirmations.map(
        (
          row
        ) => [
          String(
            row.item_id
          ),
          row,
        ]
      )
    );

  const supplyUpdateByItem =
    new Map(
      supplyUpdates.map(
        (
          row
        ) => [
          String(
            row.item_id
          ),
          row,
        ]
      )
    );

  const releaseByItem =
    new Map(
      releases.map(
        (
          row
        ) => [
          String(
            row.item_id
          ),
          row,
        ]
      )
    );

  // =========================================================
  // NOMES DE QUEM LIBEROU
  // =========================================================

  const actorIds =
    Array.from(
      new Set(
        releases
          .map(
            (
              release
            ) =>
              release.released_by
          )
          .filter(
            Boolean
          ) as string[]
      )
    );

  const actorNameById =
    new Map<
      string,
      string
    >();

  if (
    actorIds.length >
    0
  ) {
    const {
      data:
        actors,
    } =
      await supabase
        .from(
          "profiles"
        )
        .select(
          "id, full_name"
        )
        .in(
          "id",
          actorIds
        );

    for (
      const actor
      of actors ??
      []
    ) {
      actorNameById.set(
        String(
          actor.id
        ),
        actor.full_name ??
          "Usuário"
      );
    }
  }

  const trackingStatus =
    summary.tracking_status ??
    "Solicitação recebida";

  const requesterName =
    summary.requester_sienge_username ??
    "Não informado";

  return (
    <div className="mx-auto max-w-[1500px]">
      <Link
        href="/meus-pedidos"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft
          size={
            16
          }
        />

        Voltar
      </Link>

      <header className="mb-7">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-bold text-[#AF1B1B]">
            SC{" "}
            {
              summary.sc_number
            }
          </p>

          <StatusBadge
            status={
              trackingStatus
            }
          />

          {canViewAll &&
            !isOwnRequest && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-500">
              <Eye
                size={
                  13
                }
              />

              Visualização operacional
            </span>
          )}
        </div>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Acompanhamento da solicitação
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Acompanhe o processo de compra, as atualizações de
          Suprimentos e o recebimento dos itens.
        </p>
      </header>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <InfoCard
          icon={
            FileText
          }
          label="Solicitação"
          value={`SC ${
            summary.sc_number ??
            "-"
          }`}
        />

        <InfoCard
          icon={
            UserRound
          }
          label="Solicitante"
          value={
            requesterName
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
              summary.items_count ??
              items.length
            )
          }
        />
      </div>

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">
              Andamento da compra
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Status geral calculado a partir dos dados do Sienge.
            </p>
          </div>

          <StatusBadge
            status={
              trackingStatus
            }
          />
        </div>

        <OrderTimeline
          status={
            trackingStatus
          }
        />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-semibold text-slate-950">
            Itens da solicitação
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Cada item possui acompanhamento próprio de Suprimentos,
            liberação financeira e confirmação de recebimento.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {items.map(
            (
              item,
              index
            ) => {
              const itemId =
                String(
                  item.id
                );

              const confirmation =
                confirmationByItem.get(
                  itemId
                );

              const supplyUpdate =
                supplyUpdateByItem.get(
                  itemId
                );

              const release =
                releaseByItem.get(
                  itemId
                );

              // ===============================================
              // VALORES EFETIVOS
              // ===============================================

              const effectiveSupplyStatus =
                supplyUpdate
                  ? supplyUpdate.supply_status
                  : item.supply_status ??
                    trackingStatus;

              const effectiveSupplyStatusDate =
                supplyUpdate
                  ? supplyUpdate.supply_status_date
                  : item.supply_status_date;

              const effectiveOrderNumber =
                supplyUpdate
                  ? supplyUpdate.order_number
                  : item.order_number;

              const effectiveSupplierName =
                supplyUpdate
                  ? supplyUpdate.supplier_name
                  : item.supplier_name;

              const effectiveSupplierContact =
                supplyUpdate
                  ? supplyUpdate.supplier_contact
                  : item.supplier_contact;

              const effectiveSupplierPhone =
                supplyUpdate
                  ? supplyUpdate.supplier_phone
                  : item.supplier_phone;

              const effectiveForecast =
                supplyUpdate
                  ? supplyUpdate.delivery_or_pickup_forecast
                  : item.delivery_or_pickup_forecast;

              const effectiveAuthorization =
                supplyUpdate
                  ? supplyUpdate.authorization_status
                  : item.authorization_status;

              const eligibleForRelease =
                Boolean(
                  effectiveOrderNumber
                ) ||
                RECEIPT_ELIGIBLE_STATUSES.includes(
                  effectiveSupplyStatus ??
                    ""
                ) ||
                RECEIPT_ELIGIBLE_STATUSES.includes(
                  trackingStatus
                );

              const isReleased =
                release
                  ?.is_released ===
                true;

              const canUpdateDelivery =
                isOwnRequest &&
                isReleased;

              const releasedByName =
                release
                  ?.released_by
                  ? actorNameById.get(
                      release.released_by
                    ) ??
                    null
                  : null;

              const itemRequesterName =
                item.requester_sienge_username ??
                requesterName;

              return (
                <article
                  key={
                    itemId
                  }
                  className="p-5 sm:p-6"
                >
                  <div className="mb-6 flex flex-col gap-4 border-b border-slate-100 pb-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-[#AF1B1B]/8 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#AF1B1B]">
                          Item{" "}
                          {
                            index +
                            1
                          }
                        </span>

                        {effectiveSupplyStatus && (
                          <ItemBadge>
                            {
                              effectiveSupplyStatus
                            }
                          </ItemBadge>
                        )}

                        {effectiveOrderNumber && (
                          <ItemBadge>
                            Pedido{" "}
                            {
                              effectiveOrderNumber
                            }
                          </ItemBadge>
                        )}

                        {supplyUpdate && (
                          <ItemBadge>
                            Atualizado no Projeta
                          </ItemBadge>
                        )}

                        {confirmation
                          ?.delivery_status && (
                          <ItemBadge>
                            Recebimento:{" "}
                            {
                              confirmation.delivery_status
                            }
                          </ItemBadge>
                        )}
                      </div>

                      <h3 className="mt-3 text-lg font-semibold leading-7 text-slate-950">
                        {item.insumo ??
                          "Item sem descrição"}
                      </h3>

                      <p className="mt-1 text-xs text-slate-400">
                        SC{" "}
                        {
                          item.sc_number ??
                          summary.sc_number ??
                          "-"
                        }
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 xl:min-w-[170px]">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                        Quantidade
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {formatQuantity(
                          item.quantity
                        )}{" "}
                        {
                          item.unit ??
                          ""
                        }
                      </p>
                    </div>
                  </div>

                  {/* DADOS DA SOLICITAÇÃO */}

                  <section className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/40">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Dados da solicitação
                      </h4>

                      <p className="mt-1 text-[11px] text-slate-500">
                        Dados de origem importados do Sienge.
                      </p>
                    </div>

                    <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                      <DataField
                        icon={
                          FileText
                        }
                        label="Insumo"
                        value={
                          item.insumo ??
                          "-"
                        }
                      />

                      <DataField
                        icon={
                          Building2
                        }
                        label="Obra / Centro de Custo"
                        value={
                          item.cost_center_or_site ??
                          "-"
                        }
                      />

                      <DataField
                        icon={
                          CalendarDays
                        }
                        label="Data da Solicitação"
                        value={
                          formatDate(
                            item.request_date
                          )
                        }
                      />

                      <DataField
                        icon={
                          Truck
                        }
                        label="Previsão Inicial"
                        value={
                          formatDate(
                            item.initial_delivery_forecast
                          )
                        }
                      />

                      <DataField
                        icon={
                          UserRound
                        }
                        label="Solicitante"
                        value={
                          itemRequesterName
                        }
                      />

                      <DataField
                        icon={
                          Hash
                        }
                        label="SC"
                        value={
                          item.sc_number ??
                          "-"
                        }
                      />

                      <DataField
                        icon={
                          Package
                        }
                        label="Quantidade"
                        value={
                          formatQuantity(
                            item.quantity
                          )
                        }
                      />

                      <DataField
                        icon={
                          PackageCheck
                        }
                        label="Unidade"
                        value={
                          item.unit ??
                          "-"
                        }
                      />
                    </div>
                  </section>

                  {/* SUPRIMENTOS */}

                  <section className="mb-5 rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            Acompanhamento de Suprimentos
                          </h4>

                          <p className="mt-1 text-[11px] text-slate-500">
                            Informações operacionais da compra deste item.
                          </p>
                        </div>

                        {canManageSupply ? (
                          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[#AF1B1B]/20 bg-[#AF1B1B]/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#AF1B1B]">
                            <PencilLine
                              size={
                                11
                              }
                            />

                            Editável
                          </span>
                        ) : (
                          <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
                            Somente leitura
                          </span>
                        )}
                      </div>
                    </div>

                    {canManageSupply ? (
                      <SupplyItemForm
                        itemId={
                          itemId
                        }
                        requestKey={
                          requestKey
                        }
                        supplyStatus={
                          effectiveSupplyStatus
                        }
                        supplyStatusDate={
                          effectiveSupplyStatusDate
                        }
                        orderNumber={
                          effectiveOrderNumber
                        }
                        supplierName={
                          effectiveSupplierName
                        }
                        supplierContact={
                          effectiveSupplierContact
                        }
                        supplierPhone={
                          effectiveSupplierPhone
                        }
                        deliveryOrPickupForecast={
                          effectiveForecast
                        }
                        authorizationStatus={
                          effectiveAuthorization
                        }
                      />
                    ) : (
                      <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                        <DataField
                          icon={
                            CheckCircle2
                          }
                          label="Status Suprimentos"
                          value={
                            effectiveSupplyStatus ??
                            "-"
                          }
                        />

                        <DataField
                          icon={
                            CalendarDays
                          }
                          label="Data do Status"
                          value={
                            formatDate(
                              effectiveSupplyStatusDate
                            )
                          }
                        />

                        <DataField
                          icon={
                            ShoppingCart
                          }
                          label="Pedido"
                          value={
                            effectiveOrderNumber ??
                            "Ainda não gerado"
                          }
                        />

                        <DataField
                          icon={
                            Store
                          }
                          label="Fornecedor"
                          value={
                            effectiveSupplierName ??
                            "Ainda não definido"
                          }
                        />

                        <DataField
                          icon={
                            UserRound
                          }
                          label="Contato"
                          value={
                            effectiveSupplierContact ??
                            "-"
                          }
                        />

                        <DataField
                          icon={
                            FileText
                          }
                          label="Telefone"
                          value={
                            effectiveSupplierPhone ??
                            "-"
                          }
                        />

                        <DataField
                          icon={
                            Truck
                          }
                          label="Previsão Entrega / Retirada"
                          value={
                            formatDate(
                              effectiveForecast
                            )
                          }
                        />

                        <DataField
                          icon={
                            CheckCircle2
                          }
                          label="Autorização"
                          value={
                            effectiveAuthorization ??
                            "-"
                          }
                        />
                      </div>
                    )}
                  </section>

                  {/* RECEBIMENTO */}

                  <section className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            Recebimento
                          </h4>

                          <p className="mt-1 text-[11px] leading-5 text-slate-500">
                            O Financeiro libera e o solicitante confirma o recebimento físico.
                          </p>
                        </div>

                        {isReleased ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[9px] font-bold uppercase text-emerald-700">
                            Liberado
                          </span>
                        ) : (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase text-slate-500">
                            Bloqueado
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      <ReceiptReleaseControl
                        itemId={
                          itemId
                        }
                        requestKey={
                          requestKey
                        }
                        eligible={
                          eligibleForRelease
                        }
                        released={
                          isReleased
                        }
                        releasedAt={
                          release
                            ?.released_at ??
                          null
                        }
                        releasedByName={
                          releasedByName
                        }
                        canManage={
                          canReleaseReceipt
                        }
                        hasConfirmation={
                          Boolean(
                            confirmation
                              ?.delivery_status
                          )
                        }
                      />

                      {isOwnRequest &&
                        isReleased && (
                        <DeliveryConfirmationForm
                          itemId={
                            itemId
                          }
                          requestKey={
                            requestKey
                          }
                          currentStatus={
                            confirmation
                              ?.delivery_status ??
                            null
                          }
                          currentDate={
                            confirmation
                              ?.delivery_date ??
                            null
                          }
                          currentReceivedBy={
                            confirmation
                              ?.received_by ??
                            null
                          }
                          currentInvoiceNumber={
                            confirmation
                              ?.invoice_number ??
                            null
                          }
                          disabled={
                            !canUpdateDelivery
                          }
                        />
                      )}

                      {!isOwnRequest &&
                        canViewAll && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="mb-4 flex items-center gap-2">
                            <Eye
                              size={
                                15
                              }
                              className="text-slate-400"
                            />

                            <p className="text-xs font-semibold text-slate-700">
                              Confirmação do solicitante
                            </p>
                          </div>

                          {confirmation ? (
                            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                              <ReadOnlyReceiptField
                                label="Status"
                                value={
                                  confirmation.delivery_status ??
                                  "-"
                                }
                              />

                              <ReadOnlyReceiptField
                                label="Data"
                                value={
                                  formatDate(
                                    confirmation.delivery_date
                                  )
                                }
                              />

                              <ReadOnlyReceiptField
                                label="Recebido por"
                                value={
                                  confirmation.received_by ??
                                  "-"
                                }
                              />

                              <ReadOnlyReceiptField
                                label="Nota Fiscal"
                                value={
                                  confirmation.invoice_number ??
                                  "-"
                                }
                              />
                            </div>
                          ) : (
                            <p className="text-[10px] leading-5 text-slate-500">
                              O solicitante ainda não registrou o recebimento deste item.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </section>
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
// RECEBIMENTO SOMENTE LEITURA
// ============================================================

function ReadOnlyReceiptField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
        {
          label
        }
      </p>

      <p className="mt-1 text-xs font-semibold text-slate-700">
        {
          value
        }
      </p>
    </div>
  );
}

// ============================================================
// TIMELINE
// ============================================================

function OrderTimeline({
  status,
}: {
  status: string;
}) {
  const currentStep =
    getCurrentStep(
      status
    );

  const steps = [
    "Solicitação recebida",
    "Em cotação",
    "Em aprovação",
    "Compra realizada",
    "Entrega / Retirada",
    "Entregue",
  ];

  return (
    <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
      {steps.map(
        (
          step,
          index
        ) => {
          const completed =
            index <
            currentStep;

          const active =
            index ===
            currentStep;

          return (
            <div
              key={
                step
              }
              className={[
                "rounded-xl border p-4",
                completed
                  ? "border-emerald-200 bg-emerald-50"
                  : active
                    ? "border-[#AF1B1B]/30 bg-[#AF1B1B]/5"
                    : "border-slate-200 bg-slate-50",
              ].join(
                " "
              )}
            >
              <div
                className={[
                  "mb-3 flex h-7 w-7 items-center justify-center rounded-full",
                  completed
                    ? "bg-emerald-600 text-white"
                    : active
                      ? "bg-[#AF1B1B] text-white"
                      : "bg-slate-200 text-slate-400",
                ].join(
                  " "
                )}
              >
                {completed ? (
                  <Check
                    size={
                      15
                    }
                  />
                ) : (
                  <Circle
                    size={
                      11
                    }
                    fill={
                      active
                        ? "currentColor"
                        : "none"
                    }
                  />
                )}
              </div>

              <p className="text-xs font-semibold text-slate-700">
                {
                  step
                }
              </p>
            </div>
          );
        }
      )}
    </div>
  );
}

function getCurrentStep(
  status: string
) {
  switch (
    status
  ) {
    case "Em cotação":
      return 1;

    case "Em aprovação":
      return 2;

    case "Compra realizada":
    case "Compra via cartão":
      return 3;

    case "Disponível para retirada":
    case "Em processo de entrega":
      return 4;

    case "Entregue":
      return 5;

    default:
      return 0;
  }
}

// ============================================================
// COMPONENTES
// ============================================================

function InfoCard({
  icon:
    Icon,
  label,
  value,
}: {
  icon:
    ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <Icon
        size={
          18
        }
        className="text-slate-400"
      />

      <p className="mt-4 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        {
          label
        }
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {
          value
        }
      </p>
    </div>
  );
}

function DataField({
  icon:
    Icon,
  label,
  value,
}: {
  icon:
    ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-400">
        <Icon
          size={
            15
          }
        />
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.07em] text-slate-400">
          {
            label
          }
        </p>

        <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-700">
          {
            value
          }
        </p>
      </div>
    </div>
  );
}

function ItemBadge({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
      {
        children
      }
    </span>
  );
}

function StatusBadge({
  status,
}: {
  status:
    string;
}) {
  return (
    <span
      className={[
        "rounded-full border px-3 py-1 text-xs font-semibold",
        getStatusStyle(
          status
        ),
      ].join(
        " "
      )}
    >
      {
        status
      }
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