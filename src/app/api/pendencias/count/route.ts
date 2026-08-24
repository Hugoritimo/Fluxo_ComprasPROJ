import {
    NextResponse,
} from "next/server";

import {
    createClient,
} from "@/lib/supabase/server";

import {
    getPendingSummary,
} from "@/lib/pendencias/summary";

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
        data:
        claimsData,
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
                status:
                    401,
            }
        );
    }

    // =========================================================
    // PERMISSÕES
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
            "Erro ao carregar funções para contagem de pendências:",
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
    // RESUMO CENTRALIZADO
    // =========================================================

    const summary =
        await getPendingSummary(
            {
                supabase,

                userId,

                canFinance,
            }
        );

    // =========================================================
    // RESPONSE
    // =========================================================

    return NextResponse.json(
        summary,
        {
            headers: {
                "Cache-Control":
                    "no-store, no-cache, must-revalidate",
            },
        }
    );
}