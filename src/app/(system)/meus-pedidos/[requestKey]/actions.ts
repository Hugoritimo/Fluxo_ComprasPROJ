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
// TIPOS PÚBLICOS
// ============================================================

export type ActionState = {
    success: boolean;

    error: string | null;

    message?: string | null;
};

export type DeliveryUpdateState =
    ActionState;

export type SupplyUpdateState =
    ActionState;

export type ReceiptReleaseState =
    ActionState;

// ============================================================
// STATUS DE RECEBIMENTO
// ============================================================

const DELIVERY_STATUSES = [
    "Aguardando entrega",
    "Em transporte",
    "Entregue parcialmente",
    "Entregue",
] as const;

type DeliveryStatus =
    (typeof DELIVERY_STATUSES)[number];

// ============================================================
// STATUS PERMITIDOS PARA SUPRIMENTOS
// ============================================================

const SUPPLY_STATUSES = [
    "Solicitação recebida",
    "Em cotação",
    "Em aprovação",
    "Compra realizada",
    "Compra via cartão",
    "Disponível para retirada",
    "Em processo de entrega",
    "Entregue",
] as const;

// ============================================================
// ETAPAS QUE TORNAM O ITEM ELEGÍVEL PARA LIBERAÇÃO
// ============================================================

const CONFIRMABLE_TRACKING_STATUSES = [
    "Compra realizada",
    "Compra via cartão",
    "Disponível para retirada",
    "Em processo de entrega",
    "Entregue",
];

// ============================================================
// ROLES
// ============================================================

// Suprimentos altera os dados operacionais da compra.
const SUPPLY_EDIT_ROLES = [
    "supply",
    "admin",
    "superadmin",
];

// Financeiro realiza a liberação para recebimento.
const RECEIPT_RELEASE_ROLES = [
    "finance",
    "admin",
    "superadmin",
];

function hasAnyRole(
    roles: string[],
    allowedRoles: string[]
) {
    return roles.some(
        (
            role
        ) =>
            allowedRoles.includes(
                role
            )
    );
}

// ============================================================
// TIPOS INTERNOS
// ============================================================

type AuthContext = {
    userId: string;

    roles: string[];
};

type ItemRow = {
    id: string;

    sc_number:
    | string
    | null;

    requester_profile_id:
    | string
    | null;

    requester_sienge_username:
    | string
    | null;

    cost_center_or_site:
    | string
    | null;

    order_number:
    | string
    | null;

    supply_status:
    | string
    | null;
};

type SummaryRow = {
    request_key: string;

    sc_number:
    | string
    | null;

    requester_profile_id:
    | string
    | null;

    requester_sienge_username:
    | string
    | null;

    cost_center_or_site:
    | string
    | null;

    tracking_status:
    | string
    | null;
};

type SupplyUpdateRow = {
    item_id: string;

    supply_status:
    | string
    | null;

    supply_status_date:
    | string
    | null;

    order_number:
    | string
    | null;

    supplier_name:
    | string
    | null;

    supplier_contact:
    | string
    | null;

    supplier_phone:
    | string
    | null;

    delivery_or_pickup_forecast:
    | string
    | null;

    authorization_status:
    | string
    | null;
};

type ReceiptReleaseRow = {
    item_id: string;

    is_released: boolean;

    released_at:
    | string
    | null;

    released_by:
    | string
    | null;

    revoked_at:
    | string
    | null;

    revoked_by:
    | string
    | null;
};

// ============================================================
// HELPERS
// ============================================================

function normalizeKey(
    value:
        | string
        | null
        | undefined
) {
    return String(
        value ??
        ""
    )
        .trim()
        .toUpperCase();
}

function cleanText(
    value:
        | FormDataEntryValue
        | null,
    maxLength:
        number
) {
    return String(
        value ??
        ""
    )
        .trim()
        .slice(
            0,
            maxLength
        );
}

function cleanNullableText(
    value:
        | FormDataEntryValue
        | null,
    maxLength:
        number
) {
    const text =
        cleanText(
            value,
            maxLength
        );

    return text ||
        null;
}

function isValidDate(
    value:
        string
) {
    if (
        !/^\d{4}-\d{2}-\d{2}$/.test(
            value
        )
    ) {
        return false;
    }

    const date =
        new Date(
            `${value}T12:00:00`
        );

    return !Number.isNaN(
        date.getTime()
    );
}

function getTodayIso() {
    const parts =
        new Intl.DateTimeFormat(
            "en-US",
            {
                timeZone:
                    "America/Sao_Paulo",

                year:
                    "numeric",

                month:
                    "2-digit",

                day:
                    "2-digit",
            }
        ).formatToParts(
            new Date()
        );

    const year =
        parts.find(
            (
                part
            ) =>
                part.type ===
                "year"
        )?.value;

    const month =
        parts.find(
            (
                part
            ) =>
                part.type ===
                "month"
        )?.value;

    const day =
        parts.find(
            (
                part
            ) =>
                part.type ===
                "day"
        )?.value;

    if (
        !year ||
        !month ||
        !day
    ) {
        return null;
    }

    return `${year}-${month}-${day}`;
}

// ============================================================
// AUTENTICAÇÃO + ROLES
// ============================================================

async function getAuthContext():
    Promise<
        | {
            success: true;

            data:
            AuthContext;
        }
        | {
            success: false;

            error: string;
        }
    > {
    const supabase =
        await createClient();

    const {
        data:
        claimsData,

        error:
        claimsError,
    } =
        await supabase.auth.getClaims();

    const userId =
        claimsData
            ?.claims
            ?.sub;

    if (
        claimsError ||
        !userId
    ) {
        return {
            success:
                false,

            error:
                "Usuário não autenticado.",
        };
    }

    const {
        data:
        roleRows,

        error:
        rolesError,
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
        rolesError
    ) {
        console.error(
            "Erro ao consultar permissões:",
            rolesError
        );

        return {
            success:
                false,

            error:
                "Não foi possível validar suas permissões.",
        };
    }

    return {
        success:
            true,

        data: {
            userId,

            roles:
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
                ),
        },
    };
}

// ============================================================
// CONSULTAR ITEM
// ============================================================

async function getItem(
    itemId:
        string
) {
    const admin =
        createAdminClient();

    const {
        data,
        error,
    } =
        await admin
            .from(
                "sienge_purchase_items"
            )
            .select(
                `
        id,
        sc_number,
        requester_profile_id,
        requester_sienge_username,
        cost_center_or_site,
        order_number,
        supply_status
        `
            )
            .eq(
                "id",
                itemId
            )
            .maybeSingle();

    if (
        error
    ) {
        console.error(
            "Erro ao consultar item Sienge:",
            error
        );

        return null;
    }

    return data as
        | ItemRow
        | null;
}

// ============================================================
// CONSULTAR RESUMO DA SOLICITAÇÃO
// ============================================================

async function getSummary(
    requestKey:
        string
) {
    const admin =
        createAdminClient();

    const {
        data,
        error,
    } =
        await admin
            .from(
                "v_sienge_request_summary"
            )
            .select(
                `
        request_key,
        sc_number,
        requester_profile_id,
        requester_sienge_username,
        cost_center_or_site,
        tracking_status
        `
            )
            .eq(
                "request_key",
                requestKey
            )
            .maybeSingle();

    if (
        error
    ) {
        console.error(
            "Erro ao consultar resumo Sienge:",
            error
        );

        return null;
    }

    return data as
        | SummaryRow
        | null;
}

// ============================================================
// VALIDAR ITEM × SOLICITAÇÃO
// ============================================================

function itemBelongsToRequest(
    item:
        ItemRow,
    summary:
        SummaryRow
) {
    const sameSc =
        normalizeKey(
            item.sc_number
        ) ===
        normalizeKey(
            summary.sc_number
        );

    const sameCostCenter =
        normalizeKey(
            item.cost_center_or_site
        ) ===
        normalizeKey(
            summary.cost_center_or_site
        );

    if (
        !sameSc ||
        !sameCostCenter
    ) {
        return false;
    }

    if (
        summary.requester_profile_id
    ) {
        return (
            item.requester_profile_id ===
            summary.requester_profile_id
        );
    }

    return (
        normalizeKey(
            item.requester_sienge_username
        ) ===
        normalizeKey(
            summary.requester_sienge_username
        )
    );
}

// ============================================================
// CONSULTAR ALTERAÇÃO DO SUPRIMENTOS
// ============================================================

async function getSupplyUpdate(
    itemId:
        string
) {
    const admin =
        createAdminClient();

    const {
        data,
        error,
    } =
        await admin
            .from(
                "sienge_supply_item_updates"
            )
            .select(
                `
        item_id,
        supply_status,
        supply_status_date,
        order_number,
        supplier_name,
        supplier_contact,
        supplier_phone,
        delivery_or_pickup_forecast,
        authorization_status
        `
            )
            .eq(
                "item_id",
                itemId
            )
            .maybeSingle();

    if (
        error
    ) {
        console.error(
            "Erro ao consultar atualização de Suprimentos:",
            error
        );

        return null;
    }

    return data as
        | SupplyUpdateRow
        | null;
}

// ============================================================
// CONSULTAR LIBERAÇÃO DO RECEBIMENTO
// ============================================================

async function getReceiptRelease(
    itemId:
        string
) {
    const admin =
        createAdminClient();

    const {
        data,
        error,
    } =
        await admin
            .from(
                "sienge_receipt_releases"
            )
            .select(
                `
        item_id,
        is_released,
        released_at,
        released_by,
        revoked_at,
        revoked_by
        `
            )
            .eq(
                "item_id",
                itemId
            )
            .maybeSingle();

    if (
        error
    ) {
        console.error(
            "Erro ao consultar liberação de recebimento:",
            error
        );

        return null;
    }

    return data as
        | ReceiptReleaseRow
        | null;
}

// ============================================================
// O ITEM JÁ PODE SER LIBERADO?
// ============================================================

function processCanBeReleased({
    item,
    summary,
    supplyUpdate,
}: {
    item:
    ItemRow;

    summary:
    SummaryRow;

    supplyUpdate:
    SupplyUpdateRow
    | null;
}) {
    // ==========================================================
    // IMPORTANTE:
    //
    // Se já existe uma atualização manual do Suprimentos,
    // ela é a fonte efetiva, inclusive quando o campo está null.
    //
    // Isso mantém o comportamento igual ao page.tsx:
    // atualização manual > informação importada.
    // ==========================================================

    const effectiveOrderNumber =
        supplyUpdate
            ? supplyUpdate.order_number
            : item.order_number;

    const effectiveSupplyStatus =
        supplyUpdate
            ? supplyUpdate.supply_status
            : item.supply_status;

    const hasOrder =
        Boolean(
            String(
                effectiveOrderNumber ??
                ""
            ).trim()
        );

    const supplyStatusAllows =
        CONFIRMABLE_TRACKING_STATUSES.includes(
            String(
                effectiveSupplyStatus ??
                ""
            )
        );

    const trackingAllows =
        CONFIRMABLE_TRACKING_STATUSES.includes(
            String(
                summary.tracking_status ??
                ""
            )
        );

    return (
        hasOrder ||
        supplyStatusAllows ||
        trackingAllows
    );
}

// ============================================================
// REVALIDAÇÃO
// ============================================================

function revalidateSiengePaths(
    requestKey:
        string
) {
    revalidatePath(
        `/meus-pedidos/${encodeURIComponent(
            requestKey
        )}`
    );

    revalidatePath(
        "/meus-pedidos"
    );

    revalidatePath(
        "/solicitacoes"
    );

    revalidatePath(
        "/pendencias"
    );

    revalidatePath(
        "/dashboard"
    );

    revalidatePath(
        "/financeiro/sienge"
    );

    revalidatePath(
        "/financeiro/solicitacoes"
    );
}

// ============================================================
// 1. ATUALIZAR ACOMPANHAMENTO DE SUPRIMENTOS
// ============================================================

export async function updateSupplyItem(
    formData:
        FormData
): Promise<SupplyUpdateState> {
    try {
        // ========================================================
        // AUTENTICAÇÃO
        // ========================================================

        const auth =
            await getAuthContext();

        if (
            !auth.success
        ) {
            return {
                success:
                    false,

                error:
                    auth.error,
            };
        }

        const {
            userId,
            roles,
        } =
            auth.data;

        // ========================================================
        // SOMENTE SUPRIMENTOS / ADMIN
        // ========================================================

        if (
            !hasAnyRole(
                roles,
                SUPPLY_EDIT_ROLES
            )
        ) {
            return {
                success:
                    false,

                error:
                    "Você não possui permissão para editar o acompanhamento de Suprimentos.",
            };
        }

        // ========================================================
        // DADOS
        // ========================================================

        const itemId =
            cleanText(
                formData.get(
                    "itemId"
                ),
                100
            );

        const requestKey =
            cleanText(
                formData.get(
                    "requestKey"
                ),
                300
            );

        const supplyStatus =
            cleanNullableText(
                formData.get(
                    "supplyStatus"
                ),
                100
            );

        const supplyStatusDate =
            cleanNullableText(
                formData.get(
                    "supplyStatusDate"
                ),
                10
            );

        const orderNumber =
            cleanNullableText(
                formData.get(
                    "orderNumber"
                ),
                100
            );

        const supplierName =
            cleanNullableText(
                formData.get(
                    "supplierName"
                ),
                200
            );

        const supplierContact =
            cleanNullableText(
                formData.get(
                    "supplierContact"
                ),
                150
            );

        const supplierPhone =
            cleanNullableText(
                formData.get(
                    "supplierPhone"
                ),
                100
            );

        const deliveryForecast =
            cleanNullableText(
                formData.get(
                    "deliveryOrPickupForecast"
                ),
                10
            );

        const authorizationStatus =
            cleanNullableText(
                formData.get(
                    "authorizationStatus"
                ),
                100
            );

        if (
            !itemId ||
            !requestKey
        ) {
            return {
                success:
                    false,

                error:
                    "Item ou solicitação não informado.",
            };
        }

        // ========================================================
        // STATUS
        // ========================================================

        if (
            supplyStatus &&
            !SUPPLY_STATUSES.includes(
                supplyStatus as
                (typeof SUPPLY_STATUSES)[number]
            )
        ) {
            return {
                success:
                    false,

                error:
                    "Status de Suprimentos inválido.",
            };
        }

        // ========================================================
        // DATAS
        // ========================================================

        if (
            supplyStatusDate &&
            !isValidDate(
                supplyStatusDate
            )
        ) {
            return {
                success:
                    false,

                error:
                    "A data do status é inválida.",
            };
        }

        if (
            deliveryForecast &&
            !isValidDate(
                deliveryForecast
            )
        ) {
            return {
                success:
                    false,

                error:
                    "A previsão de entrega/retirada é inválida.",
            };
        }

        // ========================================================
        // VALIDAR ITEM + SOLICITAÇÃO
        // ========================================================

        const [
            item,
            summary,
        ] =
            await Promise.all([
                getItem(
                    itemId
                ),

                getSummary(
                    requestKey
                ),
            ]);

        if (
            !item
        ) {
            return {
                success:
                    false,

                error:
                    "Item não encontrado.",
            };
        }

        if (
            !summary
        ) {
            return {
                success:
                    false,

                error:
                    "Solicitação não encontrada.",
            };
        }

        if (
            !itemBelongsToRequest(
                item,
                summary
            )
        ) {
            return {
                success:
                    false,

                error:
                    "O item informado não pertence a esta solicitação.",
            };
        }

        // ========================================================
        // SALVAR CAMADA LOCAL
        // ========================================================

        const admin =
            createAdminClient();

        const now =
            new Date()
                .toISOString();

        const {
            data:
            existing,

            error:
            existingError,
        } =
            await admin
                .from(
                    "sienge_supply_item_updates"
                )
                .select(
                    "id"
                )
                .eq(
                    "item_id",
                    itemId
                )
                .maybeSingle();

        if (
            existingError
        ) {
            console.error(
                "Erro ao verificar atualização de Suprimentos:",
                existingError
            );

            return {
                success:
                    false,

                error:
                    "Não foi possível verificar as informações atuais.",
            };
        }

        if (
            existing
        ) {
            const {
                error,
            } =
                await admin
                    .from(
                        "sienge_supply_item_updates"
                    )
                    .update({
                        supply_status:
                            supplyStatus,

                        supply_status_date:
                            supplyStatusDate,

                        order_number:
                            orderNumber,

                        supplier_name:
                            supplierName,

                        supplier_contact:
                            supplierContact,

                        supplier_phone:
                            supplierPhone,

                        delivery_or_pickup_forecast:
                            deliveryForecast,

                        authorization_status:
                            authorizationStatus,

                        updated_by:
                            userId,

                        updated_at:
                            now,
                    })
                    .eq(
                        "item_id",
                        itemId
                    );

            if (
                error
            ) {
                console.error(
                    "Erro ao atualizar dados de Suprimentos:",
                    error
                );

                return {
                    success:
                        false,

                    error:
                        "Não foi possível salvar o acompanhamento de Suprimentos.",
                };
            }
        } else {
            const {
                error,
            } =
                await admin
                    .from(
                        "sienge_supply_item_updates"
                    )
                    .insert({
                        item_id:
                            itemId,

                        supply_status:
                            supplyStatus,

                        supply_status_date:
                            supplyStatusDate,

                        order_number:
                            orderNumber,

                        supplier_name:
                            supplierName,

                        supplier_contact:
                            supplierContact,

                        supplier_phone:
                            supplierPhone,

                        delivery_or_pickup_forecast:
                            deliveryForecast,

                        authorization_status:
                            authorizationStatus,

                        created_by:
                            userId,

                        updated_by:
                            userId,

                        created_at:
                            now,

                        updated_at:
                            now,
                    });

            if (
                error
            ) {
                console.error(
                    "Erro ao criar atualização de Suprimentos:",
                    error
                );

                return {
                    success:
                        false,

                    error:
                        "Não foi possível salvar o acompanhamento de Suprimentos.",
                };
            }
        }

        revalidateSiengePaths(
            requestKey
        );

        return {
            success:
                true,

            error:
                null,

            message:
                "Acompanhamento de Suprimentos atualizado com sucesso.",
        };
    } catch (
    error
    ) {
        console.error(
            "Erro inesperado ao atualizar Suprimentos:",
            error
        );

        return {
            success:
                false,

            error:
                error instanceof
                    Error
                    ? error.message
                    : "Não foi possível atualizar o acompanhamento.",
        };
    }
}

// ============================================================
// 2. LIBERAR RECEBIMENTO
// ============================================================

export async function releaseReceipt(
    formData:
        FormData
): Promise<ReceiptReleaseState> {
    try {
        // ========================================================
        // AUTENTICAÇÃO
        // ========================================================

        const auth =
            await getAuthContext();

        if (
            !auth.success
        ) {
            return {
                success:
                    false,

                error:
                    auth.error,
            };
        }

        const {
            userId,
            roles,
        } =
            auth.data;

        // ========================================================
        // SOMENTE FINANCEIRO / ADMIN
        // ========================================================

        if (
            !hasAnyRole(
                roles,
                RECEIPT_RELEASE_ROLES
            )
        ) {
            return {
                success:
                    false,

                error:
                    "Você não possui permissão para liberar recebimentos.",
            };
        }

        // ========================================================
        // DADOS
        // ========================================================

        const itemId =
            cleanText(
                formData.get(
                    "itemId"
                ),
                100
            );

        const requestKey =
            cleanText(
                formData.get(
                    "requestKey"
                ),
                300
            );

        if (
            !itemId ||
            !requestKey
        ) {
            return {
                success:
                    false,

                error:
                    "Item ou solicitação não informado.",
            };
        }

        // ========================================================
        // ITEM + SOLICITAÇÃO + SUPRIMENTOS
        // ========================================================

        const [
            item,
            summary,
            supplyUpdate,
        ] =
            await Promise.all([
                getItem(
                    itemId
                ),

                getSummary(
                    requestKey
                ),

                getSupplyUpdate(
                    itemId
                ),
            ]);

        if (
            !item ||
            !summary
        ) {
            return {
                success:
                    false,

                error:
                    "Item ou solicitação não encontrado.",
            };
        }

        if (
            !itemBelongsToRequest(
                item,
                summary
            )
        ) {
            return {
                success:
                    false,

                error:
                    "O item informado não pertence a esta solicitação.",
            };
        }

        // ========================================================
        // PROCESSO PRECISA ESTAR APTO
        // ========================================================

        const eligible =
            processCanBeReleased({
                item,

                summary,

                supplyUpdate,
            });

        if (
            !eligible
        ) {
            return {
                success:
                    false,

                error:
                    "O pedido ainda não está em uma etapa que permita liberar o recebimento.",
            };
        }

        // ========================================================
        // GRAVAR LIBERAÇÃO
        // ========================================================

        const admin =
            createAdminClient();

        const now =
            new Date()
                .toISOString();

        const {
            data:
            existing,

            error:
            existingError,
        } =
            await admin
                .from(
                    "sienge_receipt_releases"
                )
                .select(
                    `
          id,
          is_released
          `
                )
                .eq(
                    "item_id",
                    itemId
                )
                .maybeSingle();

        if (
            existingError
        ) {
            console.error(
                "Erro ao consultar liberação existente:",
                existingError
            );

            return {
                success:
                    false,

                error:
                    "Não foi possível verificar a liberação atual.",
            };
        }

        if (
            existing
                ?.is_released
        ) {
            return {
                success:
                    true,

                error:
                    null,

                message:
                    "O recebimento deste item já está liberado.",
            };
        }

        if (
            existing
        ) {
            const {
                error,
            } =
                await admin
                    .from(
                        "sienge_receipt_releases"
                    )
                    .update({
                        is_released:
                            true,

                        released_at:
                            now,

                        released_by:
                            userId,

                        revoked_at:
                            null,

                        revoked_by:
                            null,

                        updated_at:
                            now,
                    })
                    .eq(
                        "item_id",
                        itemId
                    );

            if (
                error
            ) {
                console.error(
                    "Erro ao liberar recebimento:",
                    error
                );

                return {
                    success:
                        false,

                    error:
                        "Não foi possível liberar o recebimento.",
                };
            }
        } else {
            const {
                error,
            } =
                await admin
                    .from(
                        "sienge_receipt_releases"
                    )
                    .insert({
                        item_id:
                            itemId,

                        is_released:
                            true,

                        released_at:
                            now,

                        released_by:
                            userId,

                        revoked_at:
                            null,

                        revoked_by:
                            null,

                        created_at:
                            now,

                        updated_at:
                            now,
                    });

            if (
                error
            ) {
                console.error(
                    "Erro ao criar liberação do recebimento:",
                    error
                );

                return {
                    success:
                        false,

                    error:
                        "Não foi possível liberar o recebimento.",
                };
            }
        }

        revalidateSiengePaths(
            requestKey
        );

        return {
            success:
                true,

            error:
                null,

            message:
                "Recebimento liberado para o solicitante.",
        };
    } catch (
    error
    ) {
        console.error(
            "Erro inesperado ao liberar recebimento:",
            error
        );

        return {
            success:
                false,

            error:
                error instanceof
                    Error
                    ? error.message
                    : "Não foi possível liberar o recebimento.",
        };
    }
}

// ============================================================
// 3. REVOGAR LIBERAÇÃO
// ============================================================

export async function revokeReceipt(
    formData:
        FormData
): Promise<ReceiptReleaseState> {
    try {
        // ========================================================
        // AUTENTICAÇÃO
        // ========================================================

        const auth =
            await getAuthContext();

        if (
            !auth.success
        ) {
            return {
                success:
                    false,

                error:
                    auth.error,
            };
        }

        const {
            userId,
            roles,
        } =
            auth.data;

        // ========================================================
        // SOMENTE FINANCEIRO / ADMIN
        // ========================================================

        if (
            !hasAnyRole(
                roles,
                RECEIPT_RELEASE_ROLES
            )
        ) {
            return {
                success:
                    false,

                error:
                    "Você não possui permissão para revogar liberações.",
            };
        }

        // ========================================================
        // DADOS
        // ========================================================

        const itemId =
            cleanText(
                formData.get(
                    "itemId"
                ),
                100
            );

        const requestKey =
            cleanText(
                formData.get(
                    "requestKey"
                ),
                300
            );

        if (
            !itemId ||
            !requestKey
        ) {
            return {
                success:
                    false,

                error:
                    "Item ou solicitação não informado.",
            };
        }

        // ========================================================
        // ITEM + SOLICITAÇÃO
        // ========================================================

        const [
            item,
            summary,
        ] =
            await Promise.all([
                getItem(
                    itemId
                ),

                getSummary(
                    requestKey
                ),
            ]);

        if (
            !item ||
            !summary ||
            !itemBelongsToRequest(
                item,
                summary
            )
        ) {
            return {
                success:
                    false,

                error:
                    "Item ou solicitação inválido.",
            };
        }

        const admin =
            createAdminClient();

        // ========================================================
        // NÃO REVOGAR SE JÁ EXISTE CONFIRMAÇÃO DO SOLICITANTE
        // ========================================================

        const {
            data:
            confirmation,

            error:
            confirmationError,
        } =
            await admin
                .from(
                    "sienge_requester_delivery_confirmations"
                )
                .select(
                    "delivery_status"
                )
                .eq(
                    "item_id",
                    itemId
                )
                .limit(
                    1
                )
                .maybeSingle();

        if (
            confirmationError
        ) {
            console.error(
                "Erro ao verificar recebimento antes da revogação:",
                confirmationError
            );

            return {
                success:
                    false,

                error:
                    "Não foi possível verificar se o recebimento já foi registrado.",
            };
        }

        if (
            confirmation
                ?.delivery_status
        ) {
            return {
                success:
                    false,

                error:
                    "A liberação não pode ser revogada porque o solicitante já registrou informações de recebimento.",
            };
        }

        // ========================================================
        // LOCALIZAR LIBERAÇÃO
        // ========================================================

        const {
            data:
            release,

            error:
            releaseError,
        } =
            await admin
                .from(
                    "sienge_receipt_releases"
                )
                .select(
                    `
          id,
          is_released
          `
                )
                .eq(
                    "item_id",
                    itemId
                )
                .maybeSingle();

        if (
            releaseError
        ) {
            console.error(
                "Erro ao consultar liberação:",
                releaseError
            );

            return {
                success:
                    false,

                error:
                    "Não foi possível verificar a liberação.",
            };
        }

        if (
            !release ||
            !release.is_released
        ) {
            return {
                success:
                    true,

                error:
                    null,

                message:
                    "O recebimento já está bloqueado.",
            };
        }

        // ========================================================
        // REVOGAR
        // ========================================================

        const now =
            new Date()
                .toISOString();

        const {
            error:
            updateError,
        } =
            await admin
                .from(
                    "sienge_receipt_releases"
                )
                .update({
                    is_released:
                        false,

                    revoked_at:
                        now,

                    revoked_by:
                        userId,

                    updated_at:
                        now,
                })
                .eq(
                    "item_id",
                    itemId
                );

        if (
            updateError
        ) {
            console.error(
                "Erro ao revogar liberação:",
                updateError
            );

            return {
                success:
                    false,

                error:
                    "Não foi possível revogar a liberação.",
            };
        }

        revalidateSiengePaths(
            requestKey
        );

        return {
            success:
                true,

            error:
                null,

            message:
                "Liberação do recebimento revogada.",
        };
    } catch (
    error
    ) {
        console.error(
            "Erro inesperado ao revogar recebimento:",
            error
        );

        return {
            success:
                false,

            error:
                error instanceof
                    Error
                    ? error.message
                    : "Não foi possível revogar a liberação.",
        };
    }
}

// ============================================================
// 4. ATUALIZAR RECEBIMENTO DO SOLICITANTE
// ============================================================

export async function updateDeliveryConfirmation(
    formData:
        FormData
): Promise<DeliveryUpdateState> {
    try {
        // ========================================================
        // AUTENTICAÇÃO
        // ========================================================

        const auth =
            await getAuthContext();

        if (
            !auth.success
        ) {
            return {
                success:
                    false,

                error:
                    auth.error,
            };
        }

        const {
            userId,
        } =
            auth.data;

        // ========================================================
        // DADOS
        // ========================================================

        const itemId =
            cleanText(
                formData.get(
                    "itemId"
                ),
                100
            );

        const requestKey =
            cleanText(
                formData.get(
                    "requestKey"
                ),
                300
            );

        const deliveryStatus =
            cleanText(
                formData.get(
                    "deliveryStatus"
                ),
                100
            );

        let deliveryDate =
            cleanText(
                formData.get(
                    "deliveryDate"
                ),
                10
            );

        let receivedBy =
            cleanText(
                formData.get(
                    "receivedBy"
                ),
                150
            );

        let invoiceNumber =
            cleanText(
                formData.get(
                    "invoiceNumber"
                ),
                100
            );

        if (
            !itemId
        ) {
            return {
                success:
                    false,

                error:
                    "Item do pedido não informado.",
            };
        }

        if (
            !requestKey
        ) {
            return {
                success:
                    false,

                error:
                    "Solicitação não informada.",
            };
        }

        if (
            !DELIVERY_STATUSES.includes(
                deliveryStatus as
                DeliveryStatus
            )
        ) {
            return {
                success:
                    false,

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
        // CAMPOS DE RECEBIMENTO
        // ========================================================

        if (
            isReceiptStatus
        ) {
            if (
                !deliveryDate
            ) {
                return {
                    success:
                        false,

                    error:
                        "Informe a data do recebimento.",
                };
            }

            if (
                !isValidDate(
                    deliveryDate
                )
            ) {
                return {
                    success:
                        false,

                    error:
                        "A data de recebimento é inválida.",
                };
            }

            const today =
                getTodayIso();

            if (
                today &&
                deliveryDate >
                today
            ) {
                return {
                    success:
                        false,

                    error:
                        "A data de recebimento não pode ser futura.",
                };
            }

            if (
                receivedBy.length <
                3
            ) {
                return {
                    success:
                        false,

                    error:
                        "Informe quem recebeu o pedido.",
                };
            }

            if (
                deliveryStatus ===
                "Entregue" &&
                !invoiceNumber
            ) {
                return {
                    success:
                        false,

                    error:
                        "Informe o número da Nota Fiscal.",
                };
            }
        } else {
            deliveryDate =
                "";

            receivedBy =
                "";

            invoiceNumber =
                "";
        }

        // ========================================================
        // ITEM + SOLICITAÇÃO + LIBERAÇÃO
        // ========================================================

        const [
            item,
            summary,
            release,
        ] =
            await Promise.all([
                getItem(
                    itemId
                ),

                getSummary(
                    requestKey
                ),

                getReceiptRelease(
                    itemId
                ),
            ]);

        if (
            !item
        ) {
            return {
                success:
                    false,

                error:
                    "Item não encontrado.",
            };
        }

        if (
            !summary
        ) {
            return {
                success:
                    false,

                error:
                    "Solicitação não encontrada.",
            };
        }

        // ========================================================
        // SOMENTE SOLICITANTE RESPONSÁVEL
        // ========================================================

        if (
            !item.requester_profile_id ||
            item.requester_profile_id !==
            userId
        ) {
            return {
                success:
                    false,

                error:
                    "Somente o solicitante responsável pode atualizar o recebimento deste item.",
            };
        }

        if (
            summary.requester_profile_id !==
            userId
        ) {
            return {
                success:
                    false,

                error:
                    "Esta solicitação não pertence ao usuário autenticado.",
            };
        }

        if (
            !itemBelongsToRequest(
                item,
                summary
            )
        ) {
            return {
                success:
                    false,

                error:
                    "O item informado não pertence a esta solicitação.",
            };
        }

        // ========================================================
        // LIBERAÇÃO FINANCEIRA OBRIGATÓRIA
        // ========================================================

        if (
            !release ||
            !release.is_released
        ) {
            return {
                success:
                    false,

                error:
                    "O recebimento ainda não foi liberado pelo Financeiro.",
            };
        }

        // ========================================================
        // SALVAR CONFIRMAÇÃO
        // ========================================================

        const admin =
            createAdminClient();

        const now =
            new Date()
                .toISOString();

        const confirmationData = {
            item_id:
                itemId,

            requester_profile_id:
                userId,

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

            updated_at:
                now,
        };

        // ========================================================
        // LOCALIZAR CONFIRMAÇÃO EXISTENTE
        // ========================================================

        const {
            data:
            existingConfirmation,

            error:
            existingError,
        } =
            await admin
                .from(
                    "sienge_requester_delivery_confirmations"
                )
                .select(
                    "item_id"
                )
                .eq(
                    "item_id",
                    itemId
                )
                .eq(
                    "requester_profile_id",
                    userId
                )
                .maybeSingle();

        if (
            existingError
        ) {
            console.error(
                "Erro ao consultar confirmação existente:",
                existingError
            );

            return {
                success:
                    false,

                error:
                    "Não foi possível verificar a confirmação atual.",
            };
        }

        // ========================================================
        // UPDATE
        // ========================================================

        if (
            existingConfirmation
        ) {
            const {
                error:
                updateError,
            } =
                await admin
                    .from(
                        "sienge_requester_delivery_confirmations"
                    )
                    .update({
                        delivery_status:
                            confirmationData.delivery_status,

                        delivery_date:
                            confirmationData.delivery_date,

                        received_by:
                            confirmationData.received_by,

                        invoice_number:
                            confirmationData.invoice_number,

                        updated_at:
                            confirmationData.updated_at,
                    })
                    .eq(
                        "item_id",
                        itemId
                    )
                    .eq(
                        "requester_profile_id",
                        userId
                    );

            if (
                updateError
            ) {
                console.error(
                    "Erro ao atualizar confirmação:",
                    updateError
                );

                return {
                    success:
                        false,

                    error:
                        "Não foi possível salvar as informações do recebimento.",
                };
            }
        } else {
            // ======================================================
            // INSERT
            // ======================================================

            const {
                error:
                insertError,
            } =
                await admin
                    .from(
                        "sienge_requester_delivery_confirmations"
                    )
                    .insert(
                        confirmationData
                    );

            if (
                insertError
            ) {
                console.error(
                    "Erro ao criar confirmação:",
                    insertError
                );

                return {
                    success:
                        false,

                    error:
                        "Não foi possível salvar as informações do recebimento.",
                };
            }
        }

        revalidateSiengePaths(
            requestKey
        );

        return {
            success:
                true,

            error:
                null,

            message:
                deliveryStatus ===
                    "Entregue"
                    ? "Recebimento confirmado com sucesso."
                    : deliveryStatus ===
                        "Entregue parcialmente"
                        ? "Recebimento parcial registrado com sucesso."
                        : "Informações da entrega atualizadas.",
        };
    } catch (
    error
    ) {
        console.error(
            "Erro inesperado ao atualizar recebimento:",
            error
        );

        return {
            success:
                false,

            error:
                error instanceof
                    Error
                    ? error.message
                    : "Não foi possível atualizar o recebimento.",
        };
    }
}