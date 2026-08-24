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

        unmatched: number;

        alerts: number;

        alertWarnings: number;

        alertErrors: number;
    };

    generatedAt: string;
};

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

export type PendingSiengeUserRow = {
    requester_sienge_username:
    | string
    | null;

    requester_profile_id:
    | string
    | null;
};

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
// Essa função é a REGRA ÚNICA.
//
// Dashboard, API e futuramente a Central de Pendências podem
// usar exatamente a mesma lógica.
// ============================================================

export function buildPendingSummary({
    slaRows,
    siengeUsers,
    notifications,
    canFinance,
}: {
    slaRows: PendingSlaRow[];

    siengeUsers: PendingSiengeUserRow[];

    notifications: PendingNotificationRow[];

    canFinance: boolean;
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
    // ENTREGA VENCIDA
    // ==========================================================

    const today =
        getTodayIsoDate();

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

                        if (!forecast) {
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
    // "total" representa quantidade de problemas operacionais.
    //
    // Uma SC pode possuir, por exemplo:
    // - SLA vencido
    // - entrega vencida
    //
    // São duas pendências diferentes e permanecem contabilizadas
    // separadamente.
    // ==========================================================

    const total =
        overdueScs.size +
        warningScs.size +
        overdueDeliveryScs.size +
        unmatchedUsers.size +
        alerts;

    // ==========================================================
    // CRÍTICAS
    // ==========================================================
    //
    // Agora erros de sistema/notificação também entram como
    // criticidade, o que não acontecia na implementação anterior.
    // ==========================================================

    const critical =
        overdueScs.size +
        overdueDeliveryScs.size +
        alertErrors;

    // ==========================================================
    // ATENÇÃO
    // ==========================================================

    const attention =
        warningScs.size +
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
// Usada pela API.
//
// Outras Server Components podem usar buildPendingSummary()
// quando já tiverem os dados carregados.
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
    // USUÁRIOS SIENGE
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

    if (!canFinance) {
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
        siengeUsersResult,
        alertsResult,
    ] =
        await Promise.all([
            slaPromise,
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
    // BUILD
    // ==========================================================

    return buildPendingSummary(
        {
            slaRows:
                (
                    slaResult.data ??
                    []
                ) as PendingSlaRow[],

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

            canFinance,
        }
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