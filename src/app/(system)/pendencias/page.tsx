import PendenciasClient from "@/components/pendencias/pendencias-client";

import type {
  PendingEntry,
  PendingFilter,
} from "@/components/pendencias/pendencias-client";

import {
  buildPendingSummary,
} from "@/lib/pendencias/summary";

import type {
  PendingDeliveryConfirmationRow,
  PendingReceiptItemRow,
} from "@/lib/pendencias/summary";

import {
  createClient,
} from "@/lib/supabase/server";

import {
  redirect,
} from "next/navigation";

// ============================================================
// TIPOS
// ============================================================

type PageProps = {
  searchParams: Promise<{
    tipo?: string;
    q?: string;
  }>;
};

type SlaRow = {
  item_id: string;

  sc_number:
    | string
    | null;

  insumo:
    | string
    | null;

  requester_sienge_username:
    | string
    | null;

  requester_profile_id:
    | string
    | null;

  cost_center_or_site:
    | string
    | null;

  order_number:
    | string
    | null;

  supplier_name:
    | string
    | null;

  delivery_or_pickup_forecast:
    | string
    | null;

  delivery_status:
    | string
    | null;

  delivery_date:
    | string
    | null;

  tracking_status:
    | string
    | null;

  sla_status:
    | string
    | null;

  elapsed_hours:
    | number
    | string
    | null;
};

type ReceiptItemRow =
  PendingReceiptItemRow & {
    insumo:
      | string
      | null;

    requester_sienge_username:
      | string
      | null;

    cost_center_or_site:
      | string
      | null;

    supplier_name:
      | string
      | null;
  };

type DeliveryConfirmationRow =
  PendingDeliveryConfirmationRow & {
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

type RequestSummaryRow = {
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
};

type SiengeUserRow = {
  requester_sienge_username:
    | string
    | null;

  requester_profile_id:
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

  read_at:
    | string
    | null;
};

// ============================================================
// PAGE
// ============================================================

export default async function PendenciasPage({
  searchParams,
}: PageProps) {
  const params =
    await searchParams;

  const supabase =
    await createClient();

  // =========================================================
  // AUTH
  // =========================================================

  const {
    data:
      claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (
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
      "Erro ao carregar funções:",
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

  const isDirection =
    roles.includes(
      "direcao"
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

  // =========================================================
  // DIREÇÃO NÃO ACESSA CENTRAL OPERACIONAL
  // =========================================================

  if (
    isDirection &&
    !canFinance
  ) {
    redirect(
      "/direcao"
    );
  }

  // =========================================================
  // FILTRO INICIAL
  // =========================================================

  const allowedTypes: PendingFilter[] =
    [
      "todas",
      "criticas",
      "atencao",
      "sla",
      "entrega",
      "recebimento",
      "usuarios",
      "alertas",
    ];

  const requestedType =
    params.tipo as
      | PendingFilter
      | undefined;

  let initialType: PendingFilter =
    requestedType &&
    allowedTypes.includes(
      requestedType
    )
      ? requestedType
      : "todas";

  if (
    initialType ===
      "usuarios" &&
    !canFinance
  ) {
    initialType =
      "todas";
  }

  const initialQuery =
    (
      params.q ??
      ""
    ).trim();

  // =========================================================
  // SLA
  // =========================================================

  let slaQuery =
    supabase
      .from(
        "v_sienge_item_sla"
      )
      .select(
        `
        item_id,
        sc_number,
        insumo,
        requester_sienge_username,
        requester_profile_id,
        cost_center_or_site,
        order_number,
        supplier_name,
        delivery_or_pickup_forecast,
        delivery_status,
        delivery_date,
        tracking_status,
        sla_status,
        elapsed_hours
        `
      );

  // =========================================================
  // SEGURANÇA DO SLA
  // =========================================================

  if (
    !canFinance
  ) {
    slaQuery =
      slaQuery.eq(
        "requester_profile_id",
        userId
      );
  }

  // =========================================================
  // ITENS PARA CONFIRMAÇÃO DO RECEBIMENTO
  // =========================================================

  let receiptItemsQuery =
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
        order_number,
        supplier_name,
        initial_delivery_forecast,
        delivery_or_pickup_forecast,
        delivery_status
        `
      );

  // =========================================================
  // SOLICITANTE VÊ SOMENTE OS PRÓPRIOS PEDIDOS
  // =========================================================

  if (
    !canFinance
  ) {
    receiptItemsQuery =
      receiptItemsQuery.eq(
        "requester_profile_id",
        userId
      );
  }

  // =========================================================
  // CONFIRMAÇÕES DO SOLICITANTE
  // =========================================================

  let confirmationsQuery =
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
      );

  if (
    !canFinance
  ) {
    confirmationsQuery =
      confirmationsQuery.eq(
        "requester_profile_id",
        userId
      );
  }

  // =========================================================
  // RESUMOS PARA DESCOBRIR O REQUEST KEY
  // =========================================================

  let requestSummariesQuery =
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
        cost_center_or_site
        `
      );

  if (
    !canFinance
  ) {
    requestSummariesQuery =
      requestSummariesQuery.eq(
        "requester_profile_id",
        userId
      );
  }

  // =========================================================
  // USUÁRIOS SIENGE
  // =========================================================

  const siengeUsersPromise =
    canFinance
      ? supabase
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
          )
      : Promise.resolve(
          {
            data:
              [] as SiengeUserRow[],

            error:
              null,
          }
        );

  // =========================================================
  // NOTIFICAÇÕES
  // =========================================================

  let notificationsQuery =
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
        created_at,
        read_at
        `
      )
      .is(
        "read_at",
        null
      )
      .in(
        "level",
        [
          "warning",
          "error",
        ]
      )
      .order(
        "created_at",
        {
          ascending:
            false,
        }
      );

  if (
    !canFinance
  ) {
    notificationsQuery =
      notificationsQuery.eq(
        "user_id",
        userId
      );
  }

  // =========================================================
  // EXECUTAR
  // =========================================================

  const [
    slaResult,
    receiptItemsResult,
    confirmationsResult,
    requestSummariesResult,
    siengeUsersResult,
    notificationsResult,
  ] =
    await Promise.all([
      slaQuery,
      receiptItemsQuery,
      confirmationsQuery,
      requestSummariesQuery,
      siengeUsersPromise,
      notificationsQuery,
    ]);

  // =========================================================
  // ERROS
  // =========================================================

  if (
    slaResult.error
  ) {
    console.error(
      "Erro ao carregar SLA:",
      slaResult.error
    );
  }

  if (
    receiptItemsResult.error
  ) {
    console.error(
      "Erro ao carregar itens para confirmação de recebimento:",
      receiptItemsResult.error
    );
  }

  if (
    confirmationsResult.error
  ) {
    console.error(
      "Erro ao carregar confirmações de recebimento:",
      confirmationsResult.error
    );
  }

  if (
    requestSummariesResult.error
  ) {
    console.error(
      "Erro ao carregar request keys:",
      requestSummariesResult.error
    );
  }

  if (
    siengeUsersResult.error
  ) {
    console.error(
      "Erro ao carregar usuários Sienge:",
      siengeUsersResult.error
    );
  }

  if (
    notificationsResult.error
  ) {
    console.error(
      "Erro ao carregar alertas:",
      notificationsResult.error
    );
  }

  // =========================================================
  // DADOS
  // =========================================================

  const slaRows =
    (
      slaResult.data ??
      []
    ) as SlaRow[];

  const receiptItems =
    (
      receiptItemsResult.data ??
      []
    ) as ReceiptItemRow[];

  const confirmations =
    (
      confirmationsResult.data ??
      []
    ) as DeliveryConfirmationRow[];

  const requestSummaries =
    (
      requestSummariesResult.data ??
      []
    ) as RequestSummaryRow[];

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

  // =========================================================
  // NÃO GERAR FALSO POSITIVO DE RECEBIMENTO
  // =========================================================

  const canCalculateReceipts =
    !receiptItemsResult.error &&
    !confirmationsResult.error;

  // =========================================================
  // RESUMO CENTRALIZADO
  // =========================================================

  const summary =
    buildPendingSummary(
      {
        slaRows,

        siengeUsers,

        notifications,

        receiptItems:
          canCalculateReceipts
            ? receiptItems
            : [],

        deliveryConfirmations:
          canCalculateReceipts
            ? confirmations
            : [],

        canFinance,
      }
    );

  // =========================================================
  // MAPAS SLA
  // =========================================================

  const overdueBySc =
    createScMap(
      slaRows.filter(
        (
          row
        ) =>
          row.sla_status ===
          "overdue"
      )
    );

  const warningBySc =
    createScMap(
      slaRows.filter(
        (
          row
        ) =>
          row.sla_status ===
          "warning"
      )
    );

  // =========================================================
  // ENTREGA VENCIDA
  // =========================================================

  const today =
    getTodayIsoDate();

  const overdueDeliveryBySc =
    createScMap(
      slaRows.filter(
        (
          row
        ) => {
          if (
            !row
              .delivery_or_pickup_forecast
          ) {
            return false;
          }

          if (
            row.tracking_status ===
            "Entregue"
          ) {
            return false;
          }

          const forecast =
            extractIsoDate(
              row
                .delivery_or_pickup_forecast
            );

          if (
            !forecast
          ) {
            return false;
          }

          return (
            forecast <
            today
          );
        }
      )
    );

  // =========================================================
  // CONFIRMAÇÃO POR ITEM
  // =========================================================

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
  // REQUEST KEY POR AGRUPAMENTO
  // =========================================================

  const requestKeyByGroup =
    new Map<
      string,
      string
    >();

  for (
    const request
    of requestSummaries
  ) {
    requestKeyByGroup.set(
      createRequestGroupKey(
        request
      ),
      request.request_key
    );
  }

  // =========================================================
  // USUÁRIOS SEM VÍNCULO
  // =========================================================

  const unmatchedUsers =
    canFinance
      ? Array.from(
          new Set(
            siengeUsers
              .filter(
                (
                  row
                ) =>
                  row
                    .requester_sienge_username &&
                  !row
                    .requester_profile_id
              )
              .map(
                (
                  row
                ) =>
                  row
                    .requester_sienge_username!
                    .trim()
                    .toUpperCase()
              )
          )
        ).sort(
          (
            a,
            b
          ) =>
            a.localeCompare(
              b,
              "pt-BR"
            )
        )
      : [];

  // =========================================================
  // FILA
  // =========================================================

  const entries: PendingEntry[] =
    [];

  // =========================================================
  // SLA VENCIDO
  // =========================================================

  for (
    const [
      key,
      row,
    ] of overdueBySc
  ) {
    const sc =
      row.sc_number ??
      key;

    const hours =
      numberValue(
        row.elapsed_hours
      );

    entries.push(
      {
        id:
          `sla-${key}`,

        type:
          "sla",

        priority:
          "critical",

        icon:
          "clock",

        title:
          `SC ${sc} fora do SLA`,

        description:
          row.insumo
            ? row.insumo
            : row.tracking_status
              ? `Etapa atual: ${row.tracking_status}`
              : "Prazo operacional ultrapassado.",

        meta:
          row
            .requester_sienge_username,

        secondary:
          row
            .cost_center_or_site,

        value:
          formatElapsedTime(
            row.elapsed_hours
          ),

        href:
          getRequestHref(
            canFinance,
            sc
          ),

        actionLabel:
          "Abrir solicitação",

        searchText:
          createSearchText(
            row
          ),

        urgency:
          hours,

        createdAt:
          null,

        details: [
          {
            label:
              "SC",

            value:
              sc,
          },

          {
            label:
              "Solicitante",

            value:
              row
                .requester_sienge_username ??
              "Não informado",
          },

          {
            label:
              "Status atual",

            value:
              row
                .tracking_status ??
              "Não informado",
          },

          {
            label:
              "Centro de custo / Obra",

            value:
              row
                .cost_center_or_site ??
              "Não informado",
          },

          {
            label:
              "Tempo decorrido",

            value:
              formatElapsedTime(
                row.elapsed_hours
              ),
          },

          {
            label:
              "Pedido",

            value:
              row
                .order_number ??
              "Ainda não informado",
          },
        ],
      }
    );
  }

  // =========================================================
  // SLA ATENÇÃO
  // =========================================================

  for (
    const [
      key,
      row,
    ] of warningBySc
  ) {
    if (
      overdueBySc.has(
        key
      )
    ) {
      continue;
    }

    const sc =
      row.sc_number ??
      key;

    entries.push(
      {
        id:
          `warning-${key}`,

        type:
          "atencao",

        priority:
          "warning",

        icon:
          "warning",

        title:
          `SC ${sc} próxima do limite`,

        description:
          row.insumo
            ? row.insumo
            : row.tracking_status
              ? `Etapa atual: ${row.tracking_status}`
              : "Prazo próximo do limite operacional.",

        meta:
          row
            .requester_sienge_username,

        secondary:
          row
            .cost_center_or_site,

        value:
          formatElapsedTime(
            row.elapsed_hours
          ),

        href:
          getRequestHref(
            canFinance,
            sc
          ),

        actionLabel:
          "Abrir solicitação",

        searchText:
          createSearchText(
            row
          ),

        urgency:
          numberValue(
            row.elapsed_hours
          ),

        createdAt:
          null,

        details: [
          {
            label:
              "SC",

            value:
              sc,
          },

          {
            label:
              "Solicitante",

            value:
              row
                .requester_sienge_username ??
              "Não informado",
          },

          {
            label:
              "Status atual",

            value:
              row
                .tracking_status ??
              "Não informado",
          },

          {
            label:
              "Centro de custo / Obra",

            value:
              row
                .cost_center_or_site ??
              "Não informado",
          },

          {
            label:
              "Tempo decorrido",

            value:
              formatElapsedTime(
                row.elapsed_hours
              ),
          },
        ],
      }
    );
  }

  // =========================================================
  // ENTREGA VENCIDA
  // =========================================================

  for (
    const [
      key,
      row,
    ] of overdueDeliveryBySc
  ) {
    const sc =
      row.sc_number ??
      key;

    const delayDays =
      getDelayDays(
        row
          .delivery_or_pickup_forecast,
        today
      );

    entries.push(
      {
        id:
          `delivery-${key}`,

        type:
          "entrega",

        priority:
          "critical",

        icon:
          "delivery",

        title:
          `Entrega da SC ${sc} vencida`,

        description:
          row.supplier_name
            ? `Fornecedor: ${row.supplier_name}`
            : "Previsão de entrega ou retirada ultrapassada.",

        meta:
          row
            .requester_sienge_username,

        secondary:
          row.order_number
            ? `Pedido ${row.order_number}`
            : row
                .cost_center_or_site,

        value:
          delayDays >
          0
            ? delayDays ===
              1
              ? "1 dia"
              : `${delayDays} dias`
            : null,

        href:
          getRequestHref(
            canFinance,
            sc
          ),

        actionLabel:
          "Abrir solicitação",

        searchText:
          createSearchText(
            row
          ),

        urgency:
          delayDays *
          24,

        createdAt:
          null,

        details: [
          {
            label:
              "SC",

            value:
              sc,
          },

          {
            label:
              "Fornecedor",

            value:
              row
                .supplier_name ??
              "Não informado",
          },

          {
            label:
              "Pedido",

            value:
              row
                .order_number ??
              "Não informado",
          },

          {
            label:
              "Previsão",

            value:
              row
                .delivery_or_pickup_forecast
                ? formatDate(
                    row
                      .delivery_or_pickup_forecast
                  )
                : "Não informada",
          },

          {
            label:
              "Status atual",

            value:
              row
                .tracking_status ??
              "Não informado",
          },

          {
            label:
              "Status da entrega",

            value:
              row
                .delivery_status ??
              "Não informado",
          },
        ],
      }
    );
  }

  // =========================================================
  // RECEBIMENTO PENDENTE
  // =========================================================

  if (
    canCalculateReceipts
  ) {
    for (
      const item
      of receiptItems
    ) {
      // =====================================================
      // SEM PEDIDO
      // =====================================================

      if (
        !item.order_number
      ) {
        continue;
      }

      const confirmation =
        confirmationByItem.get(
          String(
            item.id
          )
        );

      // =====================================================
      // JÁ ENTREGUE PELO SOLICITANTE
      // =====================================================

      if (
        confirmation
          ?.delivery_status ===
        "Entregue"
      ) {
        continue;
      }

      const forecastValue =
        item
          .delivery_or_pickup_forecast ??
        item
          .initial_delivery_forecast;

      const forecast =
        forecastValue
          ? extractIsoDate(
              forecastValue
            )
          : null;

      let priority:
        | "critical"
        | "warning"
        | null =
        null;

      let value:
        | string
        | null =
        null;

      let urgency =
        0;

      // =====================================================
      // PREVISÃO VENCIDA
      // =====================================================

      if (
        forecast &&
        forecast <
          today
      ) {
        priority =
          "critical";

        const delayDays =
          getDelayDays(
            forecast,
            today
          );

        urgency =
          delayDays *
            24 +
          500;

        value =
          delayDays ===
          1
            ? "1 dia"
            : `${delayDays} dias`;
      }

      // =====================================================
      // PREVISÃO PARA HOJE
      // =====================================================

      else if (
        forecast ===
        today
      ) {
        priority =
          "warning";

        urgency =
          200;

        value =
          "Hoje";
      }

      // =====================================================
      // SIENGE DIZ ENTREGUE, MAS SOLICITANTE NÃO CONFIRMOU
      // =====================================================

      else if (
        item.delivery_status ===
        "Entregue"
      ) {
        priority =
          "warning";

        urgency =
          150;

        value =
          "Confirmar";
      }

      // =====================================================
      // AINDA NÃO É PENDÊNCIA
      // =====================================================

      if (
        !priority
      ) {
        continue;
      }

      const sc =
        item.sc_number ??
        "—";

      const requestKey =
        requestKeyByGroup.get(
          createRequestGroupKey(
            item
          )
        ) ??
        null;

      const href =
        getReceiptHref({
          canFinance,
          sc,
          requestKey,
        });

      entries.push(
        {
          id:
            `receipt-${item.id}`,

          type:
            "recebimento",

          priority,

          icon:
            "receipt",

          title:
            `SC ${sc} aguardando confirmação de recebimento`,

          description:
            item.insumo ??
            "O solicitante ainda não confirmou o recebimento deste item.",

          meta:
            item
              .requester_sienge_username,

          secondary:
            item.order_number
              ? `Pedido ${item.order_number}`
              : item
                  .supplier_name,

          value,

          href,

          actionLabel:
            canFinance
              ? "Acompanhar pedido"
              : "Atualizar recebimento",

          searchText:
            normalizeSearch(
              [
                sc,
                item.insumo,
                item
                  .requester_sienge_username,
                item
                  .cost_center_or_site,
                item
                  .order_number,
                item
                  .supplier_name,
                item
                  .delivery_status,
                confirmation
                  ?.delivery_status,
                "recebimento",
                "confirmação",
              ]
                .filter(
                  Boolean
                )
                .join(
                  " "
                )
            ),

          urgency,

          createdAt:
            confirmation
              ?.updated_at ??
            null,

          details: [
            {
              label:
                "SC",

              value:
                sc,
            },

            {
              label:
                "Pedido",

              value:
                item
                  .order_number ??
                "Não informado",
            },

            {
              label:
                "Solicitante",

              value:
                item
                  .requester_sienge_username ??
                "Não informado",
            },

            {
              label:
                "Item",

              value:
                item.insumo ??
                "Não informado",
            },

            {
              label:
                "Fornecedor",

              value:
                item
                  .supplier_name ??
                "Não informado",
            },

            {
              label:
                "Previsão",

              value:
                forecastValue
                  ? formatDate(
                      forecastValue
                    )
                  : "Não informada",
            },

            {
              label:
                "Status no Sienge",

              value:
                item
                  .delivery_status ??
                "Não informado",
            },

            {
              label:
                "Confirmação do solicitante",

              value:
                confirmation
                  ?.delivery_status ??
                "Ainda não confirmada",
            },
          ],
        }
      );
    }
  }

  // =========================================================
  // USUÁRIOS SEM VÍNCULO
  // =========================================================

  if (
    canFinance
  ) {
    for (
      const username
      of unmatchedUsers
    ) {
      entries.push(
        {
          id:
            `user-${username}`,

          type:
            "usuarios",

          priority:
            "warning",

          icon:
            "user",

          title:
            `${username} sem vínculo`,

          description:
            "Usuário identificado no Sienge ainda não está relacionado a um colaborador do sistema.",

          meta:
            "Integração Sienge",

          secondary:
            null,

          value:
            "Vincular",

          href:
            `/financeiro/sienge?tab=usuarios&q=${encodeURIComponent(
              username
            )}`,

          actionLabel:
            "Vincular usuário",

          searchText:
            normalizeSearch(
              `${username} sienge usuário`
            ),

          urgency:
            0,

          createdAt:
            null,

          details: [
            {
              label:
                "Usuário Sienge",

              value:
                username,
            },

            {
              label:
                "Situação",

              value:
                "Sem colaborador associado",
            },

            {
              label:
                "Origem",

              value:
                "Importação Sienge",
            },
          ],
        }
      );
    }
  }

  // =========================================================
  // ALERTAS
  // =========================================================

  for (
    const notification
    of notifications
  ) {
    const critical =
      notification.level ===
      "error";

    const href =
      notification.action_url &&
      notification.action_url.startsWith(
        "/"
      )
        ? notification.action_url
        : "/notificacoes?filtro=nao-lidas";

    entries.push(
      {
        id:
          `alert-${notification.id}`,

        type:
          "alertas",

        priority:
          critical
            ? "critical"
            : "warning",

        icon:
          "bell",

        title:
          notification.title,

        description:
          notification.message ??
          "Alerta operacional não lido.",

        meta:
          "Notificação",

        secondary:
          formatDateTime(
            notification.created_at
          ),

        value:
          critical
            ? "Crítico"
            : "Atenção",

        href,

        actionLabel:
          "Abrir atualização",

        searchText:
          normalizeSearch(
            [
              notification.title,
              notification.message,
              notification.level,
            ]
              .filter(
                Boolean
              )
              .join(
                " "
              )
          ),

        urgency:
          critical
            ? 10000
            : 1000,

        createdAt:
          notification.created_at,

        details: [
          {
            label:
              "Nível",

            value:
              critical
                ? "Crítico"
                : "Atenção",
          },

          {
            label:
              "Registrado em",

            value:
              formatDateTime(
                notification.created_at
              ),
          },

          {
            label:
              "Situação",

            value:
              "Não lido",
          },
        ],
      }
    );
  }

  // =========================================================
  // ORDENAÇÃO
  // =========================================================

  const priorityWeight = {
    critical:
      0,

    warning:
      1,

    info:
      2,
  };

  entries.sort(
    (
      a,
      b
    ) => {
      const priorityDifference =
        priorityWeight[
          a.priority
        ] -
        priorityWeight[
          b.priority
        ];

      if (
        priorityDifference !==
        0
      ) {
        return priorityDifference;
      }

      if (
        a.urgency !==
        b.urgency
      ) {
        return (
          b.urgency -
          a.urgency
        );
      }

      return a.title.localeCompare(
        b.title,
        "pt-BR"
      );
    }
  );

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <PendenciasClient
      entries={
        entries
      }
      summary={
        summary
      }
      canFinance={
        canFinance
      }
      initialType={
        initialType
      }
      initialQuery={
        initialQuery
      }
    />
  );
}

// ============================================================
// SC MAP
// ============================================================

function createScMap(
  rows: SlaRow[]
) {
  const map =
    new Map<
      string,
      SlaRow
    >();

  for (
    const row
    of rows
  ) {
    const key =
      row.sc_number ??
      row.item_id;

    const current =
      map.get(
        key
      );

    if (
      !current
    ) {
      map.set(
        key,
        row
      );

      continue;
    }

    const currentHours =
      numberValue(
        current.elapsed_hours
      );

    const newHours =
      numberValue(
        row.elapsed_hours
      );

    if (
      newHours >
      currentHours
    ) {
      map.set(
        key,
        row
      );
    }
  }

  return map;
}

// ============================================================
// AGRUPAMENTO DO REQUEST KEY
// ============================================================

function createRequestGroupKey(
  row: {
    sc_number:
      | string
      | null;

    requester_profile_id:
      | string
      | null;

    requester_sienge_username?:
      | string
      | null;

    cost_center_or_site:
      | string
      | null;
  }
) {
  const requester =
    row.requester_profile_id ??
    row.requester_sienge_username ??
    "";

  return [
    normalizeKey(
      row.sc_number
    ),

    normalizeKey(
      requester
    ),

    normalizeKey(
      row.cost_center_or_site
    ),
  ].join(
    "::"
  );
}

function normalizeKey(
  value:
    | string
    | null
    | undefined
) {
  return String(
    value ??
    ""
  )
    .trim()
    .toUpperCase();
}

// ============================================================
// HREF PADRÃO
// ============================================================

function getRequestHref(
  canFinance: boolean,
  sc: string
) {
  const encoded =
    encodeURIComponent(
      sc
    );

  return canFinance
    ? `/financeiro/sienge?tab=pedidos&q=${encoded}`
    : `/meus-pedidos?q=${encoded}`;
}

// ============================================================
// HREF RECEBIMENTO
// ============================================================

function getReceiptHref({
  canFinance,
  sc,
  requestKey,
}: {
  canFinance: boolean;

  sc: string;

  requestKey:
    | string
    | null;
}) {
  if (
    canFinance
  ) {
    return `/financeiro/sienge?tab=pedidos&q=${encodeURIComponent(
      sc
    )}`;
  }

  if (
    requestKey
  ) {
    return `/meus-pedidos/${encodeURIComponent(
      requestKey
    )}`;
  }

  return `/meus-pedidos?q=${encodeURIComponent(
    sc
  )}`;
}

// ============================================================
// SEARCH
// ============================================================

function createSearchText(
  row: SlaRow
) {
  return normalizeSearch(
    [
      row.sc_number,
      row.insumo,
      row
        .requester_sienge_username,
      row
        .cost_center_or_site,
      row.order_number,
      row.supplier_name,
      row.tracking_status,
      row.delivery_status,
    ]
      .filter(
        Boolean
      )
      .join(
        " "
      )
  );
}

function normalizeSearch(
  value: string
) {
  return value
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

// ============================================================
// DATA DE NEGÓCIO
// ============================================================

function getTodayIsoDate() {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          "America/Sao_Paulo",

        year:
          "numeric",

        month:
          "2-digit",

        day:
          "2-digit",
      }
    ).formatToParts(
      new Date()
    );

  const year =
    parts.find(
      (
        part
      ) =>
        part.type ===
        "year"
    )?.value;

  const month =
    parts.find(
      (
        part
      ) =>
        part.type ===
        "month"
    )?.value;

  const day =
    parts.find(
      (
        part
      ) =>
        part.type ===
        "day"
    )?.value;

  if (
    !year ||
    !month ||
    !day
  ) {
    return new Date()
      .toISOString()
      .slice(
        0,
        10
      );
  }

  return `${year}-${month}-${day}`;
}

// ============================================================
// DATE HELPERS
// ============================================================

function extractIsoDate(
  value: string
) {
  return (
    value.match(
      /^\d{4}-\d{2}-\d{2}/
    )?.[0] ??
    null
  );
}

function formatDate(
  value: string
) {
  const iso =
    extractIsoDate(
      value
    );

  if (
    !iso
  ) {
    return value;
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

function formatDateTime(
  value: string
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
    return value;
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      timeZone:
        "America/Sao_Paulo",

      day:
        "2-digit",

      month:
        "2-digit",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  ).format(
    date
  );
}

// ============================================================
// ATRASO
// ============================================================

function getDelayDays(
  value:
    | string
    | null,
  today: string
) {
  if (
    !value
  ) {
    return 0;
  }

  const forecast =
    extractIsoDate(
      value
    );

  if (
    !forecast
  ) {
    return 0;
  }

  const forecastDate =
    new Date(
      `${forecast}T12:00:00Z`
    );

  const todayDate =
    new Date(
      `${today}T12:00:00Z`
    );

  const difference =
    Math.floor(
      (
        todayDate.getTime() -
        forecastDate.getTime()
      ) /
        86400000
    );

  return Math.max(
    0,
    difference
  );
}

// ============================================================
// SLA TIME
// ============================================================

function formatElapsedTime(
  value:
    | string
    | number
    | null
) {
  const hours =
    numberValue(
      value
    );

  if (
    hours <=
    0
  ) {
    return "0h";
  }

  if (
    hours <
    24
  ) {
    return `${Math.round(
      hours
    )}h`;
  }

  const days =
    hours /
    24;

  return `${days.toFixed(
    days >=
    10
      ? 0
      : 1
  )} dias`;
}

function numberValue(
  value:
    | string
    | number
    | null
) {
  const result =
    Number(
      value ??
      0
    );

  return Number.isFinite(
    result
  )
    ? result
    : 0;
}