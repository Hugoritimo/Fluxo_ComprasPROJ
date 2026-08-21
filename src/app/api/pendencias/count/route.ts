import {
    NextResponse,
} from "next/server";

import {
    createClient,
} from "@/lib/supabase/server";

// ============================================================
// TIPOS
// ============================================================

type SlaRow = {
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

type SiengeUserRow = {
    requester_sienge_username:
    | string
    | null;

    requester_profile_id:
    | string
    | null;
};

// ============================================================
// GET
// ============================================================

export async function GET() {
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
        return NextResponse.json(
            {
                error:
                    "Não autenticado.",
            },
            {
                status: 401,
            }
        );
    }

    // =========================================================
    // PERMISSÕES
    // =========================================================

    const {
        data: rolesData,
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
            (row) =>
                row.role
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
    // CONSULTAS
    // =========================================================

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
            : Promise.resolve({
                data: [],
                error: null,
            });

    let alertsQuery =
        supabase
            .from(
                "system_notifications"
            )
            .select(
                "id",
                {
                    count:
                        "exact",

                    head:
                        true,
                }
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
            "Erro ao calcular usuários sem vínculo:",
            siengeUsersResult.error
        );
    }

    if (
        alertsResult.error
    ) {
        console.error(
            "Erro ao calcular alertas:",
            alertsResult.error
        );
    }

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

    // =========================================================
    // SLA VENCIDO
    // =========================================================

    const overdueScs =
        new Set(
            slaRows
                .filter(
                    (row) =>
                        row.sla_status ===
                        "overdue"
                )
                .map(
                    (row) =>
                        row.sc_number ??
                        row.item_id
                )
        );

    // =========================================================
    // SLA EM ATENÇÃO
    // =========================================================

    const warningScs =
        new Set(
            slaRows
                .filter(
                    (row) =>
                        row.sla_status ===
                        "warning"
                )
                .map(
                    (row) =>
                        row.sc_number ??
                        row.item_id
                )
                .filter(
                    (key) =>
                        !overdueScs.has(
                            key
                        )
                )
        );

    // =========================================================
    // ENTREGA VENCIDA
    // =========================================================

    const today =
        startOfToday();

    const overdueDeliveryScs =
        new Set(
            slaRows
                .filter(
                    (row) => {
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
                            parseDate(
                                row
                                    .delivery_or_pickup_forecast
                            );

                        if (!forecast) {
                            return false;
                        }

                        return (
                            forecast.getTime() <
                            today.getTime()
                        );
                    }
                )
                .map(
                    (row) =>
                        row.sc_number ??
                        row.item_id
                )
        );

    // =========================================================
    // USUÁRIOS SEM VÍNCULO
    // =========================================================

    const unmatchedUsers =
        canFinance
            ? new Set(
                siengeUsers
                    .filter(
                        (row) =>
                            row
                                .requester_sienge_username &&
                            !row
                                .requester_profile_id
                    )
                    .map(
                        (row) =>
                            row
                                .requester_sienge_username!
                                .trim()
                                .toUpperCase()
                    )
            )
            : new Set<string>();

    // =========================================================
    // ALERTAS
    // =========================================================

    const alerts =
        alertsResult.count ??
        0;

    // =========================================================
    // TOTAL
    // =========================================================

    const total =
        overdueScs.size +
        warningScs.size +
        overdueDeliveryScs.size +
        unmatchedUsers.size +
        alerts;

    return NextResponse.json(
        {
            total,

            critical:
                overdueScs.size +
                overdueDeliveryScs.size,

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
            },
        },
        {
            headers: {
                "Cache-Control":
                    "no-store, no-cache, must-revalidate",
            },
        }
    );
}

// ============================================================
// DATA
// ============================================================

function startOfToday() {
    const date =
        new Date();

    date.setHours(
        0,
        0,
        0,
        0
    );

    return date;
}

function parseDate(
    value: string
) {
    const date =
        new Date(
            `${value.slice(
                0,
                10
            )}T12:00:00`
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date;
}