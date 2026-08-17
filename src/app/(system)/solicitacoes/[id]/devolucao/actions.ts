"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type UploadedReturnDocument = {
    fileName: string;
    storagePath: string;
    mimeType: string;
    fileSize: number;
};

export type SubmitCardReturnInput = {
    requestId: string;

    actualAmount: string;
    purchaseDate: string;
    supplierName: string;
    returnNotes: string;

    invoice: UploadedReturnDocument;
    paymentReceipt: UploadedReturnDocument;
};

export type SubmitCardReturnResult = {
    error: string | null;
    success: boolean;
};

function parseMoney(
    value: string
) {
    let input =
        value.trim();

    if (!input) {
        return null;
    }

    input = input
        .replace(/\s/g, "")
        .replace(/R\$/gi, "");

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

    const valueNumber =
        Number(input);

    return Number.isFinite(
        valueNumber
    )
        ? valueNumber
        : null;
}

export async function submitCardReturn(
    input: SubmitCardReturnInput
): Promise<SubmitCardReturnResult> {
    const actualAmount =
        parseMoney(
            input.actualAmount
        );

    if (
        !input.requestId
    ) {
        return {
            error:
                "Solicitação inválida.",
            success: false,
        };
    }

    if (
        actualAmount === null ||
        actualAmount <= 0
    ) {
        return {
            error:
                "Informe o valor efetivamente utilizado.",
            success: false,
        };
    }

    if (
        !input.purchaseDate
    ) {
        return {
            error:
                "Informe a data da compra.",
            success: false,
        };
    }

    if (
        !input.supplierName.trim()
    ) {
        return {
            error:
                "Informe o fornecedor.",
            success: false,
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
            success: false,
        };
    }

    const {
        error,
    } = await supabase.rpc(
        "submit_card_return",
        {
            p_request_id:
                input.requestId,

            p_actual_amount:
                actualAmount,

            p_purchase_date:
                input.purchaseDate,

            p_supplier_name:
                input.supplierName.trim(),

            p_return_notes:
                input.returnNotes.trim()
                || null,

            p_invoice_file_name:
                input.invoice.fileName,

            p_invoice_storage_path:
                input.invoice.storagePath,

            p_invoice_mime_type:
                input.invoice.mimeType,

            p_invoice_file_size:
                input.invoice.fileSize,

            p_receipt_file_name:
                input.paymentReceipt
                    .fileName,

            p_receipt_storage_path:
                input.paymentReceipt
                    .storagePath,

            p_receipt_mime_type:
                input.paymentReceipt
                    .mimeType,

            p_receipt_file_size:
                input.paymentReceipt
                    .fileSize,
        }
    );

    if (error) {
        console.error(
            "Erro ao registrar devolução:",
            error
        );

        return {
            error:
                error.message ||
                "Não foi possível registrar a devolução.",
            success: false,
        };
    }

    revalidatePath(
        "/dashboard"
    );

    revalidatePath(
        "/solicitacoes"
    );

    revalidatePath(
        `/solicitacoes/${input.requestId}`
    );

    revalidatePath(
        `/solicitacoes/${input.requestId}/devolucao`
    );

    revalidatePath(
        "/financeiro/solicitacoes"
    );

    revalidatePath(
        `/financeiro/solicitacoes/${input.requestId}`
    );

    revalidatePath(
        "/financeiro/devolucoes"
    );

    return {
        error: null,
        success: true,
    };
}