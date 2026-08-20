"use server";

import {
    createClient,
} from "@/lib/supabase/server";

export type ExternalRequester = {
    profileId: string;
    fullName: string;
    email: string;
};

export type IdentifyRequesterResult = {
    success: boolean;
    error: string | null;
    requester: ExternalRequester | null;
};

export type ExternalCardRequestResult = {
    success: boolean;
    error: string | null;
    requestId: string | null;
};

function parseMoney(
    value: string
) {
    let input =
        value
            .trim()
            .replace(/\s/g, "")
            .replace("R$", "");

    if (!input) {
        return 0;
    }

    if (
        input.includes(".") &&
        input.includes(",")
    ) {
        input = input
            .replace(/\./g, "")
            .replace(",", ".");
    } else if (
        input.includes(",")
    ) {
        input =
            input.replace(",", ".");
    }

    const parsed =
        Number(input);

    return Number.isFinite(
        parsed
    )
        ? parsed
        : 0;
}

// ============================================================
// IDENTIFICAR COLABORADOR
// ============================================================

export async function identifyExternalRequester(
    email: string
): Promise<IdentifyRequesterResult> {
    const normalizedEmail =
        email
            .trim()
            .toLowerCase();

    if (!normalizedEmail) {
        return {
            success: false,
            error:
                "Informe seu e-mail corporativo.",
            requester: null,
        };
    }

    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "identify_external_card_requester",
            {
                p_email:
                    normalizedEmail,
            }
        );

    if (error) {
        console.error(
            "Erro ao identificar colaborador:",
            error
        );

        return {
            success: false,
            error:
                "Não foi possível validar o e-mail.",
            requester: null,
        };
    }

    const requester =
        data?.[0];

    if (!requester) {
        return {
            success: false,
            error:
                "E-mail não cadastrado no sistema ou usuário inativo.",
            requester: null,
        };
    }

    return {
        success: true,
        error: null,

        requester: {
            profileId:
                requester.profile_id,

            fullName:
                requester.full_name,

            email:
                requester.email,
        },
    };
}

// ============================================================
// CRIAR SOLICITAÇÃO
// ============================================================

export async function createExternalCardRequest(
    input: {
        email: string;

        costCenterOrSite: string;

        suppliersText: string;

        estimatedAmount: string;

        purchaseReason: string;

        purchaseReasonOther: string;

        purpose: string;

        notes: string;
    }
): Promise<ExternalCardRequestResult> {
    const estimatedAmount =
        parseMoney(
            input.estimatedAmount
        );

    if (
        !input.email.trim()
    ) {
        return {
            success: false,
            error:
                "Não foi possível identificar o solicitante.",
            requestId: null,
        };
    }

    if (
        !input.costCenterOrSite.trim()
    ) {
        return {
            success: false,
            error:
                "Informe o centro de custo ou obra.",
            requestId: null,
        };
    }

    if (
        !input.suppliersText.trim()
    ) {
        return {
            success: false,
            error:
                "Informe o fornecedor.",
            requestId: null,
        };
    }

    if (
        estimatedAmount <= 0
    ) {
        return {
            success: false,
            error:
                "Informe um valor previsto maior que zero.",
            requestId: null,
        };
    }

    if (
        ![
            "emergency",
            "supplier_not_registered",
            "other",
        ].includes(
            input.purchaseReason
        )
    ) {
        return {
            success: false,
            error:
                "Informe o motivo da compra.",
            requestId: null,
        };
    }

    if (
        input.purchaseReason ===
        "other" &&
        !input.purchaseReasonOther.trim()
    ) {
        return {
            success: false,
            error:
                "Informe qual é o outro motivo.",
            requestId: null,
        };
    }

    if (
        !input.purpose.trim()
    ) {
        return {
            success: false,
            error:
                "Informe a finalidade da compra.",
            requestId: null,
        };
    }

    const supabase =
        await createClient();

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "create_external_credit_card_request",
            {
                p_email:
                    input.email
                        .trim()
                        .toLowerCase(),

                p_cost_center_or_site:
                    input.costCenterOrSite.trim(),

                p_suppliers_text:
                    input.suppliersText.trim(),

                p_estimated_amount:
                    estimatedAmount,

                p_purchase_reason:
                    input.purchaseReason,

                p_purchase_reason_other:
                    input.purchaseReasonOther.trim() ||
                    null,

                p_purpose:
                    input.purpose.trim(),

                p_notes:
                    input.notes.trim() ||
                    null,
            }
        );

    if (error) {
        console.error(
            "Erro ao criar solicitação externa:",
            error
        );

        return {
            success: false,
            error:
                error.message ||
                "Não foi possível enviar a solicitação.",
            requestId: null,
        };
    }

    if (!data) {
        return {
            success: false,
            error:
                "A solicitação foi processada, mas não foi possível localizar seu código.",
            requestId: null,
        };
    }

    return {
        success: true,
        error: null,
        requestId:
            String(data),
    };
}