"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type CardRequestState = {
    error: string | null;
};

function parseMoney(value: FormDataEntryValue | null) {
    let input = String(value ?? "").trim();

    if (!input) {
        return 0;
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
        : 0;
}

export async function createCardRequest(
    _previousState: CardRequestState,
    formData: FormData
): Promise<CardRequestState> {
    const siengeRequestNumber = String(
        formData.get("sienge_request_number") ??
        ""
    ).trim();

    const costCenterOrSite = String(
        formData.get("cost_center_or_site") ??
        ""
    ).trim();

    const suppliersText = String(
        formData.get("suppliers_text") ?? ""
    ).trim();

    const estimatedAmount = parseMoney(
        formData.get("estimated_amount")
    );

    const purchaseReason = String(
        formData.get("purchase_reason") ?? ""
    ).trim();

    const purchaseReasonOther = String(
        formData.get("purchase_reason_other") ??
        ""
    ).trim();

    const purpose = String(
        formData.get("purpose") ?? ""
    ).trim();

    const notes = String(
        formData.get("notes") ?? ""
    ).trim();

    if (!siengeRequestNumber) {
        return {
            error:
                "Informe o número do pedido no Sienge.",
        };
    }

    if (!costCenterOrSite) {
        return {
            error:
                "Informe o centro de custo ou obra.",
        };
    }

    if (!suppliersText) {
        return {
            error:
                "Informe o fornecedor da compra.",
        };
    }

    if (estimatedAmount <= 0) {
        return {
            error:
                "Informe um valor previsto maior que zero.",
        };
    }

    if (
        ![
            "emergency",
            "supplier_not_registered",
            "other",
        ].includes(purchaseReason)
    ) {
        return {
            error:
                "Informe o motivo da compra por cartão.",
        };
    }

    if (
        purchaseReason === "other" &&
        !purchaseReasonOther
    ) {
        return {
            error:
                "Informe qual é o outro motivo da compra.",
        };
    }

    if (!purpose) {
        return {
            error:
                "Informe a finalidade da compra.",
        };
    }

    const supabase = await createClient();

    const { data: claimsData } =
        await supabase.auth.getClaims();

    if (!claimsData?.claims?.sub) {
        return {
            error:
                "Sua sessão expirou. Entre novamente no sistema.",
        };
    }

    const { data, error } =
        await supabase.rpc(
            "create_credit_card_request",
            {
                p_sienge_request_number:
                    siengeRequestNumber,

                p_cost_center_or_site:
                    costCenterOrSite,

                p_suppliers_text:
                    suppliersText,

                p_estimated_amount:
                    estimatedAmount,

                p_purchase_reason:
                    purchaseReason,

                p_purchase_reason_other:
                    purchaseReasonOther || null,

                p_purpose:
                    purpose,

                p_notes:
                    notes || null,
            }
        );

    if (error) {
        console.error(
            "Erro ao criar solicitação:",
            error
        );

        return {
            error:
                error.message ||
                "Não foi possível registrar a solicitação.",
        };
    }

    if (!data) {
        return {
            error:
                "A solicitação foi processada, mas não foi possível localizar seu código.",
        };
    }

    revalidatePath("/dashboard");
    revalidatePath("/solicitacoes");

    redirect(`/solicitacoes/${data}`);
}