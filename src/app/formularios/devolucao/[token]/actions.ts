"use server";

import {
    revalidatePath,
} from "next/cache";

import {
    createClient,
} from "@/lib/supabase/server";

// ============================================================
// TIPOS
// ============================================================

export type ExternalReturnDocumentCategory =
    | "invoice"
    | "payment_receipt"
    | "other"
    | "accountability";

export type ExternalReturnDocument = {
    category:
    ExternalReturnDocumentCategory;

    fileName: string;

    storagePath: string;

    mimeType: string;

    fileSize: number;
};

export type ExternalReturnPurchase = {
    supplierName: string;

    amount: number;

    purchaseDate:
    | string
    | null;

    notes:
    | string
    | null;
};

export type ExternalReturnResult = {
    success: boolean;

    error:
    | string
    | null;

    requestId:
    | string
    | null;
};

// ============================================================
// ENVIAR DEVOLUÇÃO EXTERNA
// ============================================================

export async function submitExternalCardReturn(
    input: {
        token: string;

        siengeRequestNumber: string;

        receivedByName: string;

        returnNotes: string;

        purchases:
        ExternalReturnPurchase[];

        documents:
        ExternalReturnDocument[];
    }
): Promise<ExternalReturnResult> {
    // ==========================================================
    // TOKEN
    // ==========================================================

    if (
        !input.token.trim()
    ) {
        return {
            success: false,

            error:
                "Não foi possível identificar o link de devolução.",

            requestId:
                null,
        };
    }

    // ==========================================================
    // SIENGE
    // ==========================================================

    if (
        !input.siengeRequestNumber.trim()
    ) {
        return {
            success: false,

            error:
                "Informe o número da solicitação no Sienge.",

            requestId:
                null,
        };
    }

    // ==========================================================
    // RECEBEDOR
    // ==========================================================

    if (
        !input.receivedByName.trim()
    ) {
        return {
            success: false,

            error:
                "Informe quem recebeu o cartão.",

            requestId:
                null,
        };
    }

    // ==========================================================
    // COMPRAS
    // ==========================================================

    if (
        !Array.isArray(
            input.purchases
        ) ||
        input.purchases.length ===
        0
    ) {
        return {
            success: false,

            error:
                "Adicione pelo menos uma compra.",

            requestId:
                null,
        };
    }

    for (
        let index = 0;
        index <
        input.purchases.length;
        index++
    ) {
        const purchase =
            input.purchases[index];

        if (
            !purchase.supplierName.trim()
        ) {
            return {
                success: false,

                error:
                    `Informe o fornecedor da compra ${index + 1}.`,

                requestId:
                    null,
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

                requestId:
                    null,
            };
        }
    }

    // ==========================================================
    // DOCUMENTOS
    // ==========================================================

    if (
        !Array.isArray(
            input.documents
        ) ||
        input.documents.length ===
        0
    ) {
        return {
            success: false,

            error:
                "Adicione os documentos da prestação de contas.",

            requestId:
                null,
        };
    }

    const hasInvoice =
        input.documents.some(
            (document) =>
                document.category ===
                "invoice"
        );

    const hasReceipt =
        input.documents.some(
            (document) =>
                document.category ===
                "payment_receipt"
        );

    if (!hasInvoice) {
        return {
            success: false,

            error:
                "Adicione pelo menos uma Nota Fiscal ou Cupom Fiscal.",

            requestId:
                null,
        };
    }

    if (!hasReceipt) {
        return {
            success: false,

            error:
                "Adicione pelo menos um comprovante da transação.",

            requestId:
                null,
        };
    }

    // ==========================================================
    // SUPABASE
    // ==========================================================

    const supabase =
        await createClient();

    // ==========================================================
    // RPC
    // ==========================================================

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "submit_external_card_return",
            {
                p_token:
                    input.token,

                p_sienge_request_number:
                    input.siengeRequestNumber.trim(),

                p_received_by_name:
                    input.receivedByName.trim(),

                p_return_notes:
                    input.returnNotes.trim() ||
                    null,

                p_purchases:
                    input.purchases,

                p_documents:
                    input.documents,
            }
        );

    // ==========================================================
    // ERRO
    // ==========================================================

    if (error) {
        console.error(
            "Erro ao enviar devolução externa:",
            error
        );

        return {
            success: false,

            error:
                error.message ||
                "Não foi possível registrar a devolução.",

            requestId:
                null,
        };
    }

    // ==========================================================
    // ID DA SOLICITAÇÃO
    // ==========================================================

    const requestId =
        data
            ? String(data)
            : null;

    // ==========================================================
    // REVALIDAÇÃO
    // ==========================================================

    if (requestId) {
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
    }

    // ==========================================================
    // SUCESSO
    // ==========================================================

    return {
        success: true,

        error: null,

        requestId,
    };
}