import type {
  ElementType,
} from "react";

import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Clock3,
  CreditCard,
  PackageCheck,
  PackageSearch,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

// ============================================================
// TIPOS
// ============================================================

type PageProps = {
  searchParams: Promise<{
    filter?: string;
    q?: string;
  }>;
};

type UserFilter =
  | "all"
  | "action"
  | "progress"
  | "completed";

type CardRequestRow = {
  id: string;

  request_number:
    | string
    | null;

  requester_id:
    | string
    | null;

  request_date:
    | string
    | null;

  sienge_request_number:
    | string
    | null;

  cost_center_or_site:
    | string
    | null;

  purpose:
    | string
    | null;

  estimated_amount:
    | number
    | string
    | null;

  approved_amount:
    | number
    | string
    | null;

  status: string;

  expected_return_date:
    | string
    | null;

  created_at:
    | string
    | null;

  updated_at:
    | string
    | null;
};

type SiengeRequestRow = {
  request_key: string;

  sc_number:
    | string
    | null;

  requester_profile_id:
    | string
    | null;

  requester_sienge_username:
    | string
    | null;

  cost_center_or_site:
    | string
    | null;

  request_date:
    | string
    | null;

  items_count:
    | number
    | null;

  orders_count:
    | number
    | null;

  tracking_status:
    | string
    | null;

  next_delivery_forecast:
    | string
    | null;
};

type CardSiengeLinkRow = {
  id: string;

  card_request_id: string;

  sienge_request_number: string;

  sienge_request_key:
    | string
    | null;

  link_status: string;
};

type SiengeItemRow = {
  id: string;

  sc_number:
    | string
    | null;

  requester_profile_id:
    | string
    | null;

  delivery_status:
    | string
    | null;
};

type DeliveryConfirmationRow = {
  item_id: string;

  requester_profile_id: string;

  delivery_status:
    | string
    | null;
};

type DisplayStage =
  | "action"
  | "progress"
  | "completed";

type DisplayType =
  | "card"
  | "purchase"
  | "combined";

type DisplayRequest = {
  key: string;

  type: DisplayType;

  stage: DisplayStage;

  number: string;

  scNumber:
    | string
    | null;

  title: string;

  costCenter:
    | string
    | null;

  statusLabel: string;

  nextAction: string;

  requestDate:
    | string
    | null;

  forecast:
    | string
    | null;

  itemsCount:
    number;

  amount:
    | number
    | string
    | null;

  href: string;

  actionLabel: string;

  sortDate: string;
};

// ============================================================
// HELPERS
// ============================================================

function resolveFilter(
  value:
    | string
    | undefined
): UserFilter {
  switch (
    value
  ) {
    case "action":
    case "progress":
    case "completed":
      return value;

    default:
      return "all";
  }
}

function normalize(
  value:
    | string
    | null
    | undefined
) {
  return String(
    value ??
    ""
  )
    .normalize(
      "NFD"
    )
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .trim()
    .toUpperCase();
}

function normalizeSearch(
  value:
    | string
    | null
    | undefined
) {
  return normalize(
    value
  ).toLowerCase();
}

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

  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (
    !match
  ) {
    return "-";
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatCurrency(
  value:
    | number
    | string
    | null
) {
  if (
    value ===
    null
  ) {
    return null;
  }

  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  ).format(
    Number(
      value
    )
  );
}

// ============================================================
// STATUS DO CARTÃO
// ============================================================

function getCardStatusLabel(
  status: string
) {
  const labels:
    Record<
      string,
      string
    > = {
      submitted:
        "Solicitação enviada",

      under_review:
        "Em análise",

      awaiting_information:
        "Aguardando suas informações",

      awaiting_approval:
        "Aguardando aprovação",

      approved:
        "Solicitação aprovada",

      rejected:
        "Solicitação reprovada",

      card_reserved:
        "Cartão reservado",

      card_delivered:
        "Cartão liberado",

      in_use:
        "Cartão em utilização",

      awaiting_return:
        "Aguardando devolução",

      returned:
        "Cartão devolvido",

      accountability_review:
        "Devolução em conferência",

      completed:
        "Concluído",

      cancelled:
        "Cancelado",
    };

  return (
    labels[
      status
    ] ??
    status
  );
}

function getCardStage(
  status: string
): DisplayStage {
  if (
    [
      "awaiting_information",
      "awaiting_return",
    ].includes(
      status
    )
  ) {
    return "action";
  }

  if (
    [
      "completed",
      "cancelled",
      "rejected",
    ].includes(
      status
    )
  ) {
    return "completed";
  }

  return "progress";
}

function getCardNextAction(
  status: string
) {
  switch (
    status
  ) {
    case "awaiting_information":
      return "Existem informações que precisam ser complementadas por você.";

    case "awaiting_return":
      return "O cartão precisa ser devolvido para continuar o processo.";

    case "submitted":
      return "A solicitação foi enviada e está aguardando análise do Financeiro.";

    case "under_review":
      return "O Financeiro está analisando sua solicitação.";

    case "awaiting_approval":
      return "A solicitação está aguardando aprovação.";

    case "approved":
      return "A solicitação foi aprovada e seguirá para disponibilização do cartão.";

    case "card_reserved":
      return "O cartão foi reservado para sua solicitação.";

    case "card_delivered":
    case "in_use":
      return "O cartão está disponível para utilização.";

    case "returned":
      return "O cartão foi devolvido e seguirá para conferência.";

    case "accountability_review":
      return "O Financeiro está conferindo a devolução.";

    case "completed":
      return "O processo foi concluído.";

    case "rejected":
      return "A solicitação foi encerrada após reprovação.";

    case "cancelled":
      return "A solicitação foi cancelada.";

    default:
      return "Acompanhe o andamento da sua solicitação.";
  }
}

// ============================================================
// STATUS SIENGE
// ============================================================

function getSiengeNextAction(
  status:
    | string
    | null
) {
  switch (
    status
  ) {
    case "Em aprovação":
      return "A solicitação está aguardando aprovação no processo de compra.";

    case "Em cotação":
      return "Suprimentos está realizando a cotação.";

    case "Compra realizada":
    case "Compra via cartão":
      return "A compra foi realizada. Aguarde a entrega.";

    case "Disponível para retirada":
      return "O material está disponível para retirada.";

    case "Em processo de entrega":
      return "O pedido está em processo de entrega.";

    case "Entregue":
      return "A entrega foi registrada.";

    default:
      return "A solicitação está sendo processada.";
  }
}

// ============================================================
// PAGE
// ============================================================

export default async function MyRequestsPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

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
  // FILTROS
  // =========================================================

  const filter =
    resolveFilter(
      params.filter
    );

  const search =
    (
      params.q ??
      ""
    ).trim();

  const normalizedSearch =
    normalizeSearch(
      search
    );

  // =========================================================
  // SOLICITAÇÕES DO PRÓPRIO USUÁRIO
  // =========================================================

  const [
    cardsResult,
    siengeResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "card_requests"
        )
        .select(
          `
          id,
          request_number,
          requester_id,
          request_date,
          sienge_request_number,
          cost_center_or_site,
          purpose,
          estimated_amount,
          approved_amount,
          status,
          expected_return_date,
          created_at,
          updated_at
          `
        )
        .eq(
          "requester_id",
          userId
        )
        .is(
          "deleted_at",
          null
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),

      supabase
        .from(
          "v_sienge_request_summary"
        )
        .select(
          `
          request_key,
          sc_number,
          requester_profile_id,
          requester_sienge_username,
          cost_center_or_site,
          request_date,
          items_count,
          orders_count,
          tracking_status,
          next_delivery_forecast
          `
        )
        .eq(
          "requester_profile_id",
          userId
        )
        .order(
          "request_date",
          {
            ascending:
              false,

            nullsFirst:
              false,
          }
        ),
    ]);

  if (
    cardsResult.error
  ) {
    console.error(
      "Erro ao carregar solicitações de cartão do usuário:",
      cardsResult.error
    );
  }

  if (
    siengeResult.error
  ) {
    console.error(
      "Erro ao carregar solicitações Sienge do usuário:",
      siengeResult.error
    );
  }

  const cards =
    (
      cardsResult.data ??
      []
    ) as CardRequestRow[];

  const siengeRequests =
    (
      siengeResult.data ??
      []
    ) as SiengeRequestRow[];

  // =========================================================
  // VÍNCULOS CARTÃO x SIENGE
  // =========================================================

  const cardIds =
    cards.map(
      (
        card
      ) =>
        card.id
    );

  let links:
    CardSiengeLinkRow[] =
    [];

  if (
    cardIds.length >
    0
  ) {
    const {
      data:
        linkRows,

      error:
        linksError,
    } =
      await supabase
        .from(
          "card_sienge_links"
        )
        .select(
          `
          id,
          card_request_id,
          sienge_request_number,
          sienge_request_key,
          link_status
          `
        )
        .in(
          "card_request_id",
          cardIds
        );

    if (
      linksError
    ) {
      console.error(
        "Erro ao carregar vínculos Cartão x Sienge:",
        linksError
      );
    }

    links =
      (
        linkRows ??
        []
      ) as CardSiengeLinkRow[];
  }

  const linkByCardId =
    new Map(
      links.map(
        (
          link
        ) => [
          link.card_request_id,
          link,
        ]
      )
    );

  const siengeByKey =
    new Map(
      siengeRequests.map(
        (
          request
        ) => [
          request.request_key,
          request,
        ]
      )
    );

  // =========================================================
  // ITENS DO SIENGE + CONFIRMAÇÕES
  //
  // Serve somente para descobrir se existe recebimento
  // aguardando ação do solicitante.
  // =========================================================

  const {
    data:
      siengeItemsData,

    error:
      siengeItemsError,
  } =
    await supabase
      .from(
        "sienge_purchase_items"
      )
      .select(
        `
        id,
        sc_number,
        requester_profile_id,
        delivery_status
        `
      )
      .eq(
        "requester_profile_id",
        userId
      );

  if (
    siengeItemsError
  ) {
    console.error(
      "Erro ao carregar itens Sienge do usuário:",
      siengeItemsError
    );
  }

  const siengeItems =
    (
      siengeItemsData ??
      []
    ) as SiengeItemRow[];

  const itemIds =
    siengeItems.map(
      (
        item
      ) =>
        item.id
    );

  let confirmations:
    DeliveryConfirmationRow[] =
    [];

  if (
    itemIds.length >
    0
  ) {
    const {
      data:
        confirmationRows,

      error:
        confirmationError,
    } =
      await supabase
        .from(
          "sienge_requester_delivery_confirmations"
        )
        .select(
          `
          item_id,
          requester_profile_id,
          delivery_status
          `
        )
        .eq(
          "requester_profile_id",
          userId
        )
        .in(
          "item_id",
          itemIds
        );

    if (
      confirmationError
    ) {
      console.error(
        "Erro ao carregar confirmações de recebimento:",
        confirmationError
      );
    }

    confirmations =
      (
        confirmationRows ??
        []
      ) as DeliveryConfirmationRow[];
  }

  const confirmationByItem =
    new Map(
      confirmations.map(
        (
          confirmation
        ) => [
          confirmation.item_id,
          confirmation,
        ]
      )
    );

  // =========================================================
  // SCs COM RECEBIMENTO PENDENTE
  // =========================================================

  const receiptPendingScs =
    new Set<string>();

  for (
    const item
    of siengeItems
  ) {
    const importedAsDelivered =
      normalize(
        item.delivery_status
      ) ===
      normalize(
        "Entregue"
      );

    if (
      !importedAsDelivered
    ) {
      continue;
    }

    const confirmation =
      confirmationByItem.get(
        item.id
      );

    const confirmedAsDelivered =
      normalize(
        confirmation
          ?.delivery_status
      ) ===
      normalize(
        "Entregue"
      );

    if (
      !confirmedAsDelivered
    ) {
      const sc =
        normalize(
          item.sc_number
        );

      if (
        sc
      ) {
        receiptPendingScs.add(
          sc
        );
      }
    }
  }

  // =========================================================
  // NORMALIZAR CARTÕES
  // =========================================================

  const linkedSiengeKeys =
    new Set<string>();

  const cardDisplay:
    DisplayRequest[] =
    cards.map(
      (
        card
      ) => {
        const link =
          linkByCardId.get(
            card.id
          );

        let sienge:
          | SiengeRequestRow
          | null =
          null;

        if (
          link?.link_status ===
            "linked" &&
          link.sienge_request_key
        ) {
          sienge =
            siengeByKey.get(
              link.sienge_request_key
            ) ??
            null;

          if (
            sienge
          ) {
            linkedSiengeKeys.add(
              sienge.request_key
            );
          }
        }

        const scNumber =
          sienge?.sc_number ??
          card.sienge_request_number ??
          null;

        const hasReceiptPending =
          Boolean(
            scNumber &&
            receiptPendingScs.has(
              normalize(
                scNumber
              )
            )
          );

        const cardStage =
          getCardStage(
            card.status
          );

        let stage:
          DisplayStage =
          cardStage;

        if (
          hasReceiptPending
        ) {
          stage =
            "action";
        } else if (
          sienge
        ) {
          if (
            normalize(
              sienge.tracking_status
            ) ===
              normalize(
                "Entregue"
              ) &&
            cardStage !==
              "action"
          ) {
            stage =
              "completed";
          } else if (
            cardStage !==
            "action"
          ) {
            stage =
              "progress";
          }
        }

        let statusLabel =
          getCardStatusLabel(
            card.status
          );

        let nextAction =
          getCardNextAction(
            card.status
          );

        let href =
          `/solicitacoes/${encodeURIComponent(
            card.id
          )}`;

        let actionLabel =
          "Ver solicitação";

        if (
          card.status ===
          "awaiting_return"
        ) {
          href =
            "/devolucoes";

          actionLabel =
            "Fazer devolução";
        } else if (
          hasReceiptPending &&
          sienge
        ) {
          statusLabel =
            "Recebimento aguardando confirmação";

          nextAction =
            "O pedido foi entregue e precisa da sua confirmação.";

          href =
            `/meus-pedidos/${encodeURIComponent(
              sienge.request_key
            )}`;

          actionLabel =
            "Confirmar recebimento";
        } else if (
          sienge
        ) {
          statusLabel =
            sienge.tracking_status ??
            statusLabel;

          nextAction =
            getSiengeNextAction(
              sienge.tracking_status
            );

          href =
            `/meus-pedidos/${encodeURIComponent(
              sienge.request_key
            )}`;

          actionLabel =
            "Acompanhar";
        }

        const latestDate =
          card.updated_at ??
          card.created_at ??
          card.request_date ??
          "";

        return {
          key:
            `card-${card.id}`,

          type:
            sienge
              ? "combined"
              : "card",

          stage,

          number:
            card.request_number ??
            "Solicitação",

          scNumber,

          title:
            card.purpose ??
            "Solicitação de cartão",

          costCenter:
            sienge
              ?.cost_center_or_site ??
            card.cost_center_or_site,

          statusLabel,

          nextAction,

          requestDate:
            card.request_date ??
            card.created_at,

          forecast:
            sienge
              ?.next_delivery_forecast ??
            card.expected_return_date,

          itemsCount:
            Number(
              sienge
                ?.items_count ??
              0
            ),

          amount:
            card.approved_amount ??
            card.estimated_amount,

          href,

          actionLabel,

          sortDate:
            latestDate,
        };
      }
    );

  // =========================================================
  // SIENGE NÃO VINCULADO A CARTÃO
  // =========================================================

  const siengeDisplay:
    DisplayRequest[] =
    siengeRequests
      .filter(
        (
          request
        ) =>
          !linkedSiengeKeys.has(
            request.request_key
          )
      )
      .map(
        (
          request
        ) => {
          const sc =
            normalize(
              request.sc_number
            );

          const hasReceiptPending =
            Boolean(
              sc &&
              receiptPendingScs.has(
                sc
              )
            );

          const isDelivered =
            normalize(
              request.tracking_status
            ) ===
            normalize(
              "Entregue"
            );

          const stage:
            DisplayStage =
            hasReceiptPending
              ? "action"
              : isDelivered
                ? "completed"
                : "progress";

          return {
            key:
              `sienge-${request.request_key}`,

            type:
              "purchase",

            stage,

            number:
              request.sc_number
                ? `SC ${request.sc_number}`
                : "Solicitação de compra",

            scNumber:
              request.sc_number,

            title:
              request.cost_center_or_site ??
              "Solicitação de compra",

            costCenter:
              request.cost_center_or_site,

            statusLabel:
              hasReceiptPending
                ? "Recebimento aguardando confirmação"
                : request.tracking_status ??
                  "Em acompanhamento",

            nextAction:
              hasReceiptPending
                ? "O pedido foi entregue e precisa da sua confirmação."
                : getSiengeNextAction(
                    request.tracking_status
                  ),

            requestDate:
              request.request_date,

            forecast:
              request.next_delivery_forecast,

            itemsCount:
              Number(
                request.items_count ??
                0
              ),

            amount:
              null,

            href:
              `/meus-pedidos/${encodeURIComponent(
                request.request_key
              )}`,

            actionLabel:
              hasReceiptPending
                ? "Confirmar recebimento"
                : "Acompanhar",

            sortDate:
              request.request_date ??
              "",
          };
        }
      );

  // =========================================================
  // LISTA UNIFICADA
  // =========================================================

  const allRequests =
    [
      ...cardDisplay,
      ...siengeDisplay,
    ].sort(
      (
        a,
        b
      ) => {
        const stageWeight:
          Record<
            DisplayStage,
            number
          > = {
          action: 0,
          progress: 1,
          completed: 2,
        };

        const stageDifference =
          stageWeight[
            a.stage
          ] -
          stageWeight[
            b.stage
          ];

        if (
          stageDifference !==
          0
        ) {
          return stageDifference;
        }

        return b.sortDate.localeCompare(
          a.sortDate
        );
      }
    );

  // =========================================================
  // INDICADORES
  // =========================================================

  const actionCount =
    allRequests.filter(
      (
        request
      ) =>
        request.stage ===
        "action"
    ).length;

  const progressCount =
    allRequests.filter(
      (
        request
      ) =>
        request.stage ===
        "progress"
    ).length;

  const completedCount =
    allRequests.filter(
      (
        request
      ) =>
        request.stage ===
        "completed"
    ).length;

  // =========================================================
  // FILTRAR
  // =========================================================

  const visibleRequests =
    allRequests.filter(
      (
        request
      ) => {
        if (
          filter !==
            "all" &&
          request.stage !==
            filter
        ) {
          return false;
        }

        if (
          !normalizedSearch
        ) {
          return true;
        }

        const searchable =
          normalizeSearch(
            [
              request.number,
              request.scNumber,
              request.title,
              request.costCenter,
              request.statusLabel,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
          );

        return searchable.includes(
          normalizedSearch
        );
      }
    );

  // =========================================================
  // TELA
  // =========================================================

  return (
    <div className="mx-auto max-w-[1500px]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#AF1B1B]">
            Minha operação
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Minhas Solicitações
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Acompanhe cartões, compras, devoluções e recebimentos
            em um único lugar.
          </p>
        </div>

        <Link
          href="/solicitacoes/nova"
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white transition hover:bg-[#921717]"
        >
          <Plus
            size={
              17
            }
          />

          Nova solicitação
        </Link>
      </div>

      {/* =====================================================
          RESUMO DIDÁTICO
      ====================================================== */}

      {actionCount >
        0 && (
        <div className="mb-6 flex gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-amber-600 shadow-sm">
            <Sparkles
              size={
                19
              }
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-amber-900">
              Você tem {actionCount}{" "}
              {actionCount ===
              1
                ? "solicitação que precisa"
                : "solicitações que precisam"}{" "}
              da sua atenção
            </p>

            <p className="mt-1 text-xs leading-5 text-amber-800">
              Elas aparecem primeiro na lista para facilitar suas
              próximas ações.
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          INDICADORES / FILTROS
      ====================================================== */}

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <FilterCard
          href={buildFilterUrl({
            filter:
              "all",

            search,
          })}
          active={
            filter ===
            "all"
          }
          icon={
            PackageSearch
          }
          label="Todas"
          value={
            allRequests.length
          }
        />

        <FilterCard
          href={buildFilterUrl({
            filter:
              "action",

            search,
          })}
          active={
            filter ===
            "action"
          }
          icon={
            TriangleAlert
          }
          label="Precisa de mim"
          value={
            actionCount
          }
          attention={
            actionCount >
            0
          }
        />

        <FilterCard
          href={buildFilterUrl({
            filter:
              "progress",

            search,
          })}
          active={
            filter ===
            "progress"
          }
          icon={
            Clock3
          }
          label="Em andamento"
          value={
            progressCount
          }
        />

        <FilterCard
          href={buildFilterUrl({
            filter:
              "completed",

            search,
          })}
          active={
            filter ===
            "completed"
          }
          icon={
            CheckCircle2
          }
          label="Concluídas"
          value={
            completedCount
          }
        />
      </div>

      {/* =====================================================
          BUSCA
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <form
            method="get"
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="hidden"
              name="filter"
              value={
                filter
              }
            />

            <div className="relative min-w-0 flex-1">
              <Search
                size={
                  17
                }
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                name="q"
                defaultValue={
                  search
                }
                placeholder="Buscar por número, SC, obra ou solicitação..."
                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
              />
            </div>

            <button
              type="submit"
              className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Buscar
            </button>
          </form>
        </div>

        {/* ===================================================
            QUANTIDADE
        ==================================================== */}

        <div className="border-b border-slate-100 px-6 py-4">
          <p className="text-xs text-slate-500">
            {visibleRequests.length}{" "}
            {visibleRequests.length ===
            1
              ? "solicitação encontrada"
              : "solicitações encontradas"}
          </p>
        </div>

        {/* ===================================================
            VAZIO
        ==================================================== */}

        {visibleRequests.length ===
        0 ? (
          <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
              <PackageSearch
                size={
                  25
                }
              />
            </div>

            <p className="mt-4 text-sm font-semibold text-slate-700">
              Nenhuma solicitação encontrada
            </p>

            <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
              Suas solicitações de cartão e compras do Sienge
              aparecerão aqui automaticamente.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleRequests.map(
              (
                request
              ) => (
                <RequestRow
                  key={
                    request.key
                  }
                  request={
                    request
                  }
                />
              )
            )}
          </div>
        )}
      </section>
    </div>
  );
}

// ============================================================
// LINHA DA SOLICITAÇÃO
// ============================================================

function RequestRow({
  request,
}: {
  request:
    DisplayRequest;
}) {
  const typeInfo =
    getTypeInfo(
      request.type
    );

  const stageInfo =
    getStageInfo(
      request.stage
    );

  const formattedAmount =
    formatCurrency(
      request.amount
    );

  return (
    <div className="px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
        {/* ===================================================
            CONTEÚDO
        ==================================================== */}

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-[#AF1B1B]">
              {
                request.number
              }
            </span>

            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                typeInfo.className,
              ].join(
                " "
              )}
            >
              <typeInfo.Icon
                size={
                  11
                }
              />

              {
                typeInfo.label
              }
            </span>

            <span
              className={[
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
                stageInfo.className,
              ].join(
                " "
              )}
            >
              <stageInfo.Icon
                size={
                  11
                }
              />

              {
                stageInfo.label
              }
            </span>
          </div>

          <h2 className="mt-2 text-sm font-semibold text-slate-900">
            {
              request.title
            }
          </h2>

          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
            {request.scNumber && (
              <span>
                SC:{" "}
                {
                  request.scNumber
                }
              </span>
            )}

            {request.costCenter && (
              <span>
                {
                  request.costCenter
                }
              </span>
            )}

            <span>
              Solicitação:{" "}
              {formatDate(
                request.requestDate
              )}
            </span>

            {request.itemsCount >
              0 && (
              <span>
                {request.itemsCount}{" "}
                {request.itemsCount ===
                1
                  ? "item"
                  : "itens"}
              </span>
            )}
          </div>

          {/* =================================================
              STATUS ATUAL
          ================================================== */}

          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3">
            <div className="flex items-start gap-3">
              <CircleDot
                size={
                  15
                }
                className={[
                  "mt-0.5 shrink-0",
                  request.stage ===
                  "action"
                    ? "text-amber-600"
                    : request.stage ===
                        "completed"
                      ? "text-emerald-600"
                      : "text-slate-400",
                ].join(
                  " "
                )}
              />

              <div>
                <p className="text-xs font-semibold text-slate-800">
                  {
                    request.statusLabel
                  }
                </p>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  {
                    request.nextAction
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================
            LATERAL
        ==================================================== */}

        <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center xl:flex-col xl:items-end">
          <div className="flex gap-6 xl:text-right">
            {request.forecast && (
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  Previsão
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {formatDate(
                    request.forecast
                  )}
                </p>
              </div>
            )}

            {formattedAmount && (
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  Valor
                </p>

                <p className="mt-1 text-xs font-semibold text-slate-700">
                  {
                    formattedAmount
                  }
                </p>
              </div>
            )}
          </div>

          <Link
            href={
              request.href
            }
            className={[
              "inline-flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold transition",
              request.stage ===
              "action"
                ? "bg-[#AF1B1B] text-white hover:bg-[#921717]"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(
              " "
            )}
          >
            {
              request.actionLabel
            }

            <ArrowRight
              size={
                14
              }
            />
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// FILTRO
// ============================================================

function FilterCard({
  href,
  active,
  icon:
    Icon,
  label,
  value,
  attention = false,
}: {
  href:
    string;

  active:
    boolean;

  icon:
    ElementType;

  label:
    string;

  value:
    number;

  attention?:
    boolean;
}) {
  return (
    <Link
      href={
        href
      }
      className={[
        "rounded-2xl border p-4 transition",
        active
          ? "border-slate-900 bg-slate-900 text-white shadow-sm"
          : attention
            ? "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300"
            : "border-slate-200 bg-white text-slate-900 hover:border-slate-300",
      ].join(
        " "
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div
          className={[
            "flex h-9 w-9 items-center justify-center rounded-xl",
            active
              ? "bg-white/10 text-white"
              : attention
                ? "bg-white text-amber-600"
                : "bg-slate-100 text-slate-500",
          ].join(
            " "
          )}
        >
          <Icon
            size={
              17
            }
          />
        </div>

        <p className="text-2xl font-semibold">
          {
            value
          }
        </p>
      </div>

      <p
        className={[
          "mt-3 text-xs font-semibold",
          active
            ? "text-white"
            : "text-inherit",
        ].join(
          " "
        )}
      >
        {
          label
        }
      </p>
    </Link>
  );
}

// ============================================================
// TIPO
// ============================================================

function getTypeInfo(
  type:
    DisplayType
) {
  if (
    type ===
    "combined"
  ) {
    return {
      label:
        "Cartão + Compra",

      Icon:
        PackageCheck,

      className:
        "border-violet-200 bg-violet-50 text-violet-700",
    };
  }

  if (
    type ===
    "purchase"
  ) {
    return {
      label:
        "Compra",

      Icon:
        ShoppingCart,

      className:
        "border-blue-200 bg-blue-50 text-blue-700",
    };
  }

  return {
    label:
      "Cartão",

    Icon:
      CreditCard,

    className:
      "border-slate-200 bg-slate-50 text-slate-600",
  };
}

// ============================================================
// ETAPA
// ============================================================

function getStageInfo(
  stage:
    DisplayStage
) {
  if (
    stage ===
    "action"
  ) {
    return {
      label:
        "Precisa de você",

      Icon:
        TriangleAlert,

      className:
        "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  if (
    stage ===
    "completed"
  ) {
    return {
      label:
        "Concluído",

      Icon:
        CheckCircle2,

      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  return {
    label:
      "Em andamento",

    Icon:
      Clock3,

    className:
      "border-slate-200 bg-slate-50 text-slate-600",
  };
}

// ============================================================
// URL DOS FILTROS
// ============================================================

function buildFilterUrl({
  filter,
  search,
}: {
  filter:
    UserFilter;

  search:
    string;
}) {
  const params =
    new URLSearchParams();

  if (
    filter !==
    "all"
  ) {
    params.set(
      "filter",
      filter
    );
  }

  if (
    search
  ) {
    params.set(
      "q",
      search
    );
  }

  const query =
    params.toString();

  return query
    ? `/solicitacoes?${query}`
    : "/solicitacoes";
}