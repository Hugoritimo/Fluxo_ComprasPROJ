"use server";

import {
    revalidatePath,
} from "next/cache";

import {
    createAdminClient,
} from "@/lib/supabase/admin";

import {
    createClient,
} from "@/lib/supabase/server";

// ============================================================
// TIPOS
// ============================================================

export type DeliveryUpdateState = {
    success: boolean;
    error: string | null;
    message?: string | null;
};

const DELIVERY_STATUSES = [
    "Aguardando entrega",
    "Em transporte",
    "Entregue parcialmente",
    "Entregue",
] as const;

type DeliveryStatus =
    (typeof DELIVERY_STATUSES)[number];

// ============================================================
// ATUALIZAR RECEBIMENTO
// ============================================================

export async function updateDeliveryConfirmation(
    formData: FormData
): Promise<DeliveryUpdateState> {
    try {
        // ========================================================
        // AUTENTICAÇÃO
        // ========================================================

        const supabase =
            await createClient();

        const {
            data:
            claimsData,
        } =
            await supabase.auth.getClaims();

        const userId =
            claimsData?.claims?.sub;

        if (
            !userId
        ) {
            return {
                success: false,
                error:
                    "Usuário não autenticado.",
            };
        }

        // ========================================================
        // DADOS
        // ========================================================

        const itemId =
            String(
                formData.get(
                    "itemId"
                ) ??
                ""
            ).trim();

        const requestKey =
            String(
                formData.get(
                    "requestKey"
                ) ??
                ""
            ).trim();

        const deliveryStatus =
            String(
                formData.get(
                    "deliveryStatus"
                ) ??
                ""
            ).trim();

        let deliveryDate =
            String(
                formData.get(
                    "deliveryDate"
                ) ??
                ""
            ).trim();

        let receivedBy =
            String(
                formData.get(
                    "receivedBy"
                ) ??
                ""
            ).trim();

        let invoiceNumber =
            String(
                formData.get(
                    "invoiceNumber"
                ) ??
                ""
            ).trim();

        // ========================================================
        // VALIDAÇÕES BÁSICAS
        // ========================================================

        if (
            !itemId
        ) {
            return {
                success: false,
                error:
                    "Item do pedido não informado.",
            };
        }

        if (
            !requestKey
        ) {
            return {
                success: false,
                error:
                    "Solicitação não informada.",
            };
        }

        if (
            !DELIVERY_STATUSES.includes(
                deliveryStatus as DeliveryStatus
            )
        ) {
            return {
                success: false,
                error:
                    "Selecione um status de entrega válido.",
            };
        }

        const isReceiptStatus =
            deliveryStatus ===
            "Entregue" ||
            deliveryStatus ===
            "Entregue parcialmente";

        // ========================================================
        // QUANDO HOUVE RECEBIMENTO
        // ========================================================

        if (
            isReceiptStatus
        ) {
            if (
                !deliveryDate
            ) {
                return {
                    success: false,
                    error:
                        "Informe a data do recebimento.",
                };
            }

            if (
                receivedBy.length <
                3
            ) {
                return {
                    success: false,
                    error:
                        "Informe quem recebeu o pedido.",
                };
            }

            if (
                deliveryStatus ===
                "Entregue" &&
                invoiceNumber.length <
                1
            ) {
                return {
                    success: false,
                    error:
                        "Informe o número da Nota Fiscal.",
                };
            }

            // ======================================================
            // VALIDAR DATA
            // ======================================================

            if (
                !/^\d{4}-\d{2}-\d{2}$/.test(
                    deliveryDate
                )
            ) {
                return {
                    success: false,
                    error:
                        "A data de recebimento é inválida.",
                };
            }

            const receivedDate =
                new Date(
                    `${deliveryDate}T12:00:00`
                );

            if (
                Number.isNaN(
                    receivedDate.getTime()
                )
            ) {
                return {
                    success: false,
                    error:
                        "A data de recebimento é inválida.",
                };
            }

            const today =
                new Date();

            today.setHours(
                23,
                59,
                59,
                999
            );

            if (
                receivedDate.getTime() >
                today.getTime()
            ) {
                return {
                    success: false,
                    error:
                        "A data de recebimento não pode ser futura.",
                };
            }
        } else {
            // ======================================================
            // AINDA NÃO RECEBIDO
            //
            // Evita deixar informações inconsistentes.
            // ======================================================

            deliveryDate =
                "";

            receivedBy =
                "";

            invoiceNumber =
                "";
        }

        // ========================================================
        // TAMANHOS
        // ========================================================

        if (
            receivedBy.length >
            150
        ) {
            return {
                success: false,
                error:
                    "O nome de quem recebeu está muito longo.",
            };
        }

        if (
            invoiceNumber.length >
            100
        ) {
            return {
                success: false,
                error:
                    "O número da Nota Fiscal está muito longo.",
            };
        }

        // ========================================================
        // PERMISSÕES
        // ========================================================

        const {
            data:
            roleRows,
            error:
            roleError,
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
            roleError
        ) {
            return {
                success: false,
                error:
                    "Não foi possível validar suas permissões.",
            };
        }

        const roles =
            (
                roleRows ??
                []
            ).map(
                (
                    row
                ) =>
                    String(
                        row.role
                    )
            );

        const isSuperadmin =
            roles.includes(
                "superadmin"
            );

        // ========================================================
        // BUSCAR ITEM COM CLIENTE ADMIN
        // ========================================================

        const admin =
            createAdminClient();

        const {
            data:
            item,
            error:
            itemError,
        } =
            await admin
                .from(
                    "sienge_purchase_items"
                )
                .select(
                    `
          id,
          sc_number,
          insumo,
          requester_profile_id
          `
                )
                .eq(
                    "id",
                    itemId
                )
                .maybeSingle();

        if (
            itemError
        ) {
            console.error(
                "Erro ao consultar item para confirmação de entrega:",
                itemError
            );

            return {
                success: false,
                error:
                    "Não foi possível localizar o item do pedido.",
            };
        }

        if (
            !item
        ) {
            return {
                success: false,
                error:
                    "Item não encontrado.",
            };
        }

        // ========================================================
        // SEGURANÇA PRINCIPAL
        //
        // Solicitante:
        // somente o próprio pedido.
        //
        // Superadmin:
        // pode corrigir administrativamente.
        // ========================================================

        if (
            !isSuperadmin &&
            item.requester_profile_id !==
            userId
        ) {
            return {
                success: false,
                error:
                    "Você não possui permissão para atualizar este pedido.",
            };
        }

        // ========================================================
        // UPDATE
        // ========================================================

        const {
            error:
            updateError,
        } =
            await admin
                .from(
                    "sienge_purchase_items"
                )
                .update({
                    delivery_status:
                        deliveryStatus,

                    delivery_date:
                        deliveryDate ||
                        null,

                    received_by:
                        receivedBy ||
                        null,

                    invoice_number:
                        invoiceNumber ||
                        null,
                })
                .eq(
                    "id",
                    itemId
                );

        if (
            updateError
        ) {
            console.error(
                "Erro ao atualizar confirmação de entrega:",
                updateError
            );

            return {
                success: false,
                error:
                    "Não foi possível salvar as informações da entrega.",
            };
        }

        // ========================================================
        // REVALIDAR
        // ========================================================

        revalidatePath(
            `/meus-pedidos/${requestKey}`
        );

        revalidatePath(
            "/meus-pedidos"
        );

        revalidatePath(
            "/direcao"
        );

        return {
            success: true,
            error:
                null,
            message:
                deliveryStatus ===
                    "Entregue"
                    ? "Recebimento confirmado com sucesso."
                    : "Informações da entrega atualizadas.",
        };
    } catch (
    error
    ) {
        console.error(
            "Erro inesperado ao atualizar entrega:",
            error
        );

        return {
            success: false,

            error:
                error instanceof
                    Error
                    ? error.message
                    : "Não foi possível atualizar a entrega.",
        };
    }
}