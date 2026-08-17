"use server";

import {
    revalidatePath,
} from "next/cache";

import {
    createClient,
} from "@/lib/supabase/server";

export type ReviewReturnState = {
    error: string | null;
    success: string | null;
};

export async function reviewReturn(
    _previousState: ReviewReturnState,
    formData: FormData
): Promise<ReviewReturnState> {
    const requestId =
        String(
            formData.get(
                "request_id"
            ) ?? ""
        ).trim();

    const decision =
        String(
            formData.get(
                "decision"
            ) ?? ""
        ).trim();

    const reviewNotes =
        String(
            formData.get(
                "review_notes"
            ) ?? ""
        ).trim();

    if (!requestId) {
        return {
            error:
                "Solicitação inválida.",
            success: null,
        };
    }

    if (
        ![
            "approve",
            "correction",
        ].includes(
            decision
        )
    ) {
        return {
            error:
                "Selecione uma decisão válida.",
            success: null,
        };
    }

    if (
        decision ===
        "correction" &&
        !reviewNotes
    ) {
        return {
            error:
                "Informe o motivo da correção solicitada.",
            success: null,
        };
    }

    const supabase =
        await createClient();

    const {
        data: claimsData,
    } =
        await supabase.auth.getClaims();

    if (
        !claimsData?.claims?.sub
    ) {
        return {
            error:
                "Sua sessão expirou. Entre novamente.",
            success: null,
        };
    }

    const {
        error,
    } =
        await supabase.rpc(
            "review_card_return",
            {
                p_request_id:
                    requestId,

                p_decision:
                    decision,

                p_review_notes:
                    reviewNotes ||
                    null,
            }
        );

    if (error) {
        console.error(
            "Erro na conferência:",
            error
        );

        return {
            error:
                error.message ||
                "Não foi possível concluir a conferência.",
            success: null,
        };
    }

    revalidatePath(
        "/dashboard"
    );

    revalidatePath(
        "/devolucoes"
    );

    revalidatePath(
        "/solicitacoes"
    );

    revalidatePath(
        `/solicitacoes/${requestId}`
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

    if (
        decision === "approve"
    ) {
        return {
            error: null,
            success:
                "Prestação de contas aprovada e processo concluído.",
        };
    }

    return {
        error: null,
        success:
            "Correção solicitada ao colaborador.",
    };
}