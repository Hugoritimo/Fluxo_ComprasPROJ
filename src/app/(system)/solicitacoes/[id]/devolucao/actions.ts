"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ReturnDocumentCategory =
    | "invoice"
    | "payment_receipt"
    | "other"
    | "accountability";

export type UploadedReturnDocument = {
    category: ReturnDocumentCategory;
    fileName: string;
    storagePath: string;
    mimeType: string;
    fileSize: number;
};

export type ReturnPurchase = {
    supplierName: string;
    amount: number;
    purchaseDate: string | null;
    notes: string | null;
};

type SubmitCardReturnInput = {
    requestId: string;
    siengeRequestNumber: string;
    receivedByName: string;
    returnNotes: string;
    purchases: ReturnPurchase[];
    documents: UploadedReturnDocument[];
};

export type SubmitCardReturnResult = {
    success: boolean;
    error: string | null;
};

// ============================================================
// SUBMETER PRESTAÇÃO DE CONTAS
// ============================================================

export async function submitCardReturn({
    requestId,
    siengeRequestNumber,
    receivedByName,
    returnNotes,
    purchases,
    documents,
}: SubmitCardReturnInput): Promise<SubmitCardReturnResult> {
    // ==========================================================
    // VALIDAÇÕES
    // ==========================================================

    if (!requestId) {
        return {
            success: false,
            error:
                "Não foi possível identificar a solicitação.",
        };
    }

    if (!siengeRequestNumber.trim()) {
        return {
            success: false,
            error:
                "Informe o número da solicitação no Sienge.",
        };
    }

    if (!receivedByName.trim()) {
        return {
            success: false,
            error:
                "Informe quem recebeu o cartão na devolução.",
        };
    }

    if (
        !Array.isArray(purchases) ||
        purchases.length === 0
    ) {
        return {
            success: false,
            error:
                "Adicione pelo menos uma compra realizada.",
        };
    }

    for (
        let index = 0;
        index < purchases.length;
        index++
    ) {
        const purchase =
            purchases[index];

        if (!purchase.supplierName.trim()) {
            return {
                success: false,
                error:
                    `Informe o fornecedor da compra ${index + 1}.`,
            };
        }

        if (
            !Number.isFinite(
                purchase.amount
            ) ||
            purchase.amount <= 0
        ) {
            return {
                success: false,
                error:
                    `Informe um valor válido para a compra ${index + 1}.`,
            };
        }
    }

    if (
        !Array.isArray(documents) ||
        documents.length === 0
    ) {
        return {
            success: false,
            error:
                "Adicione os documentos da prestação de contas.",
        };
    }

    const hasInvoice =
        documents.some(
            (document) =>
                document.category ===
                "invoice"
        );

    const hasReceipt =
        documents.some(
            (document) =>
                document.category ===
                "payment_receipt"
        );

    if (!hasInvoice) {
        return {
            success: false,
            error:
                "Anexe pelo menos uma Nota Fiscal ou Cupom Fiscal.",
        };
    }

    if (!hasReceipt) {
        return {
            success: false,
            error:
                "Anexe pelo menos um comprovante da transação.",
        };
    }

    // ==========================================================
    // AUTENTICAÇÃO
    // ==========================================================

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
            success: false,
            error:
                "Sua sessão expirou. Entre novamente no sistema.",
        };
    }

    // ==========================================================
    // RPC V3
    // ==========================================================

    const { error } =
        await supabase.rpc(
            "submit_card_return_v3",
            {
                p_request_id:
                    requestId,

                p_sienge_request_number:
                    siengeRequestNumber.trim(),

                p_received_by_name:
                    receivedByName.trim(),

                p_return_notes:
                    returnNotes.trim() ||
                    null,

                p_purchases:
                    purchases,

                p_documents:
                    documents,
            }
        );

    if (error) {
        console.error(
            "Erro ao registrar prestação de contas:",
            error
        );

        return {
            success: false,
            error:
                error.message ||
                "Não foi possível registrar a prestação de contas.",
        };
    }

    // ==========================================================
    // CACHE
    // ==========================================================

    revalidatePath(
        "/dashboard"
    );

    revalidatePath(
        "/solicitacoes"
    );

    revalidatePath(
        `/solicitacoes/${requestId}`
    );

    revalidatePath(
        "/devolucoes"
    );

    revalidatePath(
        `/solicitacoes/${requestId}/devolucao`
    );

    revalidatePath(
        "/financeiro/solicitacoes"
    );

    revalidatePath(
        `/financeiro/solicitacoes/${requestId}`
    );

    revalidatePath(
        "/financeiro/devolucoes"
    );

    revalidatePath(
        `/financeiro/devolucoes/${requestId}`
    );

    return {
        success: true,
        error: null,
    };
}