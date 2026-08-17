"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type PurchaseRequestState = {
    error: string | null;
};

export type PurchaseWorkflowState = {
    error: string | null;
    success: string | null;
};

const priorities = [
    "low",
    "normal",
    "high",
    "urgent",
] as const;

const purchaseStatuses = [
    "draft",
    "submitted",
    "under_review",
    "awaiting_information",
    "quotation",
    "awaiting_approval",
    "approved",
    "rejected",
    "sienge_registered",
    "order_issued",
    "awaiting_delivery",
    "partially_received",
    "received",
    "completed",
    "cancelled",
] as const;

function optionalUuid(value: FormDataEntryValue | null) {
    const parsed = String(value ?? "").trim();

    return parsed || null;
}

export async function createPurchaseRequest(
    _previousState: PurchaseRequestState,
    formData: FormData
): Promise<PurchaseRequestState> {
    const title = String(
        formData.get("title") ?? ""
    ).trim();

    const justification = String(
        formData.get("justification") ?? ""
    ).trim();

    const priorityValue = String(
        formData.get("priority") ?? "normal"
    );

    const requiredDateValue = String(
        formData.get("required_date") ?? ""
    ).trim();

    const submitMode = String(
        formData.get("submit_mode") ?? "submit"
    );

    const itemsValue = String(
        formData.get("items") ?? "[]"
    );

    if (!title) {
        return {
            error: "Informe o título do pedido.",
        };
    }

    if (!justification) {
        return {
            error: "Informe a justificativa do pedido.",
        };
    }

    if (
        !priorities.includes(
            priorityValue as (typeof priorities)[number]
        )
    ) {
        return {
            error: "Prioridade inválida.",
        };
    }

    let items: unknown;

    try {
        items = JSON.parse(itemsValue);
    } catch {
        return {
            error: "Não foi possível processar os itens.",
        };
    }

    if (!Array.isArray(items) || items.length === 0) {
        return {
            error:
                "Adicione pelo menos um item ao pedido.",
        };
    }

    const hasInvalidItem = items.some((item) => {
        if (
            typeof item !== "object" ||
            item === null
        ) {
            return true;
        }

        const current = item as {
            description?: unknown;
            quantity?: unknown;
            estimated_unit_price?: unknown;
        };

        const description = String(
            current.description ?? ""
        ).trim();

        const quantity = Number(
            current.quantity ?? 0
        );

        const unitPrice = Number(
            current.estimated_unit_price ?? 0
        );

        return (
            !description ||
            !Number.isFinite(quantity) ||
            quantity <= 0 ||
            !Number.isFinite(unitPrice) ||
            unitPrice < 0
        );
    });

    if (hasInvalidItem) {
        return {
            error:
                "Revise os itens. Descrição e quantidade são obrigatórias.",
        };
    }

    const supabase = await createClient();

    const {
        data: claimsData,
        error: claimsError,
    } = await supabase.auth.getClaims();

    if (
        claimsError ||
        !claimsData?.claims?.sub
    ) {
        return {
            error:
                "Sua sessão expirou. Entre novamente no sistema.",
        };
    }

    const { data, error } = await supabase.rpc(
        "create_purchase_request",
        {
            p_title: title,
            p_justification: justification,
            p_priority: priorityValue,
            p_required_date:
                requiredDateValue || null,

            p_company_id: optionalUuid(
                formData.get("company_id")
            ),

            p_department_id: optionalUuid(
                formData.get("department_id")
            ),

            p_project_id: optionalUuid(
                formData.get("project_id")
            ),

            p_cost_center_id: optionalUuid(
                formData.get("cost_center_id")
            ),

            p_items: items,

            p_submit: submitMode !== "draft",
        }
    );

    if (error) {
        console.error(
            "Erro ao criar pedido:",
            error
        );

        return {
            error:
                error.message ||
                "Não foi possível criar o pedido.",
        };
    }

    if (!data) {
        return {
            error:
                "O pedido foi processado, mas não foi possível identificar seu código.",
        };
    }

    revalidatePath("/dashboard");
    revalidatePath("/pedidos");

    redirect(`/pedidos/${data}`);
}

export async function updatePurchaseWorkflow(
    _previousState: PurchaseWorkflowState,
    formData: FormData
): Promise<PurchaseWorkflowState> {
    const requestId = String(
        formData.get("request_id") ?? ""
    ).trim();

    const status = String(
        formData.get("status") ?? ""
    );

    if (!requestId) {
        return {
            error: "Pedido não identificado.",
            success: null,
        };
    }

    if (
        !purchaseStatuses.includes(
            status as (typeof purchaseStatuses)[number]
        )
    ) {
        return {
            error: "Status inválido.",
            success: null,
        };
    }

    const supabase = await createClient();

    const { error } = await supabase.rpc(
        "update_purchase_workflow",
        {
            p_request_id: requestId,
            p_status: status,

            p_sienge_request_number:
                String(
                    formData.get(
                        "sienge_request_number"
                    ) ?? ""
                ).trim() || null,

            p_sienge_order_number:
                String(
                    formData.get(
                        "sienge_order_number"
                    ) ?? ""
                ).trim() || null,

            p_supplier_id: optionalUuid(
                formData.get("supplier_id")
            ),

            p_order_date:
                String(
                    formData.get("order_date") ?? ""
                ).trim() || null,

            p_expected_delivery_date:
                String(
                    formData.get(
                        "expected_delivery_date"
                    ) ?? ""
                ).trim() || null,

            p_internal_notes:
                String(
                    formData.get("internal_notes") ??
                    ""
                ).trim() || null,
        }
    );

    if (error) {
        console.error(
            "Erro ao atualizar workflow:",
            error
        );

        return {
            error:
                error.message ||
                "Não foi possível atualizar o pedido.",
            success: null,
        };
    }

    revalidatePath("/pedidos");
    revalidatePath(`/pedidos/${requestId}`);
    revalidatePath("/dashboard");

    return {
        error: null,
        success:
            "Pedido atualizado com sucesso.",
    };
}