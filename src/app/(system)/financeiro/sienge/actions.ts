"use server";

import ExcelJS from "exceljs";

import {
    createHash,
} from "crypto";

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

export type SiengeNormalizedRow = {
    source_key: string;

    sienge_item_id:
    | string
    | null;

    sc_number: string;

    insumo: string;

    requester_sienge_username:
    | string
    | null;

    cost_center_or_site:
    | string
    | null;

    request_date:
    | string
    | null;

    quantity:
    | number
    | null;

    unit:
    | string
    | null;

    supply_status:
    | string
    | null;

    supply_status_date:
    | string
    | null;

    authorization_status:
    | string
    | null;

    authorization_date:
    | string
    | null;

    pending_quantity:
    | number
    | null;

    balance_status:
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

    initial_delivery_forecast:
    | string
    | null;

    delivery_or_pickup_forecast:
    | string
    | null;

    delivery_status:
    | string
    | null;

    delivery_date:
    | string
    | null;

    received_by:
    | string
    | null;

    invoice_number:
    | string
    | null;

    system_requester:
    | string
    | null;

    source_row: number;

    source_sheet: string;
};

export type SiengePreviewResult = {
    success: boolean;

    error:
    | string
    | null;

    preview:
    | {
        fileName: string;
        fileSize: number;

        sheetName: string;

        totalRows: number;

        uniqueRequests: number;

        uniqueUsers: number;

        unmatchedUsers:
        string[];

        sample:
        SiengeNormalizedRow[];
    }
    | null;
};

export type SiengeReconciliationSummary = {
    checked: number;

    linked: number;

    pending: number;

    conflicts: number;

    error:
    | string
    | null;
};

export type SiengeImportResult = {
    success: boolean;

    error:
    | string
    | null;

    result:
    | {
        batchId: string;

        total: number;

        inserted: number;

        updated: number;

        unchanged: number;

        unmatchedUsers: number;

        reconciliation:
        SiengeReconciliationSummary;
    }
    | null;
};

type CardRequestRow = {
    id: string;

    requester_id:
    | string
    | null;

    sienge_request_number:
    | string
    | null;
};

type CardSiengeLinkRow = {
    id: string;

    card_request_id: string;

    sienge_request_number: string;

    sienge_request_key:
    | string
    | null;

    link_status: string;

    conflict_reason:
    | string
    | null;

    sienge_requester_profile_id:
    | string
    | null;

    sienge_requester_username:
    | string
    | null;

    sienge_cost_center_or_site:
    | string
    | null;
};

type SiengeSummaryRow = {
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
};

// ============================================================
// PRÉVIA
// ============================================================

export async function previewSiengeFile(
    formData: FormData
): Promise<SiengePreviewResult> {
    try {
        const file =
            getUploadedFile(
                formData
            );

        const permission =
            await validateFinanceAccess();

        if (!permission.success) {
            return {
                success: false,
                error:
                    permission.error,
                preview: null,
            };
        }

        const parsed =
            await parseSiengeWorkbook(
                file
            );

        const supabase =
            await createClient();

        const usernames = [
            ...new Set(
                parsed.rows
                    .map(
                        (row) =>
                            row.requester_sienge_username
                    )
                    .filter(
                        (
                            value
                        ): value is string =>
                            Boolean(
                                value
                            )
                    )
            ),
        ];

        let mappedUsers =
            new Set<string>();

        if (
            usernames.length >
            0
        ) {
            const {
                data,
                error,
            } =
                await supabase
                    .from(
                        "sienge_user_mappings"
                    )
                    .select(
                        "sienge_username"
                    )
                    .eq(
                        "active",
                        true
                    );

            if (error) {
                console.error(
                    "Erro ao consultar vínculos Sienge:",
                    error
                );
            } else {
                mappedUsers =
                    new Set(
                        (
                            data ??
                            []
                        ).map(
                            (item) =>
                                normalizeUsername(
                                    item.sienge_username
                                )
                        )
                    );
            }
        }

        const unmatchedUsers =
            usernames
                .filter(
                    (username) =>
                        !mappedUsers.has(
                            normalizeUsername(
                                username
                            )
                        )
                )
                .sort();

        const uniqueRequests =
            new Set(
                parsed.rows.map(
                    (row) =>
                        row.sc_number
                )
            ).size;

        return {
            success: true,

            error: null,

            preview: {
                fileName:
                    file.name,

                fileSize:
                    file.size,

                sheetName:
                    parsed.sheetName,

                totalRows:
                    parsed.rows.length,

                uniqueRequests,

                uniqueUsers:
                    usernames.length,

                unmatchedUsers,

                sample:
                    parsed.rows.slice(
                        0,
                        8
                    ),
            },
        };
    } catch (error) {
        console.error(
            "Erro ao analisar Excel do Sienge:",
            error
        );

        return {
            success: false,

            error:
                getErrorMessage(
                    error,
                    "Não foi possível analisar o arquivo."
                ),

            preview: null,
        };
    }
}

// ============================================================
// IMPORTAÇÃO
// ============================================================

export async function importSiengeFile(
    formData: FormData
): Promise<SiengeImportResult> {
    let batchId:
        | string
        | null =
        null;

    try {
        const file =
            getUploadedFile(
                formData
            );

        const permission =
            await validateFinanceAccess();

        if (!permission.success) {
            return {
                success: false,
                error:
                    permission.error,
                result: null,
            };
        }

        const parsed =
            await parseSiengeWorkbook(
                file
            );

        if (
            parsed.rows.length ===
            0
        ) {
            return {
                success: false,
                error:
                    "Nenhuma linha válida foi encontrada no arquivo.",
                result: null,
            };
        }

        const supabase =
            await createClient();

        // ========================================================
        // CRIAR LOTE
        // ========================================================

        const {
            data:
            batch,

            error:
            batchError,
        } =
            await supabase
                .from(
                    "sienge_import_batches"
                )
                .insert({
                    file_name:
                        file.name,

                    file_size:
                        file.size,

                    source_sheet:
                        parsed.sheetName,

                    status:
                        "processing",

                    total_rows:
                        parsed.rows.length,

                    imported_by:
                        permission.userId,

                    metadata: {
                        sheet:
                            parsed.sheetName,

                        imported_at:
                            new Date()
                                .toISOString(),
                    },
                })
                .select(
                    "id"
                )
                .single();

        if (
            batchError ||
            !batch
        ) {
            console.error(
                "Erro ao criar lote Sienge:",
                batchError
            );

            return {
                success: false,

                error:
                    batchError?.message ??
                    "Não foi possível iniciar a importação.",

                result: null,
            };
        }

        batchId =
            batch.id;

        // ========================================================
        // IMPORTAR MÁSCARA
        // ========================================================

        const {
            data,
            error,
        } =
            await supabase.rpc(
                "import_sienge_purchase_rows",
                {
                    p_batch_id:
                        batch.id,

                    p_rows:
                        parsed.rows,
                }
            );

        if (error) {
            console.error(
                "Erro RPC import_sienge_purchase_rows:",
                error
            );

            await supabase
                .from(
                    "sienge_import_batches"
                )
                .update({
                    status:
                        "failed",

                    metadata: {
                        error:
                            error.message,
                    },

                    completed_at:
                        new Date()
                            .toISOString(),
                })
                .eq(
                    "id",
                    batch.id
                );

            return {
                success: false,

                error:
                    error.message,

                result: null,
            };
        }

        const result =
            data as {
                total?: number;

                inserted?: number;

                updated?: number;

                unchanged?: number;

                unmatched_users?: number;
            };

        // ========================================================
        // CONCILIAÇÃO AUTOMÁTICA
        //
        // A importação principal já terminou.
        //
        // Se a conciliação apresentar problema, NÃO desfazemos
        // nem marcamos como falha a importação do Sienge.
        // ========================================================

        let reconciliation:
            SiengeReconciliationSummary = {
            checked: 0,
            linked: 0,
            pending: 0,
            conflicts: 0,
            error: null,
        };

        try {
            reconciliation =
                await reconcileCardSiengeLinks(
                    permission.userId
                );
        } catch (
        reconciliationError
        ) {
            console.error(
                "Erro na conciliação Cartão x Sienge:",
                reconciliationError
            );

            reconciliation = {
                checked: 0,
                linked: 0,
                pending: 0,
                conflicts: 0,

                error:
                    getErrorMessage(
                        reconciliationError,
                        "A máscara foi importada, mas a conciliação de cartões não pôde ser concluída."
                    ),
            };
        }

        // ========================================================
        // REVALIDAÇÃO
        // ========================================================

        revalidatePath(
            "/financeiro/sienge"
        );

        revalidatePath(
            "/financeiro/solicitacoes"
        );

        revalidatePath(
            "/meus-pedidos"
        );

        revalidatePath(
            "/pendencias"
        );

        return {
            success: true,

            error: null,

            result: {
                batchId:
                    batch.id,

                total:
                    Number(
                        result.total ??
                        parsed.rows.length
                    ),

                inserted:
                    Number(
                        result.inserted ??
                        0
                    ),

                updated:
                    Number(
                        result.updated ??
                        0
                    ),

                unchanged:
                    Number(
                        result.unchanged ??
                        0
                    ),

                unmatchedUsers:
                    Number(
                        result.unmatched_users ??
                        0
                    ),

                reconciliation,
            },
        };
    } catch (error) {
        console.error(
            "Erro na importação Sienge:",
            error
        );

        if (
            batchId
        ) {
            try {
                const supabase =
                    await createClient();

                await supabase
                    .from(
                        "sienge_import_batches"
                    )
                    .update({
                        status:
                            "failed",

                        metadata: {
                            error:
                                getErrorMessage(
                                    error,
                                    "Falha durante a importação."
                                ),
                        },

                        completed_at:
                            new Date()
                                .toISOString(),
                    })
                    .eq(
                        "id",
                        batchId
                    );
            } catch {
                // Não impede o retorno
                // do erro principal.
            }
        }

        return {
            success: false,

            error:
                getErrorMessage(
                    error,
                    "Não foi possível importar o arquivo."
                ),

            result: null,
        };
    }
}

// ============================================================
// CONCILIAÇÃO CARTÃO x SIENGE
//
// ETAPAS:
//
// 1. Procura solicitações de cartão com Nº Sienge.
// 2. Garante que exista card_sienge_links.
// 3. Procura a SC importada.
// 4. Confere o solicitante.
// 5. Vincula automaticamente quando não há ambiguidade.
// ============================================================

async function reconcileCardSiengeLinks(
    performedBy:
        string
): Promise<SiengeReconciliationSummary> {
    const admin =
        createAdminClient();

    const now =
        new Date()
            .toISOString();

    // ========================================================
    // SOLICITAÇÕES DE CARTÃO COM NÚMERO SIENGE
    //
    // Essa sincronização também pega solicitações criadas
    // depois do backfill inicial da migration.
    // ========================================================

    const {
        data:
        cardRequestsData,

        error:
        cardRequestsError,
    } =
        await admin
            .from(
                "card_requests"
            )
            .select(
                `
                id,
                requester_id,
                sienge_request_number
                `
            )
            .not(
                "sienge_request_number",
                "is",
                null
            );

    if (
        cardRequestsError
    ) {
        throw new Error(
            cardRequestsError.message
        );
    }

    const cardRequests =
        (
            cardRequestsData ??
            []
        ) as CardRequestRow[];

    const validCardRequests =
        cardRequests.filter(
            (
                request
            ) =>
                Boolean(
                    normalizeSiengeNumber(
                        request.sienge_request_number
                    )
                )
        );

    if (
        validCardRequests.length ===
        0
    ) {
        return {
            checked: 0,
            linked: 0,
            pending: 0,
            conflicts: 0,
            error: null,
        };
    }

    // ========================================================
    // VÍNCULOS EXISTENTES
    // ========================================================

    const cardRequestIds =
        validCardRequests.map(
            (
                request
            ) =>
                request.id
        );

    const {
        data:
        existingLinksData,

        error:
        existingLinksError,
    } =
        await admin
            .from(
                "card_sienge_links"
            )
            .select(
                `
                id,
                card_request_id,
                sienge_request_number,
                sienge_request_key,
                link_status,
                conflict_reason,
                sienge_requester_profile_id,
                sienge_requester_username,
                sienge_cost_center_or_site
                `
            )
            .in(
                "card_request_id",
                cardRequestIds
            );

    if (
        existingLinksError
    ) {
        throw new Error(
            existingLinksError.message
        );
    }

    const existingLinks =
        (
            existingLinksData ??
            []
        ) as CardSiengeLinkRow[];

    const linkByCardRequest =
        new Map<
            string,
            CardSiengeLinkRow
        >();

    for (
        const link
        of existingLinks
    ) {
        linkByCardRequest.set(
            link.card_request_id,
            link
        );
    }

    // ========================================================
    // CRIAR VÍNCULOS QUE AINDA NÃO EXISTEM
    //
    // Se o Nº Sienge tiver sido alterado posteriormente,
    // reiniciamos a conciliação.
    // ========================================================

    const linksToInsert:
        {
            card_request_id: string;

            sienge_request_number: string;

            link_status: string;
        }[] =
        [];

    for (
        const request
        of validCardRequests
    ) {
        const siengeNumber =
            normalizeSiengeNumber(
                request.sienge_request_number
            );

        if (
            !siengeNumber
        ) {
            continue;
        }

        const existing =
            linkByCardRequest.get(
                request.id
            );

        if (
            !existing
        ) {
            linksToInsert.push({
                card_request_id:
                    request.id,

                sienge_request_number:
                    siengeNumber,

                link_status:
                    "pending",
            });

            continue;
        }

        const existingNumber =
            normalizeSiengeNumber(
                existing.sienge_request_number
            );

        if (
            existingNumber !==
            siengeNumber
        ) {
            const {
                error:
                resetError,
            } =
                await admin
                    .from(
                        "card_sienge_links"
                    )
                    .update({
                        sienge_request_number:
                            siengeNumber,

                        sienge_request_key:
                            null,

                        link_status:
                            "pending",

                        conflict_reason:
                            null,

                        sienge_requester_profile_id:
                            null,

                        sienge_requester_username:
                            null,

                        sienge_cost_center_or_site:
                            null,

                        linked_at:
                            null,

                        linked_by:
                            null,

                        last_checked_at:
                            null,
                    })
                    .eq(
                        "id",
                        existing.id
                    );

            if (
                resetError
            ) {
                throw new Error(
                    resetError.message
                );
            }
        }
    }

    if (
        linksToInsert.length >
        0
    ) {
        const {
            error:
            insertLinksError,
        } =
            await admin
                .from(
                    "card_sienge_links"
                )
                .insert(
                    linksToInsert
                );

        if (
            insertLinksError
        ) {
            throw new Error(
                insertLinksError.message
            );
        }
    }

    // ========================================================
    // RECARGAR VÍNCULOS
    //
    // Reavaliamos também not_found e conflict.
    //
    // Isso é importante caso:
    // - a SC seja importada depois;
    // - o mapeamento de usuário seja corrigido depois.
    // ========================================================

    const {
        data:
        linksData,

        error:
        linksError,
    } =
        await admin
            .from(
                "card_sienge_links"
            )
            .select(
                `
                id,
                card_request_id,
                sienge_request_number,
                sienge_request_key,
                link_status,
                conflict_reason,
                sienge_requester_profile_id,
                sienge_requester_username,
                sienge_cost_center_or_site
                `
            )
            .in(
                "card_request_id",
                cardRequestIds
            )
            .in(
                "link_status",
                [
                    "pending",
                    "not_found",
                    "conflict",
                ]
            );

    if (
        linksError
    ) {
        throw new Error(
            linksError.message
        );
    }

    const links =
        (
            linksData ??
            []
        ) as CardSiengeLinkRow[];

    if (
        links.length ===
        0
    ) {
        return {
            checked: 0,
            linked: 0,
            pending: 0,
            conflicts: 0,
            error: null,
        };
    }

    // ========================================================
    // MAPA DAS SOLICITAÇÕES DE CARTÃO
    // ========================================================

    const cardRequestById =
        new Map<
            string,
            CardRequestRow
        >();

    for (
        const request
        of validCardRequests
    ) {
        cardRequestById.set(
            request.id,
            request
        );
    }

    // ========================================================
    // RESUMOS DO SIENGE
    //
    // Buscamos todos e normalizamos em memória para evitar
    // problemas como:
    //
    // "SC 105842"
    // "105842"
    // " 105842 "
    // ========================================================

    const {
        data:
        summariesData,

        error:
        summariesError,
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
                cost_center_or_site
                `
            );

    if (
        summariesError
    ) {
        throw new Error(
            summariesError.message
        );
    }

    const summaries =
        (
            summariesData ??
            []
        ) as SiengeSummaryRow[];

    const summariesBySc =
        new Map<
            string,
            SiengeSummaryRow[]
        >();

    for (
        const summary
        of summaries
    ) {
        const number =
            normalizeSiengeNumber(
                summary.sc_number
            );

        if (
            !number
        ) {
            continue;
        }

        const current =
            summariesBySc.get(
                number
            ) ??
            [];

        current.push(
            summary
        );

        summariesBySc.set(
            number,
            current
        );
    }

    // ========================================================
    // CONTADORES
    // ========================================================

    let linked =
        0;

    let pending =
        0;

    let conflicts =
        0;

    // ========================================================
    // CONCILIAR CADA VÍNCULO
    // ========================================================

    for (
        const link
        of links
    ) {
        const cardRequest =
            cardRequestById.get(
                link.card_request_id
            );

        if (
            !cardRequest
        ) {
            continue;
        }

        const siengeNumber =
            normalizeSiengeNumber(
                link.sienge_request_number
            );

        const candidates =
            siengeNumber
                ? summariesBySc.get(
                    siengeNumber
                ) ??
                []
                : [];

        // ====================================================
        // NÃO ENCONTRADO
        // ====================================================

        if (
            candidates.length ===
            0
        ) {
            const {
                error:
                notFoundError,
            } =
                await admin
                    .from(
                        "card_sienge_links"
                    )
                    .update({
                        link_status:
                            "not_found",

                        sienge_request_key:
                            null,

                        conflict_reason:
                            null,

                        sienge_requester_profile_id:
                            null,

                        sienge_requester_username:
                            null,

                        sienge_cost_center_or_site:
                            null,

                        last_checked_at:
                            now,
                    })
                    .eq(
                        "id",
                        link.id
                    );

            if (
                notFoundError
            ) {
                console.error(
                    "Erro ao marcar conciliação como não encontrada:",
                    notFoundError
                );

                conflicts++;

                continue;
            }

            pending++;

            continue;
        }

        // ====================================================
        // VALIDAR SOLICITANTE DO CARTÃO
        // ====================================================

        if (
            !cardRequest.requester_id
        ) {
            await markLinkConflict({
                linkId:
                    link.id,

                reason:
                    "A solicitação de cartão não possui solicitante vinculado.",

                checkedAt:
                    now,
            });

            conflicts++;

            continue;
        }

        // ====================================================
        // PROCURAR CANDIDATO DO MESMO SOLICITANTE
        // ====================================================

        const requesterMatches =
            candidates.filter(
                (
                    candidate
                ) =>
                    candidate.requester_profile_id ===
                    cardRequest.requester_id
            );

        let selected:
            | SiengeSummaryRow
            | null =
            null;

        // ====================================================
        // UM ÚNICO REGISTRO DA SC
        // ====================================================

        if (
            candidates.length ===
            1
        ) {
            const candidate =
                candidates[0];

            if (
                !candidate
                    .requester_profile_id
            ) {
                await markLinkConflict({
                    linkId:
                        link.id,

                    reason:
                        "A SC foi encontrada, mas o solicitante do Sienge ainda não está vinculado a um usuário do Projeta Compras.",

                    checkedAt:
                        now,

                    candidate,
                });

                conflicts++;

                continue;
            }

            if (
                candidate
                    .requester_profile_id !==
                cardRequest.requester_id
            ) {
                await markLinkConflict({
                    linkId:
                        link.id,

                    reason:
                        "A SC foi encontrada, porém o solicitante do Sienge é diferente do solicitante da requisição de cartão.",

                    checkedAt:
                        now,

                    candidate,
                });

                conflicts++;

                continue;
            }

            selected =
                candidate;
        }

        // ====================================================
        // A MESMA SC POSSUI MAIS DE UM AGRUPAMENTO
        // ====================================================

        if (
            candidates.length >
            1
        ) {
            if (
                requesterMatches.length ===
                1
            ) {
                selected =
                    requesterMatches[0] ??
                    null;
            } else if (
                requesterMatches.length >
                1
            ) {
                await markLinkConflict({
                    linkId:
                        link.id,

                    reason:
                        "A SC possui mais de um agrupamento para o mesmo solicitante. O Financeiro precisa revisar qual solicitação deve ser vinculada.",

                    checkedAt:
                        now,
                });

                conflicts++;

                continue;
            } else {
                const hasUnmappedRequester =
                    candidates.some(
                        (
                            candidate
                        ) =>
                            !candidate
                                .requester_profile_id
                    );

                await markLinkConflict({
                    linkId:
                        link.id,

                    reason:
                        hasUnmappedRequester
                            ? "A SC foi encontrada, mas não foi possível validar o solicitante porque existem usuários do Sienge ainda sem vínculo."
                            : "A SC foi encontrada, mas nenhum dos registros pertence ao mesmo solicitante da requisição de cartão.",

                    checkedAt:
                        now,
                });

                conflicts++;

                continue;
            }
        }

        if (
            !selected
        ) {
            await markLinkConflict({
                linkId:
                    link.id,

                reason:
                    "Não foi possível determinar de forma segura qual solicitação do Sienge deve ser vinculada.",

                checkedAt:
                    now,
            });

            conflicts++;

            continue;
        }

        // ====================================================
        // VÍNCULO CONFIRMADO
        // ====================================================

        const {
            error:
            linkedError,
        } =
            await admin
                .from(
                    "card_sienge_links"
                )
                .update({
                    sienge_request_number:
                        siengeNumber,

                    sienge_request_key:
                        selected.request_key,

                    link_status:
                        "linked",

                    conflict_reason:
                        null,

                    sienge_requester_profile_id:
                        selected
                            .requester_profile_id,

                    sienge_requester_username:
                        selected
                            .requester_sienge_username,

                    sienge_cost_center_or_site:
                        selected
                            .cost_center_or_site,

                    last_checked_at:
                        now,

                    linked_at:
                        now,

                    linked_by:
                        performedBy,
                })
                .eq(
                    "id",
                    link.id
                );

        if (
            linkedError
        ) {
            console.error(
                "Erro ao confirmar vínculo Cartão x Sienge:",
                linkedError
            );

            conflicts++;

            continue;
        }

        linked++;
    }

    return {
        checked:
            links.length,

        linked,

        pending,

        conflicts,

        error:
            null,
    };
}

// ============================================================
// MARCAR CONFLITO
// ============================================================

async function markLinkConflict({
    linkId,
    reason,
    checkedAt,
    candidate,
}: {
    linkId: string;

    reason: string;

    checkedAt: string;

    candidate?:
    | SiengeSummaryRow
    | null;
}) {
    const admin =
        createAdminClient();

    const {
        error,
    } =
        await admin
            .from(
                "card_sienge_links"
            )
            .update({
                link_status:
                    "conflict",

                conflict_reason:
                    reason,

                sienge_request_key:
                    candidate
                        ?.request_key ??
                    null,

                sienge_requester_profile_id:
                    candidate
                        ?.requester_profile_id ??
                    null,

                sienge_requester_username:
                    candidate
                        ?.requester_sienge_username ??
                    null,

                sienge_cost_center_or_site:
                    candidate
                        ?.cost_center_or_site ??
                    null,

                last_checked_at:
                    checkedAt,

                linked_at:
                    null,

                linked_by:
                    null,
            })
            .eq(
                "id",
                linkId
            );

    if (
        error
    ) {
        console.error(
            "Erro ao registrar conflito de conciliação:",
            error
        );
    }
}

// ============================================================
// NORMALIZAR Nº SIENGE
// ============================================================

function normalizeSiengeNumber(
    value:
        | string
        | null
        | undefined
) {
    const normalized =
        String(
            value ??
            ""
        )
            .trim()
            .replace(
                /^SC[\s:#-]*/i,
                ""
            )
            .replace(
                /\s+/g,
                ""
            )
            .toUpperCase();

    return normalized;
}

// ============================================================
// PERMISSÕES
// ============================================================

async function validateFinanceAccess(): Promise<
    | {
        success: true;
        userId: string;
        error: null;
    }
    | {
        success: false;
        userId: null;
        error: string;
    }
> {
    const supabase =
        await createClient();

    const {
        data:
        claimsData,
    } =
        await supabase.auth.getClaims();

    const userId =
        claimsData
            ?.claims
            ?.sub;

    if (
        !userId
    ) {
        return {
            success: false,

            userId: null,

            error:
                "Usuário não autenticado.",
        };
    }

    const {
        data:
        roleRows,

        error,
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
        error
    ) {
        return {
            success: false,

            userId: null,

            error:
                "Não foi possível verificar suas permissões.",
        };
    }

    const roles =
        (
            roleRows ??
            []
        ).map(
            (
                item
            ) =>
                item.role
        );

    const canAccess =
        roles.includes(
            "finance"
        ) ||
        roles.includes(
            "admin"
        ) ||
        roles.includes(
            "superadmin"
        );

    if (
        !canAccess
    ) {
        return {
            success: false,

            userId: null,

            error:
                "Você não possui permissão para importar dados do Sienge.",
        };
    }

    return {
        success: true,

        userId,

        error: null,
    };
}

// ============================================================
// ARQUIVO
// ============================================================

function getUploadedFile(
    formData:
        FormData
) {
    const file =
        formData.get(
            "file"
        );

    if (
        !(
            file instanceof
            File
        )
    ) {
        throw new Error(
            "Selecione o arquivo Excel do Sienge."
        );
    }

    if (
        file.size ===
        0
    ) {
        throw new Error(
            "O arquivo selecionado está vazio."
        );
    }

    const name =
        file.name
            .toLowerCase();

    if (
        !name.endsWith(
            ".xlsx"
        ) &&
        !name.endsWith(
            ".xlsm"
        )
    ) {
        throw new Error(
            "Envie um arquivo Excel no formato .xlsx ou .xlsm."
        );
    }

    if (
        file.size >
        20 *
        1024 *
        1024
    ) {
        throw new Error(
            "O arquivo ultrapassa o limite de 20 MB."
        );
    }

    return file;
}

// ============================================================
// LEITURA DO EXCEL
// ============================================================

async function parseSiengeWorkbook(
    file:
        File
) {
    const arrayBuffer =
        await file.arrayBuffer();

    const buffer =
        Buffer.from(
            arrayBuffer
        );

    const workbook =
        new ExcelJS.Workbook();

    type ExcelLoadInput =
        Parameters<
            typeof workbook.xlsx.load
        >[0];

    await workbook.xlsx.load(
        buffer as unknown as
        ExcelLoadInput
    );

    if (
        workbook.worksheets.length ===
        0
    ) {
        throw new Error(
            "O Excel não possui nenhuma planilha."
        );
    }

    const preferredSheets = [
        workbook.getWorksheet(
            "Planilha1"
        ),

        workbook.getWorksheet(
            "Relatório"
        ),

        ...workbook.worksheets,
    ].filter(
        (
            worksheet,
            index,
            array
        ): worksheet is ExcelJS.Worksheet =>
            Boolean(
                worksheet
            ) &&
            array.indexOf(
                worksheet
            ) ===
            index
    );

    for (
        const worksheet
        of preferredSheets
    ) {
        const detected =
            detectHeaderRow(
                worksheet
            );

        if (
            !detected
        ) {
            continue;
        }

        const rows =
            normalizeWorksheet(
                worksheet,
                detected
            );

        if (
            rows.length >
            0
        ) {
            return {
                sheetName:
                    worksheet.name,

                rows,
            };
        }
    }

    throw new Error(
        'Não encontrei uma aba compatível. O arquivo precisa conter colunas como "INSUMO", "SOLICITANTE" e "SC/Solicitação".'
    );
}

// ============================================================
// DETECTAR CABEÇALHO
// ============================================================

function detectHeaderRow(
    worksheet:
        ExcelJS.Worksheet
) {
    const maxRows =
        Math.min(
            worksheet.rowCount,
            20
        );

    for (
        let rowNumber =
            1;

        rowNumber <=
        maxRows;

        rowNumber++
    ) {
        const row =
            worksheet.getRow(
                rowNumber
            );

        const headers:
            {
                column: number;
                label: string;
            }[] = [];

        row.eachCell(
            {
                includeEmpty:
                    false,
            },
            (
                cell,
                column
            ) => {
                const label =
                    normalizeHeader(
                        cell.text
                    );

                if (
                    label
                ) {
                    headers.push({
                        column,
                        label,
                    });
                }
            }
        );

        const labels =
            headers.map(
                (
                    item
                ) =>
                    item.label
            );

        const hasItem =
            labels.includes(
                "INSUMO"
            );

        const hasRequester =
            labels.includes(
                "SOLICITANTE"
            );

        const hasSc =
            labels.some(
                (
                    label
                ) =>
                    label ===
                    "SC" ||
                    label ===
                    "SOLICITACAO"
            );

        if (
            hasItem &&
            hasRequester &&
            hasSc
        ) {
            return {
                rowNumber,
                headers,
            };
        }
    }

    return null;
}

// ============================================================
// NORMALIZAR ABA
// ============================================================

function normalizeWorksheet(
    worksheet:
        ExcelJS.Worksheet,

    detected: {
        rowNumber: number;

        headers: {
            column: number;
            label: string;
        }[];
    }
) {
    const rows:
        SiengeNormalizedRow[] =
        [];

    const insumoColumn =
        findColumn(
            detected.headers,
            [
                "INSUMO",
            ]
        );

    const supplyStatusColumn =
        findColumn(
            detected.headers,
            [
                "STATUS SPRIMENTOS",
                "STATUS SUPRIMENTOS",
            ]
        );

    const dateColumns =
        findAllColumns(
            detected.headers,
            [
                "DATA",
            ]
        );

    const supplyDateColumn =
        dateColumns[0] ??
        null;

    const deliveryDateColumn =
        dateColumns.length >
            1
            ? dateColumns[
            dateColumns.length -
            1
            ]
            : null;

    const costCenterColumn =
        findColumn(
            detected.headers,
            [
                "OBRA CENTRO DE CUSTO",
                "OBRA2",
            ]
        );

    const requestDateColumn =
        findColumn(
            detected.headers,
            [
                "DATA SOLICITACAO",
            ]
        );

    const initialForecastColumn =
        findColumn(
            detected.headers,
            [
                "PREVISAO DE ENTREGA",
            ]
        );

    const requesterColumn =
        findColumn(
            detected.headers,
            [
                "SOLICITANTE",
            ]
        );

    const scColumn =
        findColumn(
            detected.headers,
            [
                "SC",
                "SOLICITACAO",
            ]
        );

    const quantityColumn =
        findColumn(
            detected.headers,
            [
                "QTD SOLICITADA",
                "QT PENDENTE",
            ]
        );

    const unitColumn =
        findColumn(
            detected.headers,
            [
                "UND MEDIDA",
                "UN",
            ]
        );

    const authorizationColumn =
        findColumn(
            detected.headers,
            [
                "AUT",
            ]
        );

    const authorizationDateColumn =
        findColumn(
            detected.headers,
            [
                "DT AUT",
            ]
        );

    const pendingQuantityColumn =
        findColumn(
            detected.headers,
            [
                "QT PENDENTE",
            ]
        );

    const balanceColumn =
        findColumn(
            detected.headers,
            [
                "SD",
            ]
        );

    const orderColumn =
        findColumn(
            detected.headers,
            [
                "PEDIDO",
            ]
        );

    const supplierColumn =
        findColumn(
            detected.headers,
            [
                "FORNECEDOR",
            ]
        );

    const contactColumn =
        findColumn(
            detected.headers,
            [
                "CONTATO",
            ]
        );

    const phoneColumn =
        findColumn(
            detected.headers,
            [
                "TELEFONE",
            ]
        );

    const deliveryForecastColumn =
        findColumn(
            detected.headers,
            [
                "PREVISAO DE ENTREGA RETIRADA",
            ]
        );

    const deliveryStatusColumn =
        findColumn(
            detected.headers,
            [
                "STATUS DA ENTREGA",
            ]
        );

    const receivedByColumn =
        findColumn(
            detected.headers,
            [
                "RECEBIDO POR",
            ]
        );

    const invoiceColumn =
        findColumn(
            detected.headers,
            [
                "NOTA FISCAL",
            ]
        );

    const systemRequesterColumn =
        findColumn(
            detected.headers,
            [
                "SISTEMA SOLICITANTE",
            ]
        );

    if (
        !insumoColumn ||
        !requesterColumn ||
        !scColumn
    ) {
        return [];
    }

    for (
        let rowNumber =
            detected.rowNumber +
            1;

        rowNumber <=
        worksheet.rowCount;

        rowNumber++
    ) {
        const row =
            worksheet.getRow(
                rowNumber
            );

        const insumo =
            cellString(
                row,
                insumoColumn
            );

        const scNumber =
            cellString(
                row,
                scColumn
            );

        if (
            !insumo &&
            !scNumber
        ) {
            continue;
        }

        if (
            !insumo ||
            !scNumber
        ) {
            continue;
        }

        const requester =
            normalizeNullableUsername(
                cellString(
                    row,
                    requesterColumn
                )
            );

        const costCenter =
            cellString(
                row,
                costCenterColumn
            );

        const unit =
            cellString(
                row,
                unitColumn
            );

        const sourceKey =
            createStableSourceKey({
                scNumber,
                insumo,
                costCenter,
                unit,
            });

        rows.push({
            source_key:
                sourceKey,

            sienge_item_id:
                null,

            sc_number:
                scNumber,

            insumo,

            requester_sienge_username:
                requester,

            cost_center_or_site:
                nullableText(
                    costCenter
                ),

            request_date:
                cellDate(
                    row,
                    requestDateColumn
                ),

            quantity:
                cellNumber(
                    row,
                    quantityColumn
                ),

            unit:
                nullableText(
                    unit
                ),

            supply_status:
                nullableText(
                    cellString(
                        row,
                        supplyStatusColumn
                    )
                ),

            supply_status_date:
                cellDate(
                    row,
                    supplyDateColumn
                ),

            authorization_status:
                nullableText(
                    cellString(
                        row,
                        authorizationColumn
                    )
                ),

            authorization_date:
                cellDate(
                    row,
                    authorizationDateColumn
                ),

            pending_quantity:
                cellNumber(
                    row,
                    pendingQuantityColumn
                ),

            balance_status:
                nullableText(
                    cellString(
                        row,
                        balanceColumn
                    )
                ),

            order_number:
                nullableText(
                    cellString(
                        row,
                        orderColumn
                    )
                ),

            supplier_name:
                nullableText(
                    cellString(
                        row,
                        supplierColumn
                    )
                ),

            supplier_contact:
                nullableText(
                    cellString(
                        row,
                        contactColumn
                    )
                ),

            supplier_phone:
                nullableText(
                    cellString(
                        row,
                        phoneColumn
                    )
                ),

            initial_delivery_forecast:
                cellDate(
                    row,
                    initialForecastColumn
                ),

            delivery_or_pickup_forecast:
                cellDate(
                    row,
                    deliveryForecastColumn
                ),

            delivery_status:
                nullableText(
                    cellString(
                        row,
                        deliveryStatusColumn
                    )
                ),

            delivery_date:
                cellDate(
                    row,
                    deliveryDateColumn
                ),

            received_by:
                nullableText(
                    cellString(
                        row,
                        receivedByColumn
                    )
                ),

            invoice_number:
                nullableText(
                    cellString(
                        row,
                        invoiceColumn
                    )
                ),

            system_requester:
                nullableText(
                    cellString(
                        row,
                        systemRequesterColumn
                    )
                ),

            source_row:
                rowNumber,

            source_sheet:
                worksheet.name,
        });
    }

    return rows;
}

// ============================================================
// CHAVE ESTÁVEL
// ============================================================

function createStableSourceKey({
    scNumber,
    insumo,
    costCenter,
    unit,
}: {
    scNumber: string;
    insumo: string;
    costCenter: string;
    unit: string;
}) {
    const signature = [
        normalizeSignature(
            scNumber
        ),

        normalizeSignature(
            insumo
        ),

        normalizeSignature(
            costCenter
        ),

        normalizeSignature(
            unit
        ),
    ].join(
        "|"
    );

    return (
        "AUTO:" +
        createHash(
            "sha256"
        )
            .update(
                signature
            )
            .digest(
                "hex"
            )
    );
}

// ============================================================
// COLUNAS
// ============================================================

function findColumn(
    headers: {
        column: number;
        label: string;
    }[],

    labels: string[]
) {
    const expected =
        labels.map(
            normalizeHeader
        );

    const found =
        headers.find(
            (
                header
            ) =>
                expected.includes(
                    header.label
                )
        );

    return (
        found?.column ??
        null
    );
}

function findAllColumns(
    headers: {
        column: number;
        label: string;
    }[],

    labels: string[]
) {
    const expected =
        labels.map(
            normalizeHeader
        );

    return headers
        .filter(
            (
                header
            ) =>
                expected.includes(
                    header.label
                )
        )
        .map(
            (
                header
            ) =>
                header.column
        );
}

// ============================================================
// LEITURA DE CÉLULAS
// ============================================================

function cellString(
    row:
        ExcelJS.Row,

    column:
        | number
        | null
) {
    if (
        !column
    ) {
        return "";
    }

    const cell =
        row.getCell(
            column
        );

    const value =
        extractCellValue(
            cell.value
        );

    if (
        value ===
        null ||
        value ===
        undefined
    ) {
        return "";
    }

    if (
        value instanceof
        Date
    ) {
        return formatIsoDate(
            value
        );
    }

    return String(
        value
    ).trim();
}

function cellNumber(
    row:
        ExcelJS.Row,

    column:
        | number
        | null
) {
    if (
        !column
    ) {
        return null;
    }

    const cell =
        row.getCell(
            column
        );

    const raw =
        extractCellValue(
            cell.value
        );

    if (
        raw ===
        null ||
        raw ===
        undefined ||
        raw ===
        ""
    ) {
        return null;
    }

    if (
        typeof raw ===
        "number"
    ) {
        return Number.isFinite(
            raw
        )
            ? raw
            : null;
    }

    const normalized =
        String(
            raw
        )
            .trim()
            .replace(
                /\s/g,
                ""
            )
            .replace(
                /\./g,
                ""
            )
            .replace(
                ",",
                "."
            );

    const number =
        Number(
            normalized
        );

    return Number.isFinite(
        number
    )
        ? number
        : null;
}

function cellDate(
    row:
        ExcelJS.Row,

    column:
        | number
        | null
) {
    if (
        !column
    ) {
        return null;
    }

    const cell =
        row.getCell(
            column
        );

    const raw =
        extractCellValue(
            cell.value
        );

    if (
        raw ===
        null ||
        raw ===
        undefined ||
        raw ===
        ""
    ) {
        return null;
    }

    if (
        raw instanceof
        Date
    ) {
        return formatIsoDate(
            raw
        );
    }

    if (
        typeof raw ===
        "number"
    ) {
        if (
            raw <
            30000 ||
            raw >
            80000
        ) {
            return null;
        }

        const excelEpoch =
            Date.UTC(
                1899,
                11,
                30
            );

        const date =
            new Date(
                excelEpoch +
                raw *
                86400000
            );

        return formatIsoDate(
            date
        );
    }

    const text =
        String(
            raw
        ).trim();

    const br =
        text.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
        );

    if (
        br
    ) {
        return `${br[3]}-${br[2].padStart(
            2,
            "0"
        )}-${br[1].padStart(
            2,
            "0"
        )}`;
    }

    const iso =
        text.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

    if (
        iso
    ) {
        return `${iso[1]}-${iso[2]}-${iso[3]}`;
    }

    return null;
}

function extractCellValue(
    value:
        ExcelJS.CellValue
) {
    if (
        value ===
        null ||
        value ===
        undefined
    ) {
        return null;
    }

    if (
        typeof value !==
        "object"
    ) {
        return value;
    }

    if (
        value instanceof
        Date
    ) {
        return value;
    }

    if (
        "result" in
        value &&
        value.result !==
        undefined
    ) {
        return value.result;
    }

    if (
        "text" in
        value
    ) {
        return value.text;
    }

    if (
        "richText" in
        value
    ) {
        return value.richText
            .map(
                (
                    part
                ) =>
                    part.text
            )
            .join(
                ""
            );
    }

    return null;
}

// ============================================================
// NORMALIZAÇÕES
// ============================================================

function normalizeHeader(
    value:
        | string
        | null
        | undefined
) {
    return String(
        value ??
        ""
    )
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /[./_-]+/g,
            " "
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .toUpperCase();
}

function normalizeSignature(
    value:
        string
) {
    return value
        .normalize(
            "NFD"
        )
        .replace(
            /[\u0300-\u036f]/g,
            ""
        )
        .replace(
            /\s+/g,
            " "
        )
        .trim()
        .toUpperCase();
}

function normalizeUsername(
    value:
        string
) {
    return value
        .trim()
        .toUpperCase();
}

function normalizeNullableUsername(
    value:
        string
) {
    const normalized =
        normalizeUsername(
            value
        );

    return normalized ||
        null;
}

function nullableText(
    value:
        | string
        | null
        | undefined
) {
    const text =
        String(
            value ??
            ""
        ).trim();

    return text ||
        null;
}

function formatIsoDate(
    date:
        Date
) {
    const year =
        date.getFullYear();

    const month =
        String(
            date.getMonth() +
            1
        ).padStart(
            2,
            "0"
        );

    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}`;
}

function getErrorMessage(
    error:
        unknown,

    fallback:
        string
) {
    if (
        error instanceof
        Error
    ) {
        return (
            error.message ||
            fallback
        );
    }

    return fallback;
}