"use server";

import {
    revalidatePath,
} from "next/cache";

import {
    createClient,
} from "@/lib/supabase/server";

export type ReviewResult = {
    success: boolean;
    error: string | null;
};

export async function approveAccountability(
    requestId: string,
    notes: string
): Promise<ReviewResult> {
    if (!requestId) {
        return {
            success: false,
            error:
                "Não foi possível identificar a solicitação.",
        };
    }

    const supabase =
        await createClient();

    const {
        error,
    } =
        await supabase.rpc(
            "finance_approve_accountability_v2",
            {
                p_request_id:
                    requestId,

                p_notes:
                    notes.trim() ||
                    null,
            }
        );

    if (error) {
        console.error(
            "Erro ao aprovar prestação:",
            error
        );

        return {
            success: false,
            error:
                error.message ||
                "Não foi possível aprovar a prestação de contas.",
        };
    }

    refreshPaths(
        requestId
    );

    return {
        success: true,
        error: null,
    };
}

export async function requestAccountabilityCorrection(
    requestId: string,
    notes: string
): Promise<ReviewResult> {
    if (!requestId) {
        return {
            success: false,
            error:
                "Não foi possível identificar a solicitação.",
        };
    }

    if (!notes.trim()) {
        return {
            success: false,
            error:
                "Informe o que precisa ser corrigido.",
        };
    }

    const supabase =
        await createClient();

    const {
        error,
    } =
        await supabase.rpc(
            "finance_request_accountability_correction_v2",
            {
                p_request_id:
                    requestId,

                p_notes:
                    notes.trim(),
            }
        );

    if (error) {
        console.error(
            "Erro ao solicitar correção:",
            error
        );

        return {
            success: false,
            error:
                error.message ||
                "Não foi possível solicitar a correção.",
        };
    }

    refreshPaths(
        requestId
    );

    return {
        success: true,
        error: null,
    };
}

function refreshPaths(
    requestId: string
) {
    revalidatePath(
        "/dashboard"
    );

    revalidatePath(
        "/financeiro/devolucoes"
    );

    revalidatePath(
        `/financeiro/devolucoes/${requestId}`
    );

    revalidatePath(
        "/financeiro/solicitacoes"
    );

    revalidatePath(
        `/financeiro/solicitacoes/${requestId}`
    );

    revalidatePath(
        `/solicitacoes/${requestId}`
    );
}