import Link from "next/link";

import {
  redirect,
} from "next/navigation";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileSpreadsheet,
  ListTodo,
  PackageCheck,
  PackageSearch,
  Plus,
  ReceiptText,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
  UserRoundX,
  UsersRound,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  MotionReveal,
  MotionStagger,
  MotionStaggerItem,
} from "@/components/ui/motion";

import AnimatedNumber from "@/components/ui/projeta/animated-number";

// ============================================================
// TIPOS
// ============================================================

type ProfileRow = {
  full_name:
    | string
    | null;

  email:
    | string
    | null;
};

type NotificationRow = {
  id: string;

  title: string;

  message:
    | string
    | null;

  level:
    | string
    | null;

  action_url:
    | string
    | null;

  created_at: string;
};

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

  conflict_reason:
    | string
    | null;
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

type SlaRow = {
  item_id: string;

  sc_number:
    | string
    | null;

  tracking_status:
    | string
    | null;

  sla_status:
    | string
    | null;
};

type SiengeUserRow = {
  requester_sienge_username:
    | string
    | null;

  requester_profile_id:
    | string
    | null;
};

type UserStage =
  | "action"
  | "progress"
  | "completed";

type UserProcess = {
  key: string;

  type:
    | "card"
    | "purchase"
    | "combined";

  stage: UserStage;

  number: string;

  scNumber:
    | string
    | null;

  title: string;

  status: string;

  description: string;

  href: string;

  actionLabel: string;

  date:
    | string
    | null;

  sortDate: string;
};

type PriorityItem = {
  icon: LucideIcon;

  title: string;

  description: string;

  count: number;

  href: string;

  tone:
    | "error"
    | "warning"
    | "neutral";
};

// ============================================================
// PAGE
// ============================================================

export default async function DashboardPage() {
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
  // PERFIL + PAPÉIS
  // =========================================================

  const [
    profileResult,
    rolesResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "profiles"
        )
        .select(
          `
          full_name,
          email
          `
        )
        .eq(
          "id",
          userId
        )
        .maybeSingle(),

      supabase
        .from(
          "user_roles"
        )
        .select(
          "role"
        )
        .eq(
          "user_id",
          userId
        ),
    ]);

  const profile =
    profileResult.data as
      | ProfileRow
      | null;

  const roles =
    (
      rolesResult.data ??
      []
    ).map(
      (
        item
      ) =>
        String(
          item.role
        )
    );

  const canFinance =
    roles.includes(
      "finance"
    ) ||
    roles.includes(
      "admin"
    ) ||
    roles.includes(
      "superadmin"
    );

  const canAdmin =
    roles.includes(
      "admin"
    ) ||
    roles.includes(
      "superadmin"
    );

  const fullName =
    profile
      ?.full_name
      ?.trim() ||
    "Usuário";

  const firstName =
    fullName
      .split(
        /\s+/
      )
      .filter(
        Boolean
      )[0] ??
    "Usuário";

  const today =
    formatCurrentDate();

  // =========================================================
  // DASHBOARD FINANCEIRO
  // =========================================================

  if (
    canFinance
  ) {
    const [
      cardsResult,
      siengeResult,
      linksResult,
      slaResult,
      siengeUsersResult,
      notificationsResult,
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
          .is(
            "deleted_at",
            null
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
            conflict_reason
            `
          ),

        supabase
          .from(
            "v_sienge_item_sla"
          )
          .select(
            `
            item_id,
            sc_number,
            tracking_status,
            sla_status
            `
          ),

        supabase
          .from(
            "sienge_purchase_items"
          )
          .select(
            `
            requester_sienge_username,
            requester_profile_id
            `
          )
          .not(
            "requester_sienge_username",
            "is",
            null
          ),

        supabase
          .from(
            "system_notifications"
          )
          .select(
            `
            id,
            title,
            message,
            level,
            action_url,
            created_at
            `
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            }
          )
          .limit(
            6
          ),
      ]);

    logQueryError(
      "solicitações de cartão",
      cardsResult.error
    );

    logQueryError(
      "solicitações Sienge",
      siengeResult.error
    );

    logQueryError(
      "conciliações",
      linksResult.error
    );

    logQueryError(
      "SLA",
      slaResult.error
    );

    logQueryError(
      "usuários Sienge",
      siengeUsersResult.error
    );

    logQueryError(
      "notificações",
      notificationsResult.error
    );

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

    const links =
      (
        linksResult.data ??
        []
      ) as CardSiengeLinkRow[];

    const slaRows =
      (
        slaResult.data ??
        []
      ) as SlaRow[];

    const siengeUsers =
      (
        siengeUsersResult.data ??
        []
      ) as SiengeUserRow[];

    const notifications =
      (
        notificationsResult.data ??
        []
      ) as NotificationRow[];

    // =======================================================
    // INDICADORES FINANCEIROS
    // =======================================================

    const submittedCount =
      cards.filter(
        (
          request
        ) =>
          request.status ===
          "submitted"
      ).length;

    const reviewCount =
      cards.filter(
        (
          request
        ) =>
          request.status ===
          "under_review"
      ).length;

    const approvalCount =
      cards.filter(
        (
          request
        ) =>
          request.status ===
          "awaiting_approval"
      ).length;

    const inUseCount =
      cards.filter(
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

    const awaitingReturnCount =
      cards.filter(
        (
          request
        ) =>
          request.status ===
          "awaiting_return"
      ).length;

    const conferenceCount =
      cards.filter(
        (
          request
        ) =>
          request.status ===
          "accountability_review"
      ).length;

    const conflictCount =
      links.filter(
        (
          link
        ) =>
          link.link_status ===
          "conflict"
      ).length;

    const pendingLinkCount =
      links.filter(
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

    const linkedCount =
      links.filter(
        (
          link
        ) =>
          link.link_status ===
          "linked"
      ).length;

    const overdueCount =
      slaRows.filter(
        (
          item
        ) =>
          item.sla_status ===
          "overdue"
      ).length;

    const warningCount =
      slaRows.filter(
        (
          item
        ) =>
          item.sla_status ===
          "warning"
      ).length;

    const onTimeCount =
      slaRows.filter(
        (
          item
        ) =>
          item.sla_status ===
          "on_time"
      ).length;

    const activeSlaCount =
      onTimeCount +
      warningCount +
      overdueCount;

    const onTimeRate =
      activeSlaCount >
      0
        ? Math.round(
            (
              onTimeCount /
              activeSlaCount
            ) *
              100
          )
        : 100;

    const purchaseDeliveryCount =
      siengeRequests.filter(
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

    const unmatchedUsers =
      new Set(
        siengeUsers
          .filter(
            (
              item
            ) =>
              item
                .requester_sienge_username &&
              !item
                .requester_profile_id
          )
          .map(
            (
              item
            ) =>
              normalize(
                item
                  .requester_sienge_username
              )
          )
          .filter(
            Boolean
          )
      ).size;

    const priorities:
      PriorityItem[] = [
      {
        icon:
          FileSpreadsheet,

        title:
          "Novas solicitações",

        description:
          "Solicitações de cartão aguardando início da análise.",

        count:
          submittedCount,

        href:
          "/financeiro/solicitacoes?view=cards&status=submitted",

        tone:
          "neutral",
      },

      {
        icon:
          Truck,

        title:
          "Cartões aguardando devolução",

        description:
          "Solicitantes precisam realizar a devolução do cartão.",

        count:
          awaitingReturnCount,

        href:
          "/financeiro/solicitacoes?view=cards&status=awaiting_return",

        tone:
          "warning",
      },

      {
        icon:
          AlertTriangle,

        title:
          "Conciliações para revisar",

        description:
          "Vínculos Cartão × Sienge com divergências.",

        count:
          conflictCount,

        href:
          "/financeiro/solicitacoes?view=reconciliation&linkStatus=conflict",

        tone:
          "error",
      },

      {
        icon:
          Clock3,

        title:
          "Aguardando vínculo Sienge",

        description:
          "Número Sienge informado, mas ainda não conciliado.",

        count:
          pendingLinkCount,

        href:
          "/financeiro/solicitacoes?view=reconciliation",

        tone:
          "warning",
      },

      {
        icon:
          ListTodo,

        title:
          "Itens com SLA vencido",

        description:
          "Itens do acompanhamento Sienge fora do prazo.",

        count:
          overdueCount,

        href:
          "/pendencias",

        tone:
          "error",
      },
    ];

    return (
      <FinanceDashboard
        firstName={
          firstName
        }
        today={
          today
        }
        cardsCount={
          cards.length
        }
        siengeCount={
          siengeRequests.length
        }
        submittedCount={
          submittedCount
        }
        reviewCount={
          reviewCount
        }
        approvalCount={
          approvalCount
        }
        inUseCount={
          inUseCount
        }
        awaitingReturnCount={
          awaitingReturnCount
        }
        conferenceCount={
          conferenceCount
        }
        conflictCount={
          conflictCount
        }
        pendingLinkCount={
          pendingLinkCount
        }
        linkedCount={
          linkedCount
        }
        purchaseDeliveryCount={
          purchaseDeliveryCount
        }
        overdueCount={
          overdueCount
        }
        warningCount={
          warningCount
        }
        onTimeCount={
          onTimeCount
        }
        onTimeRate={
          onTimeRate
        }
        unmatchedUsers={
          unmatchedUsers
        }
        priorities={
          priorities
        }
        notifications={
          notifications
        }
        canAdmin={
          canAdmin
        }
      />
    );
  }

  // =========================================================
  // DASHBOARD DO SOLICITANTE
  // =========================================================

  const [
    cardsResult,
    siengeResult,
    itemsResult,
    notificationsResult,
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
        ),

      supabase
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
        ),

      supabase
        .from(
          "system_notifications"
        )
        .select(
          `
          id,
          title,
          message,
          level,
          action_url,
          created_at
          `
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          5
        ),
    ]);

  logQueryError(
    "cartões do usuário",
    cardsResult.error
  );

  logQueryError(
    "pedidos Sienge do usuário",
    siengeResult.error
  );

  logQueryError(
    "itens Sienge do usuário",
    itemsResult.error
  );

  logQueryError(
    "notificações do usuário",
    notificationsResult.error
  );

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

  const siengeItems =
    (
      itemsResult.data ??
      []
    ) as SiengeItemRow[];

  const notifications =
    (
      notificationsResult.data ??
      []
    ) as NotificationRow[];

  // =========================================================
  // VÍNCULOS DO PRÓPRIO USUÁRIO
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
      data,
      error,
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
          link_status,
          conflict_reason
          `
        )
        .in(
          "card_request_id",
          cardIds
        );

    logQueryError(
      "vínculos do usuário",
      error
    );

    links =
      (
        data ??
        []
      ) as CardSiengeLinkRow[];
  }

  // =========================================================
  // CONFIRMAÇÕES DE RECEBIMENTO
  // =========================================================

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
      data,
      error,
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

    logQueryError(
      "confirmações de recebimento",
      error
    );

    confirmations =
      (
        data ??
        []
      ) as DeliveryConfirmationRow[];
  }

  // =========================================================
  // RECEBIMENTOS PENDENTES
  // =========================================================

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

  const receiptPendingScs =
    new Set<string>();

  for (
    const item
    of siengeItems
  ) {
    if (
      normalize(
        item.delivery_status
      ) !==
      "ENTREGUE"
    ) {
      continue;
    }

    const confirmation =
      confirmationByItem.get(
        item.id
      );

    if (
      normalize(
        confirmation
          ?.delivery_status
      ) !==
      "ENTREGUE"
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
  // UNIFICAR CARTÃO + SIENGE
  // =========================================================

  const linkByCard =
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

  const linkedSiengeKeys =
    new Set<string>();

  const processes:
    UserProcess[] = [];

  for (
    const card
    of cards
  ) {
    const link =
      linkByCard.get(
        card.id
      );

    const sienge =
      link
        ?.link_status ===
          "linked" &&
        link.sienge_request_key
          ? siengeByKey.get(
              link.sienge_request_key
            ) ??
            null
          : null;

    if (
      sienge
    ) {
      linkedSiengeKeys.add(
        sienge.request_key
      );
    }

    const scNumber =
      sienge?.sc_number ??
      card.sienge_request_number ??
      null;

    const receiptPending =
      Boolean(
        scNumber &&
        receiptPendingScs.has(
          normalize(
            scNumber
          )
        )
      );

    const cardNeedsAction =
      [
        "awaiting_information",
        "awaiting_return",
      ].includes(
        card.status
      );

    let stage:
      UserStage =
      "progress";

    if (
      cardNeedsAction ||
      receiptPending
    ) {
      stage =
        "action";
    } else if (
      sienge
    ) {
      stage =
        normalize(
          sienge.tracking_status
        ) ===
        "ENTREGUE"
          ? "completed"
          : "progress";
    } else if (
      [
        "completed",
        "cancelled",
        "rejected",
      ].includes(
        card.status
      )
    ) {
      stage =
        "completed";
    }

    let status =
      getCardStatusLabel(
        card.status
      );

    let description =
      getCardDescription(
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
      receiptPending &&
      sienge
    ) {
      status =
        "Recebimento aguardando confirmação";

      description =
        "O material foi entregue e precisa da sua confirmação.";

      href =
        `/meus-pedidos/${encodeURIComponent(
          sienge.request_key
        )}`;

      actionLabel =
        "Confirmar recebimento";
    } else if (
      sienge
    ) {
      status =
        sienge.tracking_status ??
        status;

      description =
        getSiengeDescription(
          sienge.tracking_status
        );

      href =
        `/meus-pedidos/${encodeURIComponent(
          sienge.request_key
        )}`;

      actionLabel =
        "Acompanhar";
    }

    processes.push({
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

      status,

      description,

      href,

      actionLabel,

      date:
        card.request_date ??
        card.created_at,

      sortDate:
        card.updated_at ??
        card.created_at ??
        card.request_date ??
        "",
    });
  }

  // =========================================================
  // SIENGE SEM CARTÃO
  // =========================================================

  for (
    const request
    of siengeRequests
  ) {
    if (
      linkedSiengeKeys.has(
        request.request_key
      )
    ) {
      continue;
    }

    const receiptPending =
      Boolean(
        request.sc_number &&
        receiptPendingScs.has(
          normalize(
            request.sc_number
          )
        )
      );

    const delivered =
      normalize(
        request.tracking_status
      ) ===
      "ENTREGUE";

    const stage:
      UserStage =
      receiptPending
        ? "action"
        : delivered
          ? "completed"
          : "progress";

    processes.push({
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

      status:
        receiptPending
          ? "Recebimento aguardando confirmação"
          : request.tracking_status ??
            "Em acompanhamento",

      description:
        receiptPending
          ? "O material foi entregue e precisa da sua confirmação."
          : getSiengeDescription(
              request.tracking_status
            ),

      href:
        `/meus-pedidos/${encodeURIComponent(
          request.request_key
        )}`,

      actionLabel:
        receiptPending
          ? "Confirmar recebimento"
          : "Acompanhar",

      date:
        request.request_date,

      sortDate:
        request.request_date ??
        "",
    });
  }

  // =========================================================
  // ORDENAR
  // =========================================================

  const stageWeight:
    Record<
      UserStage,
      number
    > = {
    action: 0,
    progress: 1,
    completed: 2,
  };

  processes.sort(
    (
      a,
      b
    ) => {
      const byStage =
        stageWeight[
          a.stage
        ] -
        stageWeight[
          b.stage
        ];

      if (
        byStage !==
        0
      ) {
        return byStage;
      }

      return b.sortDate.localeCompare(
        a.sortDate
      );
    }
  );

  const actionCount =
    processes.filter(
      (
        item
      ) =>
        item.stage ===
        "action"
    ).length;

  const progressCount =
    processes.filter(
      (
        item
      ) =>
        item.stage ===
        "progress"
    ).length;

  const completedCount =
    processes.filter(
      (
        item
      ) =>
        item.stage ===
        "completed"
    ).length;

  return (
    <UserDashboard
      firstName={
        firstName
      }
      today={
        today
      }
      actionCount={
        actionCount
      }
      progressCount={
        progressCount
      }
      completedCount={
        completedCount
      }
      processes={
        processes
      }
      notifications={
        notifications
      }
    />
  );
}

// ============================================================
// DASHBOARD FINANCEIRO
// ============================================================

function FinanceDashboard({
  firstName,
  today,
  cardsCount,
  siengeCount,
  submittedCount,
  reviewCount,
  approvalCount,
  inUseCount,
  awaitingReturnCount,
  conferenceCount,
  conflictCount,
  pendingLinkCount,
  linkedCount,
  purchaseDeliveryCount,
  overdueCount,
  warningCount,
  onTimeCount,
  onTimeRate,
  unmatchedUsers,
  priorities,
  notifications,
  canAdmin,
}: {
  firstName: string;
  today: string;

  cardsCount: number;
  siengeCount: number;
  submittedCount: number;
  reviewCount: number;
  approvalCount: number;
  inUseCount: number;
  awaitingReturnCount: number;
  conferenceCount: number;
  conflictCount: number;
  pendingLinkCount: number;
  linkedCount: number;
  purchaseDeliveryCount: number;
  overdueCount: number;
  warningCount: number;
  onTimeCount: number;
  onTimeRate: number;
  unmatchedUsers: number;

  priorities:
    PriorityItem[];

  notifications:
    NotificationRow[];

  canAdmin: boolean;
}) {
  const activePriorityCount =
    priorities.reduce(
      (
        total,
        item
      ) =>
        total +
        item.count,
      0
    );

  return (
    <main className="projeta-page">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <MotionReveal>
        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="projeta-section-label text-primary">
              Operação financeira
            </p>

            <h1 className="mt-3 text-[28px] font-[700] tracking-[-0.05em] text-base-content sm:text-[32px]">
              Olá, {firstName}.
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-base-content/40">
              <span>
                {today}
              </span>

              <span className="h-1 w-1 rounded-full bg-base-content/20" />

              <span>
                Veja onde a operação precisa de atenção hoje.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/financeiro/sienge"
              className="btn btn-ghost btn-sm h-10 rounded-xl border border-base-300 bg-base-100 px-4"
            >
              <FileSpreadsheet
                size={
                  15
                }
              />

              Acompanhamento Sienge
            </Link>

            <Link
              href="/financeiro/solicitacoes"
              className="btn btn-primary btn-sm h-10 rounded-xl px-4"
            >
              <WalletCards
                size={
                  15
                }
              />

              Central Financeira
            </Link>
          </div>
        </header>
      </MotionReveal>

      {/* =====================================================
          HERO FINANCEIRO
      ====================================================== */}

      <MotionReveal
        delay={
          0.04
        }
      >
        <section className="projeta-dark-surface overflow-hidden">
          <div className="p-6 sm:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles
                    size={
                      13
                    }
                    className="text-[#d66464]"
                  />

                  <p className="text-[8px] font-[750] uppercase tracking-[0.2em] text-white/35">
                    Visão operacional
                  </p>
                </div>

                <div className="mt-5 flex items-end gap-3">
                  <AnimatedNumber
                    value={
                      activePriorityCount
                    }
                    className="text-[58px] font-[750] leading-none tracking-[-0.065em] text-white"
                  />

                  <div className="pb-1">
                    <p className="text-[11px] font-[600] text-white/70">
                      pontos de atenção
                    </p>

                    <p className="mt-1 text-[9px] text-white/30">
                      ações operacionais monitoradas
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid w-full gap-3 sm:grid-cols-2 xl:max-w-[620px] xl:grid-cols-4">
                <DarkMetric
                  label="Novas"
                  value={
                    submittedCount
                  }
                />

                <DarkMetric
                  label="Devoluções"
                  value={
                    awaitingReturnCount
                  }
                />

                <DarkMetric
                  label="Conciliações"
                  value={
                    conflictCount
                  }
                />

                <DarkMetric
                  label="SLA vencido"
                  value={
                    overdueCount
                  }
                />
              </div>
            </div>
          </div>
        </section>
      </MotionReveal>

      {/* =====================================================
          MÉTRICAS
      ====================================================== */}

      <MotionStagger
        className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <MotionStaggerItem>
          <MetricCard
            icon={
              FileSpreadsheet
            }
            label="Novas solicitações"
            value={
              submittedCount
            }
          />
        </MotionStaggerItem>

        <MotionStaggerItem>
          <MetricCard
            icon={
              ShieldCheck
            }
            label="Aguardando aprovação"
            value={
              approvalCount
            }
          />
        </MotionStaggerItem>

        <MotionStaggerItem>
          <MetricCard
            icon={
              CreditCard
            }
            label="Cartões em uso"
            value={
              inUseCount
            }
          />
        </MotionStaggerItem>

        <MotionStaggerItem>
          <MetricCard
            icon={
              Truck
            }
            label="Aguardando devolução"
            value={
              awaitingReturnCount
            }
            tone={
              awaitingReturnCount >
              0
                ? "warning"
                : "default"
            }
          />
        </MotionStaggerItem>

        <MotionStaggerItem>
          <MetricCard
            icon={
              AlertTriangle
            }
            label="Revisar vínculos"
            value={
              conflictCount
            }
            tone={
              conflictCount >
              0
                ? "error"
                : "default"
            }
          />
        </MotionStaggerItem>
      </MotionStagger>

      {/* =====================================================
          PRIORIDADES + SAÚDE
      ====================================================== */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(330px,0.75fr)]">
        <section className="projeta-panel overflow-hidden">
          <div className="border-b border-base-300/70 px-5 py-5 sm:px-6">
            <p className="projeta-section-label">
              Prioridades
            </p>

            <h2 className="mt-2 text-[15px] font-[650]">
              O que precisa ser resolvido
            </h2>

            <p className="mt-1 text-[10px] text-base-content/40">
              Pontos da operação que podem exigir ação do Financeiro.
            </p>
          </div>

          {priorities.every(
            (
              item
            ) =>
              item.count ===
              0
          ) ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
              <CheckCircle2
                size={
                  26
                }
                className="text-success"
              />

              <p className="mt-4 text-[13px] font-[650]">
                Operação em dia
              </p>

              <p className="mt-1 text-[10px] text-base-content/40">
                Nenhuma prioridade operacional foi identificada.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-base-300/60">
              {priorities
                .filter(
                  (
                    item
                  ) =>
                    item.count >
                    0
                )
                .map(
                  (
                    item
                  ) => (
                    <PriorityRow
                      key={
                        item.title
                      }
                      item={
                        item
                      }
                    />
                  )
                )}
            </div>
          )}
        </section>

        <section className="projeta-panel p-5 sm:p-6">
          <p className="projeta-section-label">
            Saúde operacional
          </p>

          <div className="mt-2 flex items-end justify-between gap-5">
            <div>
              <h2 className="text-[15px] font-[650]">
                Cumprimento de SLA
              </h2>

              <p className="mt-1 text-[10px] text-base-content/40">
                Situação dos itens atualmente monitorados.
              </p>
            </div>

            <p
              className={[
                "text-[31px] font-[750] tracking-[-0.05em]",
                onTimeRate >=
                80
                  ? "text-success"
                  : onTimeRate >=
                      60
                    ? "text-warning"
                    : "text-error",
              ].join(
                " "
              )}
            >
              {onTimeRate}%
            </p>
          </div>

          <div className="mt-6 h-2 overflow-hidden rounded-full bg-base-200">
            <div
              className={[
                "h-full rounded-full",
                onTimeRate >=
                80
                  ? "bg-success"
                  : onTimeRate >=
                      60
                    ? "bg-warning"
                    : "bg-error",
              ].join(
                " "
              )}
              style={{
                width:
                  `${Math.min(
                    100,
                    Math.max(
                      0,
                      onTimeRate
                    )
                  )}%`,
              }}
            />
          </div>

          <div className="mt-6 grid grid-cols-3 divide-x divide-base-300">
            <HealthMetric
              value={
                onTimeCount
              }
              label="No prazo"
              tone="success"
            />

            <HealthMetric
              value={
                warningCount
              }
              label="Atenção"
              tone="warning"
            />

            <HealthMetric
              value={
                overdueCount
              }
              label="Atrasado"
              tone="error"
            />
          </div>

          <div className="mt-6 border-t border-base-300/70 pt-5">
            <SmallOperationRow
              label="Solicitações de cartão"
              value={
                cardsCount
              }
            />

            <SmallOperationRow
              label="Solicitações Sienge"
              value={
                siengeCount
              }
            />

            <SmallOperationRow
              label="Em compra / entrega"
              value={
                purchaseDeliveryCount
              }
            />

            <SmallOperationRow
              label="Vínculos confirmados"
              value={
                linkedCount
              }
            />

            <SmallOperationRow
              label="Aguardando vínculo"
              value={
                pendingLinkCount
              }
            />
          </div>
        </section>
      </div>

      {/* =====================================================
          SITUAÇÃO DOS CARTÕES
      ====================================================== */}

      <section className="projeta-panel mt-6 overflow-hidden">
        <div className="border-b border-base-300/70 px-5 py-5 sm:px-6">
          <p className="projeta-section-label">
            Cartões
          </p>

          <h2 className="mt-2 text-[15px] font-[650]">
            Situação da operação
          </h2>
        </div>

        <div className="grid gap-px bg-base-300/60 sm:grid-cols-2 xl:grid-cols-6">
          <OperationBlock
            label="Novas"
            value={
              submittedCount
            }
          />

          <OperationBlock
            label="Em análise"
            value={
              reviewCount
            }
          />

          <OperationBlock
            label="Aprovação"
            value={
              approvalCount
            }
          />

          <OperationBlock
            label="Em uso"
            value={
              inUseCount
            }
          />

          <OperationBlock
            label="Devolução"
            value={
              awaitingReturnCount
            }
          />

          <OperationBlock
            label="Conferência"
            value={
              conferenceCount
            }
          />
        </div>
      </section>

      {/* =====================================================
          ATIVIDADE + AÇÕES
      ====================================================== */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
        <ActivityPanel
          notifications={
            notifications
          }
        />

        <section className="projeta-panel overflow-hidden">
          <div className="border-b border-base-300/70 px-5 py-5">
            <p className="projeta-section-label">
              Acesso rápido
            </p>

            <h2 className="mt-2 text-[15px] font-[650]">
              Operação Financeira
            </h2>
          </div>

          <QuickLink
            icon={
              WalletCards
            }
            title="Central de Solicitações"
            description="Cartões, Sienge e conciliação"
            href="/financeiro/solicitacoes"
            primary
          />

          <QuickLink
            icon={
              FileSpreadsheet
            }
            title="Acompanhamento Sienge"
            description="Importação e gestão dos pedidos"
            href="/financeiro/sienge"
          />

          <QuickLink
            icon={
              ListTodo
            }
            title="Central de Pendências"
            description={`${overdueCount} item(ns) com SLA vencido`}
            href="/pendencias"
          />

          {unmatchedUsers >
            0 && (
            <QuickLink
              icon={
                UserRoundX
              }
              title="Usuários Sienge sem vínculo"
              description={`${unmatchedUsers} identificador(es) pendente(s)`}
              href="/financeiro/sienge?tab=usuarios"
            />
          )}

          {canAdmin && (
            <QuickLink
              icon={
                UsersRound
              }
              title="Usuários e acessos"
              description="Perfis, permissões e segurança"
              href="/administracao/usuarios"
            />
          )}
        </section>
      </div>

      <DashboardFooter />
    </main>
  );
}

// ============================================================
// DASHBOARD SOLICITANTE
// ============================================================

function UserDashboard({
  firstName,
  today,
  actionCount,
  progressCount,
  completedCount,
  processes,
  notifications,
}: {
  firstName: string;

  today: string;

  actionCount: number;

  progressCount: number;

  completedCount: number;

  processes:
    UserProcess[];

  notifications:
    NotificationRow[];
}) {
  const actionItems =
    processes
      .filter(
        (
          item
        ) =>
          item.stage ===
          "action"
      )
      .slice(
        0,
        5
      );

  const recentProcesses =
    processes.slice(
      0,
      6
    );

  return (
    <main className="projeta-page">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <MotionReveal>
        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="projeta-section-label text-primary">
              Minha operação
            </p>

            <h1 className="mt-3 text-[28px] font-[700] tracking-[-0.05em] text-base-content sm:text-[32px]">
              Olá, {firstName}.
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-base-content/40">
              <span>
                {today}
              </span>

              <span className="h-1 w-1 rounded-full bg-base-content/20" />

              <span>
                Veja suas solicitações e o que precisa da sua ação.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/solicitacoes"
              className="btn btn-ghost btn-sm h-10 rounded-xl border border-base-300 bg-base-100 px-4"
            >
              <PackageSearch
                size={
                  15
                }
              />

              Minhas solicitações
            </Link>

            <Link
              href="/solicitacoes/nova"
              className="btn btn-primary btn-sm h-10 rounded-xl px-4"
            >
              <Plus
                size={
                  15
                }
              />

              Nova solicitação
            </Link>
          </div>
        </header>
      </MotionReveal>

      {/* =====================================================
          HERO DO USUÁRIO
      ====================================================== */}

      <MotionReveal
        delay={
          0.04
        }
      >
        <section
          className={[
            "overflow-hidden rounded-[22px] border",
            actionCount >
            0
              ? "border-amber-200 bg-amber-50/70"
              : "border-emerald-200 bg-emerald-50/60",
          ].join(
            " "
          )}
        >
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
            <div
              className={[
                "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm",
                actionCount >
                0
                  ? "text-amber-600"
                  : "text-emerald-600",
              ].join(
                " "
              )}
            >
              {actionCount >
              0 ? (
                <Sparkles
                  size={
                    20
                  }
                />
              ) : (
                <CheckCircle2
                  size={
                    20
                  }
                />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p
                className={[
                  "text-[15px] font-[700]",
                  actionCount >
                  0
                    ? "text-amber-950"
                    : "text-emerald-950",
                ].join(
                  " "
                )}
              >
                {actionCount >
                0
                  ? `Você tem ${actionCount} ${
                      actionCount ===
                      1
                        ? "solicitação que precisa"
                        : "solicitações que precisam"
                    } da sua atenção`
                  : "Você não possui nenhuma ação pendente"}
              </p>

              <p
                className={[
                  "mt-1 text-[11px] leading-5",
                  actionCount >
                  0
                    ? "text-amber-800"
                    : "text-emerald-800",
                ].join(
                  " "
                )}
              >
                {actionCount >
                0
                  ? "As ações mais importantes aparecem logo abaixo para você resolver sem procurar em outros módulos."
                  : "Suas solicitações continuam sendo acompanhadas normalmente pelo sistema."}
              </p>
            </div>

            <Link
              href={
                actionCount >
                0
                  ? "/solicitacoes?filter=action"
                  : "/solicitacoes"
              }
              className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-[11px] font-[650] text-white transition hover:bg-slate-800"
            >
              {actionCount >
              0
                ? "Ver minhas ações"
                : "Ver solicitações"}

              <ArrowRight
                size={
                  14
                }
              />
            </Link>
          </div>
        </section>
      </MotionReveal>

      {/* =====================================================
          RESUMO
      ====================================================== */}

      <MotionStagger
        className="mt-5 grid gap-4 sm:grid-cols-3"
      >
        <MotionStaggerItem>
          <MetricCard
            icon={
              AlertTriangle
            }
            label="Precisa de mim"
            value={
              actionCount
            }
            href="/solicitacoes?filter=action"
            tone={
              actionCount >
              0
                ? "warning"
                : "default"
            }
          />
        </MotionStaggerItem>

        <MotionStaggerItem>
          <MetricCard
            icon={
              Clock3
            }
            label="Em andamento"
            value={
              progressCount
            }
            href="/solicitacoes?filter=progress"
          />
        </MotionStaggerItem>

        <MotionStaggerItem>
          <MetricCard
            icon={
              CheckCircle2
            }
            label="Concluídas"
            value={
              completedCount
            }
            href="/solicitacoes?filter=completed"
            tone="success"
          />
        </MotionStaggerItem>
      </MotionStagger>

      {/* =====================================================
          AÇÕES DO USUÁRIO
      ====================================================== */}

      <section className="projeta-panel mt-6 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-base-300/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="projeta-section-label">
              Próximas ações
            </p>

            <h2 className="mt-2 text-[15px] font-[650]">
              Precisa de você
            </h2>

            <p className="mt-1 text-[10px] text-base-content/40">
              Somente atividades que dependem de uma ação sua.
            </p>
          </div>

          {actionCount >
            0 && (
            <Link
              href="/solicitacoes?filter=action"
              className="text-[10px] font-[650] text-primary hover:underline"
            >
              Ver todas
            </Link>
          )}
        </div>

        {actionItems.length ===
        0 ? (
          <div className="flex min-h-[230px] flex-col items-center justify-center p-8 text-center">
            <CheckCircle2
              size={
                25
              }
              className="text-success"
            />

            <p className="mt-4 text-[13px] font-[650]">
              Tudo certo por aqui
            </p>

            <p className="mt-1 max-w-[330px] text-[10px] leading-5 text-base-content/40">
              Nenhuma solicitação depende de uma ação sua neste momento.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-base-300/60">
            {actionItems.map(
              (
                item
              ) => (
                <UserProcessRow
                  key={
                    item.key
                  }
                  item={
                    item
                  }
                  prominent
                />
              )
            )}
          </div>
        )}
      </section>

      {/* =====================================================
          SOLICITAÇÕES RECENTES + ATIVIDADE
      ====================================================== */}

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <section className="projeta-panel overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-base-300/70 px-5 py-5 sm:px-6">
            <div>
              <p className="projeta-section-label">
                Acompanhamento
              </p>

              <h2 className="mt-2 text-[15px] font-[650]">
                Minhas solicitações recentes
              </h2>
            </div>

            <Link
              href="/solicitacoes"
              className="text-[10px] font-[650] text-primary hover:underline"
            >
              Ver todas
            </Link>
          </div>

          {recentProcesses.length ===
          0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
              <PackageSearch
                size={
                  26
                }
                className="text-base-content/20"
              />

              <p className="mt-4 text-[13px] font-[650]">
                Nenhuma solicitação ainda
              </p>

              <p className="mt-1 text-[10px] text-base-content/40">
                Suas solicitações aparecerão aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-base-300/60">
              {recentProcesses.map(
                (
                  item
                ) => (
                  <UserProcessRow
                    key={
                      item.key
                    }
                    item={
                      item
                    }
                  />
                )
              )}
            </div>
          )}
        </section>

        <ActivityPanel
          notifications={
            notifications
          }
          personal
        />
      </div>

      {/* =====================================================
          AÇÕES RÁPIDAS
      ====================================================== */}

      <section className="mt-6">
        <div className="mb-3">
          <p className="projeta-section-label">
            Atalhos
          </p>

          <h2 className="mt-2 text-[15px] font-[650]">
            O que você deseja fazer?
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <ShortcutCard
            icon={
              Plus
            }
            title="Nova solicitação de cartão"
            description="Inicie uma nova solicitação para utilização de cartão."
            href="/solicitacoes/nova"
            primary
          />

          <ShortcutCard
            icon={
              PackageSearch
            }
            title="Minhas solicitações"
            description="Acompanhe cartões, compras, devoluções e recebimentos em uma única página."
            href="/solicitacoes"
          />
        </div>
      </section>

      <DashboardFooter />
    </main>
  );
}

// ============================================================
// USER PROCESS ROW
// ============================================================

function UserProcessRow({
  item,
  prominent = false,
}: {
  item:
    UserProcess;

  prominent?:
    boolean;
}) {
  const type =
    getProcessType(
      item.type
    );

  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          item.stage ===
          "action"
            ? "bg-warning/10 text-warning"
            : item.stage ===
                "completed"
              ? "bg-success/10 text-success"
              : "bg-base-200 text-base-content/40",
        ].join(
          " "
        )}
      >
        <type.Icon
          size={
            17
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[11px] font-[750] text-primary">
            {
              item.number
            }
          </p>

          <span className="rounded-full border border-base-300 bg-base-200/50 px-2 py-0.5 text-[8px] font-[650] text-base-content/45">
            {
              type.label
            }
          </span>

          {item.scNumber &&
            item.type ===
              "combined" && (
            <span className="text-[9px] text-base-content/35">
              SC{" "}
              {
                item.scNumber
              }
            </span>
          )}
        </div>

        <p className="mt-1 truncate text-[12px] font-[650] text-base-content/75">
          {
            item.title
          }
        </p>

        <p
          className={[
            "mt-1 text-[10px] font-[600]",
            item.stage ===
            "action"
              ? "text-warning"
              : item.stage ===
                  "completed"
                ? "text-success"
                : "text-base-content/45",
          ].join(
            " "
          )}
        >
          {
            item.status
          }
        </p>

        <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-base-content/35">
          {
            item.description
          }
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span className="hidden text-[9px] text-base-content/30 sm:block">
          {formatDate(
            item.date
          )}
        </span>

        <Link
          href={
            item.href
          }
          className={[
            "inline-flex h-9 items-center justify-center gap-2 rounded-xl px-3 text-[10px] font-[650] transition",
            prominent ||
            item.stage ===
              "action"
              ? "bg-primary text-white hover:bg-primary/90"
              : "border border-base-300 bg-base-100 text-base-content/60 hover:bg-base-200",
          ].join(
            " "
          )}
        >
          {
            item.actionLabel
          }

          <ArrowRight
            size={
              12
            }
          />
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// FINANCE PRIORITY ROW
// ============================================================

function PriorityRow({
  item,
}: {
  item:
    PriorityItem;
}) {
  const Icon =
    item.icon;

  return (
    <Link
      href={
        item.href
      }
      className="group flex items-center gap-4 px-5 py-4 transition hover:bg-base-200/50 sm:px-6"
    >
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
          item.tone ===
          "error"
            ? "bg-error/10 text-error"
            : item.tone ===
                "warning"
              ? "bg-warning/10 text-warning"
              : "bg-base-200 text-base-content/40",
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

      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-[650] text-base-content/70">
          {
            item.title
          }
        </p>

        <p className="mt-1 text-[9px] text-base-content/35">
          {
            item.description
          }
        </p>
      </div>

      <AnimatedNumber
        value={
          item.count
        }
        className={[
          "text-[19px] font-[750]",
          item.tone ===
          "error"
            ? "text-error"
            : item.tone ===
                "warning"
              ? "text-warning"
              : "text-base-content/65",
        ].join(
          " "
        )}
      />

      <ArrowRight
        size={
          14
        }
        className="text-base-content/15 transition group-hover:translate-x-1 group-hover:text-primary"
      />
    </Link>
  );
}

// ============================================================
// ACTIVITY PANEL
// ============================================================

function ActivityPanel({
  notifications,
  personal = false,
}: {
  notifications:
    NotificationRow[];

  personal?:
    boolean;
}) {
  return (
    <section className="projeta-panel overflow-hidden">
      <div className="flex items-center justify-between gap-4 border-b border-base-300/70 px-5 py-5">
        <div>
          <p className="projeta-section-label">
            Atividade
          </p>

          <h2 className="mt-2 text-[15px] font-[650]">
            {personal
              ? "Atualizações para você"
              : "Atividade recente"}
          </h2>
        </div>

        <Activity
          size={
            17
          }
          className="text-base-content/20"
        />
      </div>

      {notifications.length ===
      0 ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center p-8 text-center">
          <Activity
            size={
              23
            }
            className="text-base-content/20"
          />

          <p className="mt-4 text-[12px] font-[650]">
            Sem atualizações recentes
          </p>
        </div>
      ) : (
        <div className="divide-y divide-base-300/60">
          {notifications.map(
            (
              notification
            ) => (
              <NotificationRowItem
                key={
                  notification.id
                }
                notification={
                  notification
                }
              />
            )
          )}
        </div>
      )}
    </section>
  );
}

// ============================================================
// NOTIFICATION
// ============================================================

function NotificationRowItem({
  notification,
}: {
  notification:
    NotificationRow;
}) {
  const href =
    notification.action_url &&
    notification.action_url.startsWith(
      "/"
    )
      ? notification.action_url
      : "/notificacoes";

  return (
    <Link
      href={
        href
      }
      className="group flex gap-3 px-5 py-4 transition hover:bg-base-200/50"
    >
      <span
        className={[
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          notification.level ===
          "error"
            ? "bg-error"
            : notification.level ===
                "warning"
              ? "bg-warning"
              : notification.level ===
                  "success"
                ? "bg-success"
                : "bg-info",
        ].join(
          " "
        )}
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="line-clamp-1 text-[10px] font-[650] text-base-content/65">
            {
              notification.title
            }
          </p>

          <span className="shrink-0 text-[8px] text-base-content/25">
            {formatRelativeTime(
              notification.created_at
            )}
          </span>
        </div>

        {notification.message && (
          <p className="mt-1 line-clamp-2 text-[9px] leading-4 text-base-content/35">
            {
              notification.message
            }
          </p>
        )}
      </div>
    </Link>
  );
}

// ============================================================
// MÉTRICA
// ============================================================

function MetricCard({
  icon:
    Icon,
  label,
  value,
  href,
  tone = "default",
}: {
  icon:
    LucideIcon;

  label:
    string;

  value:
    number;

  href?:
    string;

  tone?:
    | "default"
    | "warning"
    | "error"
    | "success";
}) {
  const content = (
    <div className="h-full rounded-[18px] border border-base-300 bg-base-100 p-5 transition hover:border-base-300/80 hover:shadow-sm">
      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-xl",
          tone ===
          "warning"
            ? "bg-warning/10 text-warning"
            : tone ===
                "error"
              ? "bg-error/10 text-error"
              : tone ===
                  "success"
                ? "bg-success/10 text-success"
                : "bg-base-200 text-base-content/40",
        ].join(
          " "
        )}
      >
        <Icon
          size={
            18
          }
        />
      </div>

      <AnimatedNumber
        value={
          value
        }
        className="mt-4 block text-[27px] font-[750] tracking-[-0.045em]"
      />

      <p className="mt-1 text-[10px] font-[550] text-base-content/40">
        {
          label
        }
      </p>
    </div>
  );

  if (
    !href
  ) {
    return content;
  }

  return (
    <Link
      href={
        href
      }
      className="block h-full"
    >
      {
        content
      }
    </Link>
  );
}

// ============================================================
// DARK METRIC
// ============================================================

function DarkMetric({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4">
      <AnimatedNumber
        value={
          value
        }
        className="text-[26px] font-[750] tracking-[-0.04em] text-white"
      />

      <p className="mt-1 text-[9px] text-white/35">
        {
          label
        }
      </p>
    </div>
  );
}

// ============================================================
// HEALTH METRIC
// ============================================================

function HealthMetric({
  value,
  label,
  tone,
}: {
  value:
    number;

  label:
    string;

  tone:
    | "success"
    | "warning"
    | "error";
}) {
  return (
    <div className="px-3 text-center">
      <p
        className={[
          "text-[19px] font-[750]",
          tone ===
          "success"
            ? "text-success"
            : tone ===
                "warning"
              ? "text-warning"
              : "text-error",
        ].join(
          " "
        )}
      >
        {
          value
        }
      </p>

      <p className="mt-1 text-[8px] text-base-content/35">
        {
          label
        }
      </p>
    </div>
  );
}

// ============================================================
// SMALL OPERATION ROW
// ============================================================

function SmallOperationRow({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-base-300/50 py-2.5 last:border-0">
      <p className="text-[9px] text-base-content/40">
        {
          label
        }
      </p>

      <p className="text-[11px] font-[700] text-base-content/65">
        {
          value
        }
      </p>
    </div>
  );
}

// ============================================================
// OPERATION BLOCK
// ============================================================

function OperationBlock({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div className="bg-base-100 p-5">
      <p className="text-[23px] font-[750] tracking-[-0.04em]">
        {
          value
        }
      </p>

      <p className="mt-1 text-[9px] text-base-content/35">
        {
          label
        }
      </p>
    </div>
  );
}

// ============================================================
// QUICK LINK
// ============================================================

function QuickLink({
  icon:
    Icon,
  title,
  description,
  href,
  primary = false,
}: {
  icon:
    LucideIcon;

  title:
    string;

  description:
    string;

  href:
    string;

  primary?:
    boolean;
}) {
  return (
    <Link
      href={
        href
      }
      className={[
        "group flex items-center gap-3 border-b border-base-300/60 px-5 py-4 transition last:border-0",
        primary
          ? "bg-primary/[0.035] hover:bg-primary/[0.065]"
          : "hover:bg-base-200/60",
      ].join(
        " "
      )}
    >
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
          primary
            ? "bg-primary text-white"
            : "bg-base-200 text-base-content/40 group-hover:text-primary",
        ].join(
          " "
        )}
      >
        <Icon
          size={
            15
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-[650] text-base-content/70">
          {
            title
          }
        </p>

        <p className="mt-1 truncate text-[9px] text-base-content/35">
          {
            description
          }
        </p>
      </div>

      <ArrowRight
        size={
          13
        }
        className="text-base-content/15 transition group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </Link>
  );
}

// ============================================================
// SHORTCUT CARD
// ============================================================

function ShortcutCard({
  icon:
    Icon,
  title,
  description,
  href,
  primary = false,
}: {
  icon:
    LucideIcon;

  title:
    string;

  description:
    string;

  href:
    string;

  primary?:
    boolean;
}) {
  return (
    <Link
      href={
        href
      }
      className={[
        "group rounded-[18px] border p-5 transition hover:-translate-y-0.5 hover:shadow-sm",
        primary
          ? "border-primary/20 bg-primary/[0.035]"
          : "border-base-300 bg-base-100",
      ].join(
        " "
      )}
    >
      <div
        className={[
          "flex h-10 w-10 items-center justify-center rounded-xl",
          primary
            ? "bg-primary text-white"
            : "bg-base-200 text-base-content/40",
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

      <p className="mt-4 text-[12px] font-[650] text-base-content/70">
        {
          title
        }
      </p>

      <p className="mt-1 text-[9px] leading-4 text-base-content/35">
        {
          description
        }
      </p>

      <div className="mt-4 flex items-center gap-1 text-[9px] font-[650] text-primary">
        Acessar

        <ArrowRight
          size={
            12
          }
        />
      </div>
    </Link>
  );
}

// ============================================================
// FOOTER
// ============================================================

function DashboardFooter() {
  return (
    <footer className="mt-7 flex flex-col gap-2 border-t border-base-300/60 py-5 text-[8px] font-[550] text-base-content/25 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <span className="status status-success status-xs" />

        Dados sincronizados com a operação
      </div>

      <span className="uppercase tracking-[0.14em]">
        Projeta Compras OS
      </span>
    </footer>
  );
}

// ============================================================
// TIPO DO PROCESSO
// ============================================================

function getProcessType(
  type:
    UserProcess["type"]
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
    };
  }

  return {
    label:
      "Cartão",

    Icon:
      CreditCard,
  };
}

// ============================================================
// STATUS CARTÃO
// ============================================================

function getCardStatusLabel(
  status:
    string
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
      "Aprovado",

    rejected:
      "Reprovado",

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

function getCardDescription(
  status:
    string
) {
  switch (
    status
  ) {
    case "submitted":
      return "Sua solicitação foi enviada e aguarda análise do Financeiro.";

    case "under_review":
      return "O Financeiro está analisando sua solicitação.";

    case "awaiting_information":
      return "Precisamos de informações adicionais para continuar.";

    case "awaiting_approval":
      return "Sua solicitação está aguardando aprovação.";

    case "approved":
      return "Sua solicitação foi aprovada.";

    case "card_reserved":
      return "O cartão foi reservado para sua utilização.";

    case "card_delivered":
    case "in_use":
      return "O cartão está liberado para utilização.";

    case "awaiting_return":
      return "O cartão precisa ser devolvido para continuar o processo.";

    case "returned":
      return "O cartão foi devolvido e seguirá para conferência.";

    case "accountability_review":
      return "O Financeiro está conferindo sua devolução.";

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

function getSiengeDescription(
  status:
    | string
    | null
) {
  switch (
    status
  ) {
    case "Solicitação recebida":
      return "Sua solicitação foi recebida e está aguardando o andamento da compra.";

    case "Em cotação":
      return "Suprimentos está realizando a cotação.";

    case "Em aprovação":
      return "A compra está aguardando aprovação.";

    case "Compra realizada":
    case "Compra via cartão":
      return "A compra foi realizada. Aguarde a entrega do material.";

    case "Disponível para retirada":
      return "O material está disponível para retirada.";

    case "Em processo de entrega":
      return "O pedido está em processo de entrega.";

    case "Entregue":
      return "A entrega foi registrada.";

    default:
      return "Sua solicitação está sendo processada.";
  }
}

// ============================================================
// FORMATADORES
// ============================================================

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
    String(
      value
    ).match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (
    !match
  ) {
    return "-";
  }

  return `${match[3]}/${match[2]}/${match[1]}`;
}

function formatCurrentDate() {
  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      weekday:
        "long",

      day:
        "2-digit",

      month:
        "long",
    }
  ).format(
    new Date()
  );
}

function formatRelativeTime(
  value:
    string
) {
  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "agora";
  }

  const difference =
    Math.max(
      0,
      Date.now() -
        date.getTime()
    );

  const minutes =
    Math.floor(
      difference /
        60000
    );

  if (
    minutes <
    1
  ) {
    return "agora";
  }

  if (
    minutes <
    60
  ) {
    return `há ${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes /
        60
    );

  if (
    hours <
    24
  ) {
    return `há ${hours}h`;
  }

  const days =
    Math.floor(
      hours /
        24
    );

  if (
    days ===
    1
  ) {
    return "ontem";
  }

  return `há ${days} dias`;
}

function logQueryError(
  context:
    string,

  error:
    | {
        message?: string;
      }
    | null
    | undefined
) {
  if (
    !error
  ) {
    return;
  }

  console.error(
    `Erro ao carregar ${context}:`,
    error
  );
}