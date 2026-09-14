import type {
  ElementType,
} from "react";

import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileSearch,
  Link2,
  PackageSearch,
  Search,
  ShieldCheck,
  ShoppingCart,
  TriangleAlert,
  Unlink,
} from "lucide-react";

import CardRequestStatus from "@/components/cards/card-request-status";

import {
  createClient,
} from "@/lib/supabase/server";

import ExportCardRequestsButton from "./export-card-requests-button";

// ============================================================
// TIPOS
// ============================================================

type PageProps = {
  searchParams: Promise<{
    view?: string;
    status?: string;
    linkStatus?: string;
    q?: string;
  }>;
};

type ViewMode =
  | "overview"
  | "cards"
  | "sienge"
  | "reconciliation";

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

  suppliers_text:
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

  status:
    string;

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

type ProfileRow = {
  id: string;
  full_name: string;
  email: string;
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

  conflict_reason:
    | string
    | null;

  sienge_requester_profile_id:
    | string
    | null;

  sienge_requester_username:
    | string
    | null;

  sienge_cost_center_or_site:
    | string
    | null;

  last_checked_at:
    | string
    | null;

  linked_at:
    | string
    | null;

  created_at:
    | string
    | null;
};

// ============================================================
// OPÇÕES
// ============================================================

const cardStatusOptions = [
  {
    value: "",
    label: "Todos os status",
  },
  {
    value: "submitted",
    label: "Solicitação enviada",
  },
  {
    value: "under_review",
    label: "Em análise",
  },
  {
    value: "awaiting_information",
    label: "Aguardando informações",
  },
  {
    value: "awaiting_approval",
    label: "Aguardando aprovação",
  },
  {
    value: "approved",
    label: "Aprovado",
  },
  {
    value: "rejected",
    label: "Reprovado",
  },
  {
    value: "card_reserved",
    label: "Cartão reservado",
  },
  {
    value: "card_delivered",
    label: "Cartão liberado",
  },
  {
    value: "in_use",
    label: "Em utilização",
  },
  {
    value: "awaiting_return",
    label: "Aguardando devolução",
  },
  {
    value: "returned",
    label: "Devolvido",
  },
  {
    value: "accountability_review",
    label: "Em conferência",
  },
  {
    value: "completed",
    label: "Concluído",
  },
  {
    value: "cancelled",
    label: "Cancelado",
  },
];

const linkStatusOptions = [
  {
    value: "",
    label: "Todos os vínculos",
  },
  {
    value: "linked",
    label: "Vinculado",
  },
  {
    value: "pending",
    label: "Aguardando",
  },
  {
    value: "not_found",
    label: "SC não localizada",
  },
  {
    value: "conflict",
    label: "Revisar",
  },
];

// ============================================================
// HELPERS
// ============================================================

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
    Number(
      value ??
      0
    )
  );
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

function normalizeText(
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
    .toLowerCase()
    .trim();
}

function resolveView(
  value:
    | string
    | undefined
): ViewMode {
  switch (
    value
  ) {
    case "cards":
    case "sienge":
    case "reconciliation":
      return value;

    default:
      return "overview";
  }
}

// ============================================================
// PAGE
// ============================================================

export default async function FinanceRequestsPage({
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
  // PERMISSÕES
  // =========================================================

  const {
    data:
      roleRows,

    error:
      roleError,
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
    roleError
  ) {
    console.error(
      "Erro ao validar permissões do Financeiro:",
      roleError
    );
  }

  const roles =
    (
      roleRows ??
      []
    ).map(
      (
        item
      ) =>
        String(
          item.role
        )
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

  if (
    !canAccess
  ) {
    redirect(
      "/dashboard"
    );
  }

  // =========================================================
  // FILTROS
  // =========================================================

  const view =
    resolveView(
      params.view
    );

  const status =
    (
      params.status ??
      ""
    ).trim();

  const linkStatus =
    (
      params.linkStatus ??
      ""
    ).trim();

  const search =
    (
      params.q ??
      ""
    ).trim();

  const normalizedSearch =
    normalizeText(
      search
    );

  // =========================================================
  // CARREGAMENTO GERAL
  // =========================================================

  const [
    cardsResult,
    siengeResult,
    linksResult,
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
          suppliers_text,
          purpose,
          estimated_amount,
          approved_amount,
          status,
          expected_return_date,
          created_at,
          updated_at
          `
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
        .order(
          "request_date",
          {
            ascending:
              false,

            nullsFirst:
              false,
          }
        ),

      supabase
        .from(
          "card_sienge_links"
        )
        .select(
          `
          id,
          card_request_id,
          sienge_request_number,
          sienge_request_key,
          link_status,
          conflict_reason,
          sienge_requester_profile_id,
          sienge_requester_username,
          sienge_cost_center_or_site,
          last_checked_at,
          linked_at,
          created_at
          `
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        ),
    ]);

  if (
    cardsResult.error
  ) {
    console.error(
      "Erro ao carregar solicitações de cartão:",
      cardsResult.error
    );
  }

  if (
    siengeResult.error
  ) {
    console.error(
      "Erro ao carregar solicitações Sienge:",
      siengeResult.error
    );
  }

  if (
    linksResult.error
  ) {
    console.error(
      "Erro ao carregar conciliações Cartão x Sienge:",
      linksResult.error
    );
  }

  const allCards =
    (
      cardsResult.data ??
      []
    ) as CardRequestRow[];

  const allSienge =
    (
      siengeResult.data ??
      []
    ) as SiengeRequestRow[];

  const allLinks =
    (
      linksResult.data ??
      []
    ) as CardSiengeLinkRow[];

  // =========================================================
  // PERFIS
  // =========================================================

  const profileIds =
    Array.from(
      new Set(
        [
          ...allCards.map(
            (
              request
            ) =>
              request.requester_id
          ),

          ...allSienge.map(
            (
              request
            ) =>
              request.requester_profile_id
          ),

          ...allLinks.map(
            (
              link
            ) =>
              link.sienge_requester_profile_id
          ),
        ].filter(
          (
            value
          ): value is string =>
            Boolean(
              value
            )
        )
      )
    );

  let profiles:
    ProfileRow[] =
    [];

  if (
    profileIds.length >
    0
  ) {
    const {
      data:
        profileRows,

      error:
        profilesError,
    } =
      await supabase
        .from(
          "profiles"
        )
        .select(
          `
          id,
          full_name,
          email
          `
        )
        .in(
          "id",
          profileIds
        );

    if (
      profilesError
    ) {
      console.error(
        "Erro ao carregar perfis:",
        profilesError
      );
    }

    profiles =
      (
        profileRows ??
        []
      ) as ProfileRow[];
  }

  const profileMap =
    new Map(
      profiles.map(
        (
          profile
        ) => [
          profile.id,
          profile,
        ]
      )
    );

  const cardMap =
    new Map(
      allCards.map(
        (
          request
        ) => [
          request.id,
          request,
        ]
      )
    );

  const linkByCardRequest =
    new Map(
      allLinks.map(
        (
          link
        ) => [
          link.card_request_id,
          link,
        ]
      )
    );

  // =========================================================
  // FILTRAR CARTÕES
  // =========================================================

  const cards =
    allCards.filter(
      (
        request
      ) => {
        if (
          status &&
          request.status !==
            status
        ) {
          return false;
        }

        if (
          !normalizedSearch
        ) {
          return true;
        }

        const requester =
          request.requester_id
            ? profileMap.get(
                request.requester_id
              )
            : null;

        const searchable =
          normalizeText(
            [
              request.request_number,
              request.sienge_request_number,
              request.cost_center_or_site,
              request.suppliers_text,
              request.purpose,
              requester?.full_name,
              requester?.email,
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
  // FILTRAR SIENGE
  // =========================================================

  const siengeRequests =
    allSienge.filter(
      (
        request
      ) => {
        if (
          !normalizedSearch
        ) {
          return true;
        }

        const searchable =
          normalizeText(
            [
              request.sc_number,
              request.requester_sienge_username,
              request.cost_center_or_site,
              request.tracking_status,
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
  // FILTRAR CONCILIAÇÃO
  // =========================================================

  const reconciliations =
    allLinks.filter(
      (
        link
      ) => {
        if (
          linkStatus &&
          link.link_status !==
            linkStatus
        ) {
          return false;
        }

        if (
          !normalizedSearch
        ) {
          return true;
        }

        const card =
          cardMap.get(
            link.card_request_id
          );

        const requester =
          card?.requester_id
            ? profileMap.get(
                card.requester_id
              )
            : null;

        const searchable =
          normalizeText(
            [
              card?.request_number,
              card?.purpose,
              requester?.full_name,
              link.sienge_request_number,
              link.sienge_requester_username,
              link.sienge_cost_center_or_site,
              link.link_status,
              link.conflict_reason,
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
  // INDICADORES
  // =========================================================

  const submittedCount =
    allCards.filter(
      (
        request
      ) =>
        request.status ===
        "submitted"
    ).length;

  const reviewCount =
    allCards.filter(
      (
        request
      ) =>
        request.status ===
        "under_review"
    ).length;

  const approvalCount =
    allCards.filter(
      (
        request
      ) =>
        request.status ===
        "awaiting_approval"
    ).length;

  const awaitingReturnCount =
    allCards.filter(
      (
        request
      ) =>
        request.status ===
        "awaiting_return"
    ).length;

  const cardsInUseCount =
    allCards.filter(
      (
        request
      ) =>
        [
          "card_delivered",
          "in_use",
        ].includes(
          request.status
        )
    ).length;

  const linkedCount =
    allLinks.filter(
      (
        link
      ) =>
        link.link_status ===
        "linked"
    ).length;

  const pendingLinkCount =
    allLinks.filter(
      (
        link
      ) =>
        [
          "pending",
          "not_found",
        ].includes(
          link.link_status
        )
    ).length;

  const conflictCount =
    allLinks.filter(
      (
        link
      ) =>
        link.link_status ===
        "conflict"
    ).length;

  const siengeDeliveryCount =
    allSienge.filter(
      (
        request
      ) =>
        [
          "Compra realizada",
          "Compra via cartão",
          "Disponível para retirada",
          "Em processo de entrega",
        ].includes(
          request.tracking_status ??
            ""
        )
    ).length;

  // =========================================================
  // TELA
  // =========================================================

  return (
    <div className="mx-auto max-w-[1600px]">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#AF1B1B]">
            Financeiro
          </p>

          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
            Central de Solicitações
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Acompanhe solicitações de cartão, pedidos do Sienge e
            os vínculos entre os dois processos em um único lugar.
          </p>
        </div>

        {view ===
          "cards" && (
          <div className="shrink-0">
            <ExportCardRequestsButton />
          </div>
        )}
      </div>

      {/* =====================================================
          NAVEGAÇÃO
      ====================================================== */}

      <div className="mb-6 overflow-x-auto">
        <div className="inline-flex min-w-max rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <ViewTab
            href="/financeiro/solicitacoes?view=overview"
            active={
              view ===
              "overview"
            }
            icon={
              FileSearch
            }
            label="Visão Geral"
          />

          <ViewTab
            href="/financeiro/solicitacoes?view=cards"
            active={
              view ===
              "cards"
            }
            icon={
              CreditCard
            }
            label="Cartões"
            count={
              allCards.length
            }
          />

          <ViewTab
            href="/financeiro/solicitacoes?view=sienge"
            active={
              view ===
              "sienge"
            }
            icon={
              ShoppingCart
            }
            label="Sienge"
            count={
              allSienge.length
            }
          />

          <ViewTab
            href="/financeiro/solicitacoes?view=reconciliation"
            active={
              view ===
              "reconciliation"
            }
            icon={
              Link2
            }
            label="Conciliação"
            count={
              pendingLinkCount +
              conflictCount
            }
            attention={
              pendingLinkCount +
                conflictCount >
              0
            }
          />
        </div>
      </div>

      {/* =====================================================
          VISÃO GERAL
      ====================================================== */}

      {view ===
        "overview" && (
        <OverviewView
          submittedCount={
            submittedCount
          }
          reviewCount={
            reviewCount
          }
          approvalCount={
            approvalCount
          }
          cardsInUseCount={
            cardsInUseCount
          }
          awaitingReturnCount={
            awaitingReturnCount
          }
          siengeCount={
            allSienge.length
          }
          siengeDeliveryCount={
            siengeDeliveryCount
          }
          linkedCount={
            linkedCount
          }
          pendingLinkCount={
            pendingLinkCount
          }
          conflictCount={
            conflictCount
          }
          links={
            allLinks
          }
          cardMap={
            cardMap
          }
          profileMap={
            profileMap
          }
        />
      )}

      {/* =====================================================
          CARTÕES
      ====================================================== */}

      {view ===
        "cards" && (
        <CardsView
          requests={
            cards
          }
          profileMap={
            profileMap
          }
          linkByCardRequest={
            linkByCardRequest
          }
          search={
            search
          }
          status={
            status
          }
        />
      )}

      {/* =====================================================
          SIENGE
      ====================================================== */}

      {view ===
        "sienge" && (
        <SiengeView
          requests={
            siengeRequests
          }
          search={
            search
          }
        />
      )}

      {/* =====================================================
          CONCILIAÇÃO
      ====================================================== */}

      {view ===
        "reconciliation" && (
        <ReconciliationView
          links={
            reconciliations
          }
          cardMap={
            cardMap
          }
          profileMap={
            profileMap
          }
          search={
            search
          }
          linkStatus={
            linkStatus
          }
        />
      )}
    </div>
  );
}

// ============================================================
// VISÃO GERAL
// ============================================================

function OverviewView({
  submittedCount,
  reviewCount,
  approvalCount,
  cardsInUseCount,
  awaitingReturnCount,
  siengeCount,
  siengeDeliveryCount,
  linkedCount,
  pendingLinkCount,
  conflictCount,
  links,
  cardMap,
  profileMap,
}: {
  submittedCount: number;
  reviewCount: number;
  approvalCount: number;
  cardsInUseCount: number;
  awaitingReturnCount: number;
  siengeCount: number;
  siengeDeliveryCount: number;
  linkedCount: number;
  pendingLinkCount: number;
  conflictCount: number;

  links:
    CardSiengeLinkRow[];

  cardMap:
    Map<
      string,
      CardRequestRow
    >;

  profileMap:
    Map<
      string,
      ProfileRow
    >;
}) {
  const attentionLinks =
    links
      .filter(
        (
          link
        ) =>
          link.link_status !==
          "linked"
      )
      .slice(
        0,
        6
      );

  return (
    <div className="space-y-6">
      {/* =====================================================
          INDICADORES OPERACIONAIS
      ====================================================== */}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Operação de Cartões
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Solicitações que estão passando pelo fluxo financeiro.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            icon={
              FileSearch
            }
            label="Novas"
            value={
              submittedCount
            }
          />

          <SummaryCard
            icon={
              Clock3
            }
            label="Em análise"
            value={
              reviewCount
            }
          />

          <SummaryCard
            icon={
              ShieldCheck
            }
            label="Aguardando aprovação"
            value={
              approvalCount
            }
          />

          <SummaryCard
            icon={
              CreditCard
            }
            label="Em utilização"
            value={
              cardsInUseCount
            }
          />

          <SummaryCard
            icon={
              TriangleAlert
            }
            label="Aguardando devolução"
            value={
              awaitingReturnCount
            }
            attention={
              awaitingReturnCount >
              0
            }
          />
        </div>
      </section>

      {/* =====================================================
          SIENGE E CONCILIAÇÃO
      ====================================================== */}

      <section>
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Sienge e Conciliação
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Acompanhamento das importações e vínculos com
            solicitações de cartão.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            icon={
              ShoppingCart
            }
            label="Solicitações Sienge"
            value={
              siengeCount
            }
          />

          <SummaryCard
            icon={
              PackageSearch
            }
            label="Compra / Entrega"
            value={
              siengeDeliveryCount
            }
          />

          <SummaryCard
            icon={
              CheckCircle2
            }
            label="Vínculos confirmados"
            value={
              linkedCount
            }
          />

          <SummaryCard
            icon={
              Clock3
            }
            label="Aguardando vínculo"
            value={
              pendingLinkCount
            }
            attention={
              pendingLinkCount >
              0
            }
          />

          <SummaryCard
            icon={
              AlertTriangle
            }
            label="Revisar vínculos"
            value={
              conflictCount
            }
            danger={
              conflictCount >
              0
            }
          />
        </div>
      </section>

      {/* =====================================================
          AÇÕES NECESSÁRIAS
      ====================================================== */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">
              Conciliações que precisam de atenção
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Solicitações de cartão com Número Sienge ainda não
              totalmente conciliado.
            </p>
          </div>

          <Link
            href="/financeiro/solicitacoes?view=reconciliation"
            className="text-xs font-semibold text-[#AF1B1B] hover:underline"
          >
            Ver todas
          </Link>
        </div>

        {attentionLinks.length ===
        0 ? (
          <div className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
            <CheckCircle2
              size={
                26
              }
              className="text-emerald-500"
            />

            <p className="mt-3 text-sm font-semibold text-slate-700">
              Nenhuma conciliação pendente
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Os vínculos Cartão × Sienge estão regularizados.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {attentionLinks.map(
              (
                link
              ) => {
                const card =
                  cardMap.get(
                    link.card_request_id
                  );

                const requester =
                  card
                    ?.requester_id
                    ? profileMap.get(
                        card.requester_id
                      )
                    : null;

                return (
                  <Link
                    key={
                      link.id
                    }
                    href="/financeiro/solicitacoes?view=reconciliation"
                    className="flex flex-col gap-3 px-6 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#AF1B1B]">
                          {card?.request_number ??
                            "Solicitação"}
                        </span>

                        <LinkStatusBadge
                          status={
                            link.link_status
                          }
                        />
                      </div>

                      <p className="mt-2 text-sm font-semibold text-slate-800">
                        {card?.purpose ??
                          "Solicitação de cartão"}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {requester?.full_name ??
                          "Solicitante não identificado"}
                        {" · "}
                        Sienge{" "}
                        {
                          link.sienge_request_number
                        }
                      </p>
                    </div>

                    <ArrowRight
                      size={
                        17
                      }
                      className="text-slate-400"
                    />
                  </Link>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* =====================================================
          ACESSOS RÁPIDOS
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-3">
        <QuickAccessCard
          icon={
            CreditCard
          }
          title="Solicitações de cartão"
          description="Analisar solicitações, liberar cartões e acompanhar devoluções."
          href="/financeiro/solicitacoes?view=cards"
        />

        <QuickAccessCard
          icon={
            ShoppingCart
          }
          title="Acompanhamento Sienge"
          description="Consultar solicitações importadas e realizar novas importações."
          href="/financeiro/sienge"
        />

        <QuickAccessCard
          icon={
            Link2
          }
          title="Conciliação"
          description="Verificar vínculos entre devoluções de cartão e solicitações do Sienge."
          href="/financeiro/solicitacoes?view=reconciliation"
        />
      </div>
    </div>
  );
}

// ============================================================
// CARTÕES
// ============================================================

function CardsView({
  requests,
  profileMap,
  linkByCardRequest,
  search,
  status,
}: {
  requests:
    CardRequestRow[];

  profileMap:
    Map<
      string,
      ProfileRow
    >;

  linkByCardRequest:
    Map<
      string,
      CardSiengeLinkRow
    >;

  search:
    string;

  status:
    string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="font-semibold text-slate-950">
            Solicitações de cartão
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Fluxo operacional de solicitação, utilização e
            devolução de cartões.
          </p>
        </div>

        <form
          method="get"
          className="grid gap-3 lg:grid-cols-[1fr_260px_auto]"
        >
          <input
            type="hidden"
            name="view"
            value="cards"
          />

          <SearchField
            defaultValue={
              search
            }
            placeholder="Buscar por solicitação, Sienge, obra ou fornecedor..."
          />

          <select
            name="status"
            defaultValue={
              status
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
          >
            {cardStatusOptions.map(
              (
                option
              ) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {
                    option.label
                  }
                </option>
              )
            )}
          </select>

          <FilterButton />
        </form>
      </div>

      <ResultCount
        value={
          requests.length
        }
      />

      {requests.length ===
      0 ? (
        <EmptyState
          icon={
            CreditCard
          }
          title="Nenhuma solicitação encontrada"
          description="Nenhuma solicitação de cartão corresponde aos filtros informados."
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {requests.map(
            (
              request
            ) => {
              const requester =
                request.requester_id
                  ? profileMap.get(
                      request.requester_id
                    )
                  : null;

              const reconciliation =
                linkByCardRequest.get(
                  request.id
                );

              return (
                <Link
                  key={
                    request.id
                  }
                  href={`/financeiro/solicitacoes/${request.id}`}
                  className="group block px-6 py-5 transition hover:bg-slate-50/70"
                >
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-center">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-[#AF1B1B]">
                          {request.request_number ??
                            "-"}
                        </span>

                        <CardRequestStatus
                          status={
                            request.status
                          }
                        />

                        {reconciliation && (
                          <LinkStatusBadge
                            status={
                              reconciliation.link_status
                            }
                          />
                        )}
                      </div>

                      <h3 className="mt-2 truncate text-sm font-semibold text-slate-900">
                        {request.purpose ??
                          "Solicitação de cartão"}
                      </h3>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                        <span>
                          Solicitante:{" "}
                          {requester?.full_name ??
                            "Não identificado"}
                        </span>

                        <span>
                          Sienge:{" "}
                          {request.sienge_request_number ??
                            "-"}
                        </span>

                        <span>
                          {request.cost_center_or_site ??
                            "-"}
                        </span>

                        <span>
                          {formatDate(
                            request.request_date
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-6 xl:justify-end">
                      <div className="xl:text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                          Valor solicitado
                        </p>

                        <p className="mt-1 text-sm font-semibold text-slate-800">
                          {formatCurrency(
                            request.estimated_amount
                          )}
                        </p>

                        {request.approved_amount !==
                          null && (
                          <p className="mt-1 text-[11px] font-medium text-emerald-600">
                            Aprovado:{" "}
                            {formatCurrency(
                              request.approved_amount
                            )}
                          </p>
                        )}
                      </div>

                      <div className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition group-hover:bg-white group-hover:text-[#AF1B1B]">
                        <ArrowRight
                          size={
                            18
                          }
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

// ============================================================
// SIENGE
// ============================================================

function SiengeView({
  requests,
  search,
}: {
  requests:
    SiengeRequestRow[];

  search:
    string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">
              Solicitações do Sienge
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Solicitações disponíveis a partir da máscara
              importada pelo Financeiro.
            </p>
          </div>

          <Link
            href="/financeiro/sienge"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Abrir Acompanhamento Sienge
          </Link>
        </div>

        <form
          method="get"
          className="mt-5 grid gap-3 lg:grid-cols-[1fr_auto]"
        >
          <input
            type="hidden"
            name="view"
            value="sienge"
          />

          <SearchField
            defaultValue={
              search
            }
            placeholder="Buscar por SC, solicitante ou centro de custo..."
          />

          <FilterButton />
        </form>
      </div>

      <ResultCount
        value={
          requests.length
        }
      />

      {requests.length ===
      0 ? (
        <EmptyState
          icon={
            ShoppingCart
          }
          title="Nenhuma solicitação encontrada"
          description="Nenhum registro do Sienge corresponde à busca informada."
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {requests.map(
            (
              request
            ) => (
              <Link
                key={
                  request.request_key
                }
                href={`/financeiro/sienge/${encodeURIComponent(
                  request.request_key
                )}`}
                className="group block px-6 py-5 transition hover:bg-slate-50/70"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold text-[#AF1B1B]">
                        SC{" "}
                        {request.sc_number ??
                          "-"}
                      </span>

                      <SiengeStatusBadge
                        status={
                          request.tracking_status ??
                          "Solicitação recebida"
                        }
                      />
                    </div>

                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {request.cost_center_or_site ??
                        "Centro de custo / obra não informado"}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                      <span>
                        Solicitante:{" "}
                        {request.requester_sienge_username ??
                          "Não identificado"}
                      </span>

                      <span>
                        {Number(
                          request.items_count ??
                            0
                        )}{" "}
                        itens
                      </span>

                      <span>
                        {Number(
                          request.orders_count ??
                            0
                        )}{" "}
                        pedidos
                      </span>

                      <span>
                        Solicitação:{" "}
                        {formatDate(
                          request.request_date
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-7">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                        Próxima previsão
                      </p>

                      <p className="mt-1 text-sm font-semibold text-slate-800">
                        {formatDate(
                          request.next_delivery_forecast
                        )}
                      </p>
                    </div>

                    <ArrowRight
                      size={
                        18
                      }
                      className="text-slate-400 transition group-hover:text-[#AF1B1B]"
                    />
                  </div>
                </div>
              </Link>
            )
          )}
        </div>
      )}
    </section>
  );
}

// ============================================================
// CONCILIAÇÃO
// ============================================================

function ReconciliationView({
  links,
  cardMap,
  profileMap,
  search,
  linkStatus,
}: {
  links:
    CardSiengeLinkRow[];

  cardMap:
    Map<
      string,
      CardRequestRow
    >;

  profileMap:
    Map<
      string,
      ProfileRow
    >;

  search:
    string;

  linkStatus:
    string;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-5 sm:p-6">
        <div>
          <h2 className="font-semibold text-slate-950">
            Conciliação Cartão × Sienge
          </h2>

          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            Verifique se o Número Sienge informado na devolução do
            cartão foi localizado e vinculado corretamente à
            solicitação importada.
          </p>
        </div>

        <form
          method="get"
          className="mt-5 grid gap-3 lg:grid-cols-[1fr_260px_auto]"
        >
          <input
            type="hidden"
            name="view"
            value="reconciliation"
          />

          <SearchField
            defaultValue={
              search
            }
            placeholder="Buscar por REQ, Sienge ou solicitante..."
          />

          <select
            name="linkStatus"
            defaultValue={
              linkStatus
            }
            className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
          >
            {linkStatusOptions.map(
              (
                option
              ) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {
                    option.label
                  }
                </option>
              )
            )}
          </select>

          <FilterButton />
        </form>
      </div>

      <ResultCount
        value={
          links.length
        }
      />

      {links.length ===
      0 ? (
        <EmptyState
          icon={
            Link2
          }
          title="Nenhuma conciliação encontrada"
          description="Nenhum vínculo corresponde aos filtros informados."
        />
      ) : (
        <div className="divide-y divide-slate-100">
          {links.map(
            (
              link
            ) => {
              const card =
                cardMap.get(
                  link.card_request_id
                );

              const requester =
                card
                  ?.requester_id
                  ? profileMap.get(
                      card.requester_id
                    )
                  : null;

              return (
                <div
                  key={
                    link.id
                  }
                  className="px-6 py-5"
                >
                  <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={
                            card
                              ? `/financeiro/solicitacoes/${card.id}`
                              : "#"
                          }
                          className="text-xs font-bold text-[#AF1B1B] hover:underline"
                        >
                          {card?.request_number ??
                            "Solicitação"}
                        </Link>

                        <LinkStatusBadge
                          status={
                            link.link_status
                          }
                        />
                      </div>

                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {card?.purpose ??
                          "Solicitação de cartão"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-400">
                        <span>
                          Solicitante do cartão:{" "}
                          {requester?.full_name ??
                            "Não identificado"}
                        </span>

                        <span>
                          Nº Sienge:{" "}
                          {
                            link.sienge_request_number
                          }
                        </span>

                        {link.sienge_requester_username && (
                          <span>
                            Solicitante Sienge:{" "}
                            {
                              link.sienge_requester_username
                            }
                          </span>
                        )}
                      </div>

                      {link.conflict_reason && (
                        <div className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                          <AlertTriangle
                            size={
                              17
                            }
                            className="mt-0.5 shrink-0 text-red-600"
                          />

                          <div>
                            <p className="text-xs font-semibold text-red-800">
                              Revisão necessária
                            </p>

                            <p className="mt-1 text-[11px] leading-5 text-red-700">
                              {
                                link.conflict_reason
                              }
                            </p>
                          </div>
                        </div>
                      )}

                      {[
                        "pending",
                        "not_found",
                      ].includes(
                        link.link_status
                      ) && (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-xs font-semibold text-amber-800">
                            Aguardando importação do Sienge
                          </p>

                          <p className="mt-1 text-[11px] leading-5 text-amber-700">
                            O Número Sienge já foi informado na
                            devolução. O sistema tentará realizar o
                            vínculo automaticamente nas próximas
                            importações.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2">
                      {card && (
                        <Link
                          href={`/financeiro/solicitacoes/${card.id}`}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                          Ver cartão
                        </Link>
                      )}

                      {link.sienge_request_key && (
                        <Link
                          href={`/financeiro/sienge/${encodeURIComponent(
                            link.sienge_request_key
                          )}`}
                          className="inline-flex h-9 items-center justify-center rounded-lg bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800"
                        >
                          Ver Sienge
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

// ============================================================
// COMPONENTES
// ============================================================

function ViewTab({
  href,
  active,
  icon:
    Icon,
  label,
  count,
  attention = false,
}: {
  href: string;

  active: boolean;

  icon:
    ElementType;

  label: string;

  count?: number;

  attention?: boolean;
}) {
  return (
    <Link
      href={
        href
      }
      className={[
        "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition",
        active
          ? "bg-slate-900 text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
      ].join(
        " "
      )}
    >
      <Icon
        size={
          16
        }
      />

      {
        label
      }

      {count !==
        undefined && (
        <span
          className={[
            "rounded-full px-2 py-0.5 text-[10px]",
            active
              ? "bg-white/15 text-white"
              : attention
                ? "bg-red-50 text-red-600"
                : "bg-slate-100 text-slate-500",
          ].join(
            " "
          )}
        >
          {
            count
          }
        </span>
      )}
    </Link>
  );
}

function SearchField({
  defaultValue,
  placeholder,
}: {
  defaultValue: string;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search
        size={
          17
        }
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />

      <input
        name="q"
        defaultValue={
          defaultValue
        }
        placeholder={
          placeholder
        }
        className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
      />
    </div>
  );
}

function FilterButton() {
  return (
    <button
      type="submit"
      className="h-11 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
    >
      Filtrar
    </button>
  );
}

function ResultCount({
  value,
}: {
  value:
    number;
}) {
  return (
    <div className="border-b border-slate-100 px-6 py-4">
      <p className="text-xs text-slate-500">
        {value} registro
        {value ===
        1
          ? ""
          : "s"}{" "}
        encontrado
        {value ===
        1
          ? ""
          : "s"}.
      </p>
    </div>
  );
}

function EmptyState({
  icon:
    Icon,
  title,
  description,
}: {
  icon:
    ElementType;

  title:
    string;

  description:
    string;
}) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon
          size={
            24
          }
        />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-700">
        {
          title
        }
      </p>

      <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
        {
          description
        }
      </p>
    </div>
  );
}

function SummaryCard({
  icon:
    Icon,
  label,
  value,
  attention = false,
  danger = false,
}: {
  icon:
    ElementType;

  label:
    string;

  value:
    number;

  attention?:
    boolean;

  danger?:
    boolean;
}) {
  const tone =
    danger
      ? "bg-red-50 text-red-600"
      : attention
        ? "bg-amber-50 text-amber-600"
        : "bg-slate-100 text-slate-500";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-xl",
          tone,
        ].join(
          " "
        )}
      >
        <Icon
          size={
            19
          }
        />
      </div>

      <p className="mt-4 text-2xl font-semibold text-slate-950">
        {
          value
        }
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {
          label
        }
      </p>
    </div>
  );
}

function QuickAccessCard({
  icon:
    Icon,
  title,
  description,
  href,
}: {
  icon:
    ElementType;

  title:
    string;

  description:
    string;

  href:
    string;
}) {
  return (
    <Link
      href={
        href
      }
      className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-[#AF1B1B]/10 group-hover:text-[#AF1B1B]">
        <Icon
          size={
            19
          }
        />
      </div>

      <p className="mt-4 text-sm font-semibold text-slate-900">
        {
          title
        }
      </p>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        {
          description
        }
      </p>

      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-[#AF1B1B]">
        Acessar
        <ArrowRight
          size={
            14
          }
        />
      </div>
    </Link>
  );
}

// ============================================================
// STATUS CONCILIAÇÃO
// ============================================================

function LinkStatusBadge({
  status,
}: {
  status:
    string;
}) {
  switch (
    status
  ) {
    case "linked":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">
          <CheckCircle2
            size={
              11
            }
          />
          Sienge vinculado
        </span>
      );

    case "conflict":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-[10px] font-semibold text-red-700">
          <AlertTriangle
            size={
              11
            }
          />
          Revisar vínculo
        </span>
      );

    case "not_found":
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
          <Unlink
            size={
              11
            }
          />
          SC não localizada
        </span>
      );

    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-700">
          <Clock3
            size={
              11
            }
          />
          Aguardando vínculo
        </span>
      );
  }
}

// ============================================================
// STATUS SIENGE
// ============================================================

function SiengeStatusBadge({
  status,
}: {
  status:
    string;
}) {
  const style =
    status ===
    "Entregue"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : [
            "Disponível para retirada",
            "Em processo de entrega",
          ].includes(
            status
          )
        ? "border-blue-200 bg-blue-50 text-blue-700"
        : [
              "Compra realizada",
              "Compra via cartão",
            ].includes(
              status
            )
          ? "border-violet-200 bg-violet-50 text-violet-700"
          : [
                "Em aprovação",
                "Em cotação",
              ].includes(
                status
              )
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={[
        "rounded-full border px-2.5 py-1 text-[10px] font-semibold",
        style,
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