"use server";

import ExcelJS from "exceljs";

import {
    createHash,
} from "crypto";

import {
    revalidatePath,
} from "next/cache";

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
    }
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
                            Boolean(value)
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
        // CRIA LOTE
        // ========================================================

        const {
            data: batch,
            error: batchError,
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
                            new Date().toISOString(),
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
        // IMPORTA
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
                        new Date().toISOString(),
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

        revalidatePath(
            "/financeiro/sienge"
        );

        revalidatePath(
            "/meus-pedidos"
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
            },
        };
    } catch (error) {
        console.error(
            "Erro na importação Sienge:",
            error
        );

        if (batchId) {
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
                            new Date().toISOString(),
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
        data: claimsData,
    } =
        await supabase.auth.getClaims();

    const userId =
        claimsData?.claims?.sub;

    if (!userId) {
        return {
            success: false,
            userId: null,
            error:
                "Usuário não autenticado.",
        };
    }

    const {
        data: roleRows,
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

    if (error) {
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
            (item) =>
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

    if (!canAccess) {
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
    formData: FormData
) {
    const file =
        formData.get(
            "file"
        );

    if (
        !(file instanceof File)
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
        file.name.toLowerCase();

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

    // 20 MB
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
    file: File
) {
    const buffer =
        Buffer.from(
            await file.arrayBuffer()
        );

    const workbook =
        new ExcelJS.Workbook();

    await workbook.xlsx.load(
        buffer
    );

    if (
        workbook.worksheets.length ===
        0
    ) {
        throw new Error(
            "O Excel não possui nenhuma planilha."
        );
    }

    // ==========================================================
    // TENTA PRIMEIRO A MÁSCARA DO FINANCEIRO
    //
    // Depois tenta qualquer aba compatível.
    // ==========================================================

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

        if (!detected) {
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
// DETECTA CABEÇALHO
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

                if (label) {
                    headers.push({
                        column,
                        label,
                    });
                }
            }
        );

        const labels =
            headers.map(
                (item) =>
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
                (label) =>
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
// NORMALIZA ABA
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

    // ==========================================================
    // ÍNDICES
    // ==========================================================

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

    // ==========================================================
    // LINHAS
    // ==========================================================

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

        // Linhas completamente vazias
        // ou decorativas são ignoradas.
        if (
            !insumo &&
            !scNumber
        ) {
            continue;
        }

        // Para ser um item válido,
        // precisamos dos dois.
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
//
// Não usamos quantidade na chave.
//
// Assim, caso o Financeiro corrija a quantidade posteriormente,
// o item é atualizado em vez de virar uma nova linha.
//
// Quando tivermos ID nativo do item no Sienge, ele substituirá
// esta chave.
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
    ].join("|");

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
            (header) =>
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
            (header) =>
                expected.includes(
                    header.label
                )
        )
        .map(
            (header) =>
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
    if (!column) {
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
    if (!column) {
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
        String(raw)
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
    if (!column) {
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

    // ==========================================================
    // SERIAL DO EXCEL
    //
    // Só consideramos valores plausíveis de data.
    // Isso evita interpretar números como 95, 102 ou 119
    // como datas.
    // ==========================================================

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

    // dd/mm/yyyy
    const br =
        text.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
        );

    if (br) {
        return `${br[3]}-${br[2].padStart(
            2,
            "0"
        )}-${br[1].padStart(
            2,
            "0"
        )}`;
    }

    // yyyy-mm-dd
    const iso =
        text.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );

    if (iso) {
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
                (part) =>
                    part.text
            )
            .join("");
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
    value: string
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
    value: string
) {
    return value
        .trim()
        .toUpperCase();
}

function normalizeNullableUsername(
    value: string
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
    date: Date
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
    error: unknown,
    fallback: string
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