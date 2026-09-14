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
  ShoppingCart,
  Store,
  Truck,
  UserRound,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import DeliveryConfirmationForm from "./delivery-confirmation-form";

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
  // AUTENTICAÇÃO
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

    error:
      rolesError,
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

  if (
    rolesError
  ) {
    console.error(
      "Erro ao carregar roles do pedido:",
      rolesError
    );
  }

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

  const canViewAll =
    roles.includes(
      "finance"
    ) ||
    roles.includes(
      "admin"
    ) ||
    roles.includes(
      "superadmin"
    );

  // =========================================================
  // RESUMO DA SOLICITAÇÃO
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

  // =========================================================
  // USUÁRIO COMUM:
  // SOMENTE SOLICITAÇÕES VINCULADAS A ELE
  // =========================================================

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

    error:
      summaryError,
  } =
    await summaryQuery
      .maybeSingle();

  if (
    summaryError
  ) {
    console.error(
      "Erro ao carregar solicitação Sienge:",
      summaryError
    );
  }

  if (
    !summary
  ) {
    notFound();
  }

  // =========================================================
  // IDENTIFICAR DONO
  // =========================================================

  const isOwnRequest =
    summary.requester_profile_id ===
    userId;

  // =========================================================
  // ITENS IMPORTADOS DO SIENGE
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

  // =========================================================
  // MESMO SOLICITANTE
  // =========================================================

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

  // =========================================================
  // MESMO CENTRO / OBRA
  // =========================================================

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

    error:
      itemsError,
  } =
    await itemsQuery.order(
      "insumo",
      {
        ascending:
          true,
      }
    );

  if (
    itemsError
  ) {
    console.error(
      "Erro ao carregar itens da solicitação:",
      itemsError
    );
  }

  const items =
    itemsData ??
    [];

  if (
    items.length ===
    0
  ) {
    notFound();
  }

  // =========================================================
  // CONFIRMAÇÕES DO SOLICITANTE
  //
  // Esses dados NÃO vêm da máscara do Sienge.
  // São dados locais preenchidos pelo colaborador.
  // =========================================================

  const itemIds =
    items.map(
      (
        item
      ) =>
        String(
          item.id
        )
    );

  const {
    data:
      confirmationsData,

    error:
      confirmationsError,
  } =
    await supabase
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
      );

  if (
    confirmationsError
  ) {
    console.error(
      "Erro ao carregar confirmações de recebimento:",
      confirmationsError
    );
  }

  const confirmations =
    (
      confirmationsData ??
      []
    ) as DeliveryConfirmationRow[];

  const confirmationByItem =
    new Map<
      string,
      DeliveryConfirmationRow
    >();

  for (
    const confirmation
    of confirmations
  ) {
    confirmationByItem.set(
      String(
        confirmation.item_id
      ),
      confirmation
    );
  }

  // =========================================================
  // DADOS GERAIS
  // =========================================================

  const trackingStatus =
    summary.tracking_status ??
    "Solicitação recebida";

  const requesterName =
    summary.requester_sienge_username ??
    "Não informado";

  // =========================================================
  // TELA
  // =========================================================

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* =====================================================
          VOLTAR
      ====================================================== */}

      <Link
        href="/meus-pedidos"
        className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-[#AF1B1B]"
      >
        <ArrowLeft
          size={
            16
          }
        />

        Voltar para Meus Pedidos
      </Link>

      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

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

              Visualização administrativa
            </span>
          )}
        </div>

        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Acompanhamento da solicitação
        </h1>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
          Consulte os dados importados do Sienge, acompanhe o
          andamento da compra e confirme o recebimento dos itens.
        </p>
      </header>

      {/* =====================================================
          RESUMO
      ====================================================== */}

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

      {/* =====================================================
          ANDAMENTO
      ====================================================== */}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-950">
                Andamento da compra
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Status calculado a partir das informações
                importadas do Sienge.
              </p>
            </div>

            <StatusBadge
              status={
                trackingStatus
              }
            />
          </div>
        </div>

        <OrderTimeline
          status={
            trackingStatus
          }
        />
      </section>

      {/* =====================================================
          ITENS
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 className="font-semibold text-slate-950">
            Itens da solicitação
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Informações importadas da máscara do Sienge e
            confirmação de recebimento de cada item.
          </p>
        </div>

        <div className="divide-y divide-slate-200">
          {items.map(
            (
              item,
              index
            ) => {
              const confirmation =
                confirmationByItem.get(
                  String(
                    item.id
                  )
                );

              const itemRequesterName =
                item.requester_sienge_username ??
                requesterName;

              const processAllowsConfirmation =
                Boolean(
                  item.order_number
                ) ||
                [
                  "Compra realizada",
                  "Compra via cartão",
                  "Disponível para retirada",
                  "Em processo de entrega",
                  "Entregue",
                ].includes(
                  trackingStatus
                );

              // =================================================
              // SOMENTE O SOLICITANTE VINCULADO PODE EDITAR
              // =================================================

              const canUpdateDelivery =
                isOwnRequest &&
                processAllowsConfirmation;

              return (
                <article
                  key={
                    item.id
                  }
                  className="p-5 sm:p-6"
                >
                  {/* =========================================
                      CABEÇALHO ITEM
                  ========================================== */}

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

                        {item.supply_status && (
                          <ItemBadge>
                            {
                              item.supply_status
                            }
                          </ItemBadge>
                        )}

                        {item.order_number && (
                          <ItemBadge>
                            Pedido{" "}
                            {
                              item.order_number
                            }
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

                  {/* =========================================
                      DADOS DA SOLICITAÇÃO
                  ========================================== */}

                  <section className="mb-5 rounded-2xl border border-slate-200 bg-slate-50/40">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <h4 className="text-sm font-semibold text-slate-900">
                        Dados da solicitação
                      </h4>

                      <p className="mt-1 text-[11px] text-slate-500">
                        Informações registradas na solicitação
                        original e importadas do Sienge.
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
                          summary.sc_number ??
                          "-"
                        }
                      />

                      <DataField
                        icon={
                          Package
                        }
                        label="Quantidade Solicitada"
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
                        label="Unidade de Medida"
                        value={
                          item.unit ??
                          "-"
                        }
                      />
                    </div>
                  </section>

                  {/* =========================================
                      ACOMPANHAMENTO DE SUPRIMENTOS
                  ========================================== */}

                  <section className="mb-5 rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            Acompanhamento de Suprimentos
                          </h4>

                          <p className="mt-1 text-[11px] text-slate-500">
                            Dados atualizados por meio da
                            importação da máscara do Sienge.
                          </p>
                        </div>

                        <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
                          Somente leitura
                        </span>
                      </div>
                    </div>

                    <div className="grid gap-x-8 gap-y-5 p-5 sm:grid-cols-2 xl:grid-cols-4">
                      <DataField
                        icon={
                          CheckCircle2
                        }
                        label="Status Suprimentos"
                        value={
                          item.supply_status ??
                          trackingStatus
                        }
                      />

                      <DataField
                        icon={
                          CalendarDays
                        }
                        label="Data do Status"
                        value={
                          formatDate(
                            item.supply_status_date
                          )
                        }
                      />

                      <DataField
                        icon={
                          ShoppingCart
                        }
                        label="Pedido"
                        value={
                          item.order_number ??
                          "Ainda não gerado"
                        }
                      />

                      <DataField
                        icon={
                          Store
                        }
                        label="Fornecedor"
                        value={
                          item.supplier_name ??
                          "Ainda não definido"
                        }
                      />

                      <DataField
                        icon={
                          UserRound
                        }
                        label="Contato"
                        value={
                          item.supplier_contact ??
                          "-"
                        }
                      />

                      <DataField
                        icon={
                          FileText
                        }
                        label="Telefone"
                        value={
                          item.supplier_phone ??
                          "-"
                        }
                      />

                      <DataField
                        icon={
                          Truck
                        }
                        label="Previsão de Entrega / Retirada"
                        value={
                          formatDate(
                            item.delivery_or_pickup_forecast
                          )
                        }
                      />

                      <DataField
                        icon={
                          CheckCircle2
                        }
                        label="Autorização"
                        value={
                          item.authorization_status ??
                          "-"
                        }
                      />
                    </div>
                  </section>

                  {/* =========================================
                      RECEBIMENTO DO SOLICITANTE
                  ========================================== */}

                  <section className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-200 px-5 py-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-slate-900">
                            Recebimento
                          </h4>

                          <p className="mt-1 text-[11px] leading-5 text-slate-500">
                            Confirme o recebimento deste item após
                            sua entrega.
                          </p>
                        </div>

                        {canUpdateDelivery ? (
                          <span className="w-fit rounded-full border border-[#AF1B1B]/15 bg-[#AF1B1B]/5 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#AF1B1B]">
                            Sua responsabilidade
                          </span>
                        ) : (
                          <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500">
                            Somente leitura
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-5">
                      {/* =====================================
                          VISUALIZAÇÃO ADMINISTRATIVA
                      ====================================== */}

                      {canViewAll &&
                        !isOwnRequest && (
                          <div className="mb-5 flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <Eye
                              size={
                                17
                              }
                              className="mt-0.5 shrink-0 text-slate-400"
                            />

                            <div>
                              <p className="text-xs font-semibold text-slate-700">
                                Visualização somente leitura
                              </p>

                              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                                Os dados de recebimento devem ser
                                preenchidos pelo solicitante
                                responsável por esta SC.
                              </p>
                            </div>
                          </div>
                        )}

                      {/* =====================================
                          FORMULÁRIO

                          SOMENTE ESTES CAMPOS SÃO EDITÁVEIS:
                          - Status da entrega
                          - Data
                          - Recebido por
                          - Nota Fiscal
                      ====================================== */}

                      <DeliveryConfirmationForm
                        itemId={
                          String(
                            item.id
                          )
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
// TIMELINE
// ============================================================

function OrderTimeline({
  status,
}: {
  status:
    string;
}) {
  const currentStep =
    getCurrentStep(
      status
    );

  const steps = [
    {
      label:
        "Solicitação recebida",

      description:
        "Solicitação identificada na importação.",
    },

    {
      label:
        "Em cotação",

      description:
        "Suprimentos está realizando a cotação.",
    },

    {
      label:
        "Em aprovação",

      description:
        "Compra em processo de aprovação.",
    },

    {
      label:
        "Compra realizada",

      description:
        "Compra realizada ou pedido emitido.",
    },

    {
      label:
        "Entrega / Retirada",

      description:
        "Aguardando entrega ou retirada.",
    },

    {
      label:
        "Entregue",

      description:
        "Processo de entrega concluído.",
    },
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
                step.label
              }
              className={[
                "relative rounded-xl border p-4",
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

              <p
                className={[
                  "text-xs font-semibold",
                  active
                    ? "text-[#AF1B1B]"
                    : completed
                      ? "text-emerald-800"
                      : "text-slate-600",
                ].join(
                  " "
                )}
              >
                {
                  step.label
                }
              </p>

              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                {
                  step.description
                }
              </p>
            </div>
          );
        }
      )}
    </div>
  );
}

// ============================================================
// TIMELINE STEP
// ============================================================

function getCurrentStep(
  status:
    string
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
// INFO CARD
// ============================================================

function InfoCard({
  icon:
    Icon,
  label,
  value,
}: {
  icon:
    ElementType;

  label:
    string;

  value:
    string;
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
        {label}
      </p>

      <p className="mt-1 break-words text-sm font-semibold text-slate-800">
        {value}
      </p>
    </div>
  );
}

// ============================================================
// DATA FIELD
// ============================================================

function DataField({
  icon:
    Icon,
  label,
  value,
}: {
  icon:
    ElementType;

  label:
    string;

  value:
    string;
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
          {label}
        </p>

        <p className="mt-1 break-words text-xs font-semibold leading-5 text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

// ============================================================
// ITEM BADGE
// ============================================================

function ItemBadge({
  children,
}: {
  children:
    ReactNode;
}) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600">
      {children}
    </span>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================

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
      {status}
    </span>
  );
}

function getStatusStyle(
  status:
    string
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