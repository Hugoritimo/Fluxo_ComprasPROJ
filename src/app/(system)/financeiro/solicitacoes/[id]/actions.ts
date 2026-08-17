"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type FinanceWorkflowState = {
    error: string | null;
    success: string | null;
};

const allowedStatuses = [
    "submitted",
    "under_review",
    "awaiting_information",
    "awaiting_approval",
    "approved",
    "rejected",
    "card_reserved",
    "card_delivered",
    "in_use",
    "awaiting_return",
    "returned",
    "accountability_review",
    "completed",
    "cancelled",
] as const;

function parseMoney(
    value: FormDataEntryValue | null
) {
    let input = String(value ?? "").trim();

    if (!input) {
        return null;
    }

    input = input
        .replace(/\s/g, "")
        .replace("R$", "");

    if (
        input.includes(".") &&
        input.includes(",")
    ) {
        input = input
            .replace(/\./g, "")
            .replace(",", ".");
    } else if (input.includes(",")) {
        input = input.replace(",", ".");
    }

    const parsed = Number(input);

    return Number.isFinite(parsed)
        ? parsed
        : null;
}

function optionalString(
    value: FormDataEntryValue | null
) {
    const parsed = String(
        value ?? ""
    ).trim();

    return parsed || null;
}

export async function updateFinanceWorkflow(
    _previousState: FinanceWorkflowState,
    formData: FormData
): Promise<FinanceWorkflowState> {
    const requestId = String(
        formData.get("request_id") ?? ""
    ).trim();

    const status = String(
        formData.get("status") ?? ""
    ).trim();

    if (!requestId) {
        return {
            error:
                "Não foi possível identificar a solicitação.",
            success: null,
        };
    }

    if (
        !allowedStatuses.includes(
            status as (typeof allowedStatuses)[number]
        )
    ) {
        return {
            error: "Status inválido.",
            success: null,
        };
    }

    const approvedAmount =
        parseMoney(
            formData.get("approved_amount")
        );

    const assignedCardId =
        optionalString(
            formData.get("assigned_card_id")
        );

    const expectedReturnDate =
        optionalString(
            formData.get(
                "expected_return_date"
            )
        );

    const financeNotes =
        optionalString(
            formData.get("finance_notes")
        );

    const supabase =
        await createClient();

    const {
        data: claimsData,
    } =
        await supabase.auth.getClaims();

    if (!claimsData?.claims?.sub) {
        return {
            error:
                "Sua sessão expirou. Entre novamente no sistema.",
            success: null,
        };
    }

    const { error } =
        await supabase.rpc(
            "update_credit_card_request_workflow",
            {
                p_request_id:
                    requestId,

                p_status:
                    status,

                p_approved_amount:
                    approvedAmount,

                p_assigned_card_id:
                    assignedCardId,

                p_expected_return_date:
                    expectedReturnDate,

                p_finance_notes:
                    financeNotes,
            }
        );

    if (error) {
        console.error(
            "Erro ao atualizar solicitação:",
            error
        );

        return {
            error:
                error.message ||
                "Não foi possível atualizar a solicitação.",
            success: null,
        };
    }

    revalidatePath("/dashboard");

    revalidatePath(
        "/solicitacoes"
    );

    revalidatePath(
        `/solicitacoes/${requestId}`
    );

    revalidatePath(
        "/financeiro/solicitacoes"
    );

    revalidatePath(
        `/financeiro/solicitacoes/${requestId}`
    );

    return {
        error: null,
        success:
            "Solicitação atualizada com sucesso.",
    };
}