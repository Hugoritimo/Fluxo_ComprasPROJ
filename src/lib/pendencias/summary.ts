import type {
    SupabaseClient,
} from "@supabase/supabase-js";

// ============================================================
// TIPOS PÚBLICOS
// ============================================================

export type PendingSummary = {
    total: number;

    critical: number;

    attention: number;

    status:
    | "healthy"
    | "attention"
    | "critical";

    categories: {
        sla: number;

        warning: number;

        deliveries: number;

        // ====================================================
        // NOVO:
        // CONFIRMAÇÃO DE RECEBIMENTO PELO SOLICITANTE
        // ====================================================

        receipts: number;

        receiptCritical: number;

        receiptAttention: number;

        unmatched: number;

        alerts: number;

        alertWarnings: number;

        alertErrors: number;
    };

    generatedAt: string;
};

// ============================================================
// SLA
// ============================================================

export type PendingSlaRow = {
    item_id: string;

    sc_number:
    | string
    | null;

    delivery_or_pickup_forecast:
    | string
    | null;

    tracking_status:
    | string
    | null;

    sla_status:
    | string
    | null;
};

// ============================================================
// ITEM SIENGE PARA CONFIRMAÇÃO DE ENTREGA
// ============================================================

export type PendingReceiptItemRow = {
    id: string;

    sc_number:
    | string
    | null;

    order_number:
    | string
    | null;

    requester_profile_id:
    | string
    | null;

    initial_delivery_forecast:
    | string
    | null;

    delivery_or_pickup_forecast:
    | string
    | null;

    // ========================================================
    // Status vindo da importação do Sienge.
    //
    // IMPORTANTE:
    // ele NÃO substitui a confirmação do solicitante.
    // ========================================================

    delivery_status:
    | string
    | null;
};

// ============================================================
// CONFIRMAÇÃO DO SOLICITANTE
// ============================================================

export type PendingDeliveryConfirmationRow = {
    item_id: string;

    requester_profile_id:
    | string
    | null;

    delivery_status:
    | string
    | null;

    delivery_date?:
    | string
    | null;

    received_by?:
    | string
    | null;

    invoice_number?:
    | string
    | null;

    updated_at?:
    | string
    | null;
};

// ============================================================
// USUÁRIO SIENGE
// ============================================================

export type PendingSiengeUserRow = {
    requester_sienge_username:
    | string
    | null;

    requester_profile_id:
    | string
    | null;
};

// ============================================================
// NOTIFICAÇÃO
// ============================================================

export type PendingNotificationRow = {
    id?: string;

    level:
    | string
    | null;

    read_at:
    | string
    | null;
};

// ============================================================
// BUILD SUMMARY
// ============================================================
//
// Essa função continua sendo a REGRA ÚNICA.
//
// Dashboard, API, Sidebar e Central de Pendências devem usar
// exatamente a mesma lógica.
//
// Os novos arrays são opcionais para manter compatibilidade
// com chamadas antigas de buildPendingSummary() durante a
// transição.
// ============================================================

export function buildPendingSummary({
    slaRows,
    siengeUsers,
    notifications,
    canFinance,
    receiptItems = [],
    deliveryConfirmations = [],
}: {
    slaRows: PendingSlaRow[];

    siengeUsers: PendingSiengeUserRow[];

    notifications: PendingNotificationRow[];

    canFinance: boolean;

    receiptItems?: PendingReceiptItemRow[];

    deliveryConfirmations?: PendingDeliveryConfirmationRow[];
}): PendingSummary {
    // ==========================================================
    // SLA VENCIDO
    // ==========================================================

    const overdueScs =
        new Set(
            slaRows
                .filter(
                    (
                        row
                    ) =>
                        row.sla_status ===
                        "overdue"
                )
                .map(
                    (
                        row
                    ) =>
                        row.sc_number ??
                        row.item_id
                )
        );

    // ==========================================================
    // SLA EM ATENÇÃO
    // ==========================================================

    const warningScs =
        new Set(
            slaRows
                .filter(
                    (
                        row
                    ) =>
                        row.sla_status ===
                        "warning"
                )
                .map(
                    (
                        row
                    ) =>
                        row.sc_number ??
                        row.item_id
                )
                .filter(
                    (
                        key
                    ) =>
                        !overdueScs.has(
                            key
                        )
                )
        );

    // ==========================================================
    // DATA DE NEGÓCIO
    // ==========================================================

    const today =
        getTodayIsoDate();

    // ==========================================================
    // ENTREGA VENCIDA
    //
    // Esse é o atraso operacional vindo do processo/Sienge.
    // ==========================================================

    const overdueDeliveryScs =
        new Set(
            slaRows
                .filter(
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
                .map(
                    (
                        row
                    ) =>
                        row.sc_number ??
                        row.item_id
                )
        );

    // ==========================================================
    // CONFIRMAÇÃO DO RECEBIMENTO PELO SOLICITANTE
    // ==========================================================
    //
    // REGRA:
    //
    // 1. Só analisamos item que já possui PEDIDO.
    //
    // 2. Somente a tabela
    //    sienge_requester_delivery_confirmations
    //    encerra essa pendência.
    //
    // 3. Status "Entregue" vindo do Sienge NÃO encerra
    //    automaticamente a confirmação do solicitante.
    //
    // 4. Previsão vencida:
    //    CRÍTICA.
    //
    // 5. Previsão para hoje:
    //    ATENÇÃO.
    //
    // 6. Se o Sienge já disser "Entregue", mas o solicitante
    //    ainda não confirmou:
    //    ATENÇÃO.
    //
    // 7. Previsão futura:
    //    ainda não gera pendência.
    //
    // 8. Sem previsão:
    //    não gera pendência por enquanto, exceto quando o
    //    próprio Sienge já sinaliza entrega.
    // ==========================================================

    const confirmationByItem =
        new Map<
            string,
            PendingDeliveryConfirmationRow
        >(
            deliveryConfirmations.map(
                (
                    confirmation
                ) => [
                        String(
                            confirmation.item_id
                        ),

                        confirmation,
                    ]
            )
        );

    const receiptCriticalItems =
        new Set<string>();

    const receiptAttentionItems =
        new Set<string>();

    for (
        const item
        of receiptItems
    ) {
        // ======================================================
        // SEM PEDIDO:
        // ainda não existe obrigação de confirmar recebimento.
        // ======================================================

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

        // ======================================================
        // JÁ CONFIRMADO PELO SOLICITANTE
        // ======================================================

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

        // ======================================================
        // PREVISÃO VENCIDA
        // ======================================================

        if (
            forecast &&
            forecast <
            today
        ) {
            receiptCriticalItems.add(
                String(
                    item.id
                )
            );

            continue;
        }

        // ======================================================
        // PREVISÃO É HOJE
        // ======================================================

        if (
            forecast ===
            today
        ) {
            receiptAttentionItems.add(
                String(
                    item.id
                )
            );

            continue;
        }

        // ======================================================
        // SIENGE DIZ QUE FOI ENTREGUE,
        // MAS SOLICITANTE AINDA NÃO CONFIRMOU
        // ======================================================

        if (
            item.delivery_status ===
            "Entregue"
        ) {
            receiptAttentionItems.add(
                String(
                    item.id
                )
            );
        }
    }

    // ==========================================================
    // TOTAL DE RECEBIMENTOS PENDENTES
    // ==========================================================

    const receipts =
        receiptCriticalItems.size +
        receiptAttentionItems.size;

    // ==========================================================
    // USUÁRIOS SIENGE SEM VÍNCULO
    // ==========================================================

    const unmatchedUsers =
        canFinance
            ? new Set(
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
            : new Set<string>();

    // ==========================================================
    // ALERTAS
    // ==========================================================

    const unreadAlerts =
        notifications.filter(
            (
                notification
            ) =>
                !notification.read_at &&
                (
                    notification.level ===
                    "warning" ||
                    notification.level ===
                    "error"
                )
        );

    const alertWarnings =
        unreadAlerts.filter(
            (
                notification
            ) =>
                notification.level ===
                "warning"
        ).length;

    const alertErrors =
        unreadAlerts.filter(
            (
                notification
            ) =>
                notification.level ===
                "error"
        ).length;

    const alerts =
        alertWarnings +
        alertErrors;

    // ==========================================================
    // TOTAL
    // ==========================================================
    //
    // Uma mesma SC pode possuir múltiplos tipos de problema.
    //
    // Exemplo:
    //
    // - SLA vencido;
    // - entrega vencida;
    // - recebimento ainda não confirmado.
    //
    // São responsabilidades diferentes e permanecem
    // contabilizadas separadamente.
    // ==========================================================

    const total =
        overdueScs.size +
        warningScs.size +
        overdueDeliveryScs.size +
        receiptCriticalItems.size +
        receiptAttentionItems.size +
        unmatchedUsers.size +
        alerts;

    // ==========================================================
    // CRÍTICAS
    // ==========================================================

    const critical =
        overdueScs.size +
        overdueDeliveryScs.size +
        receiptCriticalItems.size +
        alertErrors;

    // ==========================================================
    // ATENÇÃO
    // ==========================================================

    const attention =
        warningScs.size +
        receiptAttentionItems.size +
        unmatchedUsers.size +
        alertWarnings;

    // ==========================================================
    // STATUS GLOBAL
    // ==========================================================

    const status:
        PendingSummary["status"] =
        critical >
            0
            ? "critical"
            : attention >
                0
                ? "attention"
                : "healthy";

    // ==========================================================
    // RESULTADO
    // ==========================================================

    return {
        total,

        critical,

        attention,

        status,

        categories: {
            sla:
                overdueScs.size,

            warning:
                warningScs.size,

            deliveries:
                overdueDeliveryScs.size,

            receipts,

            receiptCritical:
                receiptCriticalItems.size,

            receiptAttention:
                receiptAttentionItems.size,

            unmatched:
                unmatchedUsers.size,

            alerts,

            alertWarnings,

            alertErrors,
        },

        generatedAt:
            new Date().toISOString(),
    };
}

// ============================================================
// CONSULTA COMPLETA
// ============================================================
//
// Usada principalmente pela API do contador.
//
// SEGURANÇA:
// para usuário comum, sienge_purchase_items é explicitamente
// filtrado por requester_profile_id.
//
// Depois usamos os IDs desses itens para limitar também os
// registros de SLA.
//
// Assim "Minhas Pendências" não depende exclusivamente da RLS.
// ============================================================

export async function getPendingSummary({
    supabase,
    userId,
    canFinance,
}: {
    supabase: SupabaseClient;

    userId: string;

    canFinance: boolean;
}): Promise<PendingSummary> {
    // ==========================================================
    // SLA
    // ==========================================================

    const slaPromise =
        supabase
            .from(
                "v_sienge_item_sla"
            )
            .select(
                `
                item_id,
                sc_number,
                delivery_or_pickup_forecast,
                tracking_status,
                sla_status
                `
            );

    // ==========================================================
    // ITENS SIENGE
    //
    // Além de alimentar a nova regra de recebimento, essa
    // consulta também fornece o escopo explícito dos itens do
    // usuário comum.
    // ==========================================================

    let receiptItemsQuery =
        supabase
            .from(
                "sienge_purchase_items"
            )
            .select(
                `
                id,
                sc_number,
                order_number,
                requester_profile_id,
                initial_delivery_forecast,
                delivery_or_pickup_forecast,
                delivery_status
                `
            );

    if (
        !canFinance
    ) {
        receiptItemsQuery =
            receiptItemsQuery.eq(
                "requester_profile_id",
                userId
            );
    }

    // ==========================================================
    // CONFIRMAÇÕES DO SOLICITANTE
    // ==========================================================

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

    // ==========================================================
    // USUÁRIOS SIENGE SEM VÍNCULO
    // ==========================================================

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
                        [] as PendingSiengeUserRow[],

                    error:
                        null,
                }
            );

    // ==========================================================
    // ALERTAS
    // ==========================================================

    let alertsQuery =
        supabase
            .from(
                "system_notifications"
            )
            .select(
                `
                id,
                level,
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
            );

    if (
        !canFinance
    ) {
        alertsQuery =
            alertsQuery.eq(
                "user_id",
                userId
            );
    }

    // ==========================================================
    // EXECUÇÃO
    // ==========================================================

    const [
        slaResult,
        receiptItemsResult,
        confirmationsResult,
        siengeUsersResult,
        alertsResult,
    ] =
        await Promise.all([
            slaPromise,
            receiptItemsQuery,
            confirmationsQuery,
            siengeUsersPromise,
            alertsQuery,
        ]);

    // ==========================================================
    // ERROS
    // ==========================================================

    if (
        slaResult.error
    ) {
        console.error(
            "Erro ao calcular SLA da Central de Pendências:",
            slaResult.error
        );
    }

    if (
        receiptItemsResult.error
    ) {
        console.error(
            "Erro ao calcular confirmações pendentes de recebimento:",
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
        siengeUsersResult.error
    ) {
        console.error(
            "Erro ao calcular usuários Sienge sem vínculo:",
            siengeUsersResult.error
        );
    }

    if (
        alertsResult.error
    ) {
        console.error(
            "Erro ao calcular alertas da Central de Pendências:",
            alertsResult.error
        );
    }

    // ==========================================================
    // DADOS DOS ITENS
    // ==========================================================

    const receiptItems =
        (
            receiptItemsResult.data ??
            []
        ) as PendingReceiptItemRow[];

    // ==========================================================
    // SEGURANÇA EXTRA DO SLA
    // ==========================================================
    //
    // Para Finance/Admin/Superadmin:
    // todos os registros permitidos pela RLS.
    //
    // Para colaborador:
    // somente item cujo ID existe na consulta explicitamente
    // filtrada por requester_profile_id = userId.
    // ==========================================================

    const allSlaRows =
        (
            slaResult.data ??
            []
        ) as PendingSlaRow[];

    const scopedSlaRows =
        canFinance
            ? allSlaRows
            : filterSlaRowsByOwnedItems(
                allSlaRows,
                receiptItems
            );

    // ==========================================================
    // EVITAR FALSO POSITIVO
    // ==========================================================
    //
    // Se a tabela de confirmações estiver indisponível por
    // qualquer motivo, NÃO contabilizamos recebimentos
    // pendentes.
    //
    // Caso contrário, a ausência da tabela poderia transformar
    // todos os pedidos em "não confirmados".
    // ==========================================================

    const canCalculateReceipts =
        !receiptItemsResult.error &&
        !confirmationsResult.error;

    // ==========================================================
    // BUILD
    // ==========================================================

    return buildPendingSummary(
        {
            slaRows:
                scopedSlaRows,

            siengeUsers:
                (
                    siengeUsersResult.data ??
                    []
                ) as PendingSiengeUserRow[],

            notifications:
                (
                    alertsResult.data ??
                    []
                ) as PendingNotificationRow[],

            receiptItems:
                canCalculateReceipts
                    ? receiptItems
                    : [],

            deliveryConfirmations:
                canCalculateReceipts
                    ? (
                        confirmationsResult.data ??
                        []
                    ) as PendingDeliveryConfirmationRow[]
                    : [],

            canFinance,
        }
    );
}

// ============================================================
// FILTRAR SLA PELOS ITENS DO SOLICITANTE
// ============================================================

function filterSlaRowsByOwnedItems(
    slaRows: PendingSlaRow[],
    ownedItems: PendingReceiptItemRow[]
) {
    const allowedItemIds =
        new Set(
            ownedItems.map(
                (
                    item
                ) =>
                    String(
                        item.id
                    )
            )
        );

    return slaRows.filter(
        (
            row
        ) =>
            allowedItemIds.has(
                String(
                    row.item_id
                )
            )
    );
}

// ============================================================
// DATA LOCAL DE NEGÓCIO
// ============================================================
//
// Não usamos simplesmente new Date().setHours(0,0,0,0),
// porque no deploy da Vercel o servidor pode estar em UTC.
//
// A regra da aplicação considera America/Sao_Paulo.
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
// EXTRAIR YYYY-MM-DD
// ============================================================

function extractIsoDate(
    value: string
) {
    const match =
        value.match(
            /^\d{4}-\d{2}-\d{2}/
        );

    return (
        match?.[0] ??
        null
    );
}