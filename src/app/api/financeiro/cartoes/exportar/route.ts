import ExcelJS from "exceljs";

import {
    NextResponse,
} from "next/server";

import {
    createClient,
} from "@/lib/supabase/server";

export const runtime =
    "nodejs";

// ============================================================
// TIPOS
// ============================================================

type RequestExtra = {
    id: string;

    request_date:
    | string
    | null;

    suppliers_text:
    | string
    | null;

    purchase_reason:
    | string
    | null;

    purchase_reason_other:
    | string
    | null;

    purpose:
    | string
    | null;

    justification:
    | string
    | null;

    expected_return_date:
    | string
    | null;

    submission_source:
    | string
    | null;

    approved_at:
    | string
    | null;

    completed_at:
    | string
    | null;
};

type AttachmentRow = {
    id: string;

    card_request_id:
    | string
    | null;

    category:
    | string
    | null;

    file_name:
    | string
    | null;

    mime_type:
    | string
    | null;

    file_size:
    | number
    | string
    | null;

    created_at:
    | string
    | null;
};

// ============================================================
// GET
// ============================================================

export async function GET(
    request: Request
) {
    try {
        // ========================================================
        // ORIGEM DO SISTEMA
        //
        // Local:
        // http://localhost:3000
        //
        // Produção:
        // https://seu-dominio.vercel.app
        // ========================================================

        const origin =
            new URL(
                request.url
            ).origin;

        const supabase =
            await createClient();

        // ========================================================
        // AUTENTICAÇÃO
        // ========================================================

        const {
            data: claimsData,
        } =
            await supabase.auth.getClaims();

        const userId =
            claimsData?.claims?.sub;

        if (!userId) {
            return NextResponse.json(
                {
                    error:
                        "Usuário não autenticado.",
                },
                {
                    status: 401,
                }
            );
        }

        // ========================================================
        // PERMISSÕES
        // ========================================================

        const {
            data: roleRows,
            error: roleError,
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

        if (roleError) {
            console.error(
                "Erro ao consultar permissões:",
                roleError
            );

            return NextResponse.json(
                {
                    error:
                        "Não foi possível verificar suas permissões.",
                },
                {
                    status: 500,
                }
            );
        }

        const roles =
            (
                roleRows ?? []
            ).map(
                (row) =>
                    row.role
            );

        const canExport =
            roles.includes(
                "finance"
            ) ||
            roles.includes(
                "admin"
            ) ||
            roles.includes(
                "superadmin"
            );

        if (!canExport) {
            return NextResponse.json(
                {
                    error:
                        "Você não possui permissão para exportar este relatório.",
                },
                {
                    status: 403,
                }
            );
        }

        // ========================================================
        // RESUMO DAS SOLICITAÇÕES
        // ========================================================

        const {
            data: summaryRows,
            error: summaryError,
        } =
            await supabase
                .from(
                    "v_card_accountability_summary"
                )
                .select("*")
                .order(
                    "requested_at",
                    {
                        ascending:
                            false,
                    }
                );

        if (summaryError) {
            console.error(
                "Erro ao consultar solicitações de cartão:",
                summaryError
            );

            return NextResponse.json(
                {
                    error:
                        "Não foi possível consultar as solicitações de cartão.",
                },
                {
                    status: 500,
                }
            );
        }

        const summaries =
            summaryRows ?? [];

        // ========================================================
        // MAPA DAS SOLICITAÇÕES
        // ========================================================

        const summaryMap =
            new Map(
                summaries.map(
                    (summary) => [
                        summary.card_request_id,
                        summary,
                    ]
                )
            );

        // ========================================================
        // IDs DAS SOLICITAÇÕES
        // ========================================================

        const requestIds = [
            ...new Set(
                summaries
                    .map(
                        (row) =>
                            row.card_request_id
                    )
                    .filter(
                        (
                            value
                        ): value is string =>
                            Boolean(value)
                    )
            ),
        ];

        // ========================================================
        // COMPRAS POR FORNECEDOR
        // ========================================================

        const {
            data: purchaseRows,
            error: purchasesError,
        } =
            await supabase
                .from(
                    "v_card_request_financial_purchases"
                )
                .select("*")
                .order(
                    "request_created_at",
                    {
                        ascending:
                            false,
                    }
                );

        if (purchasesError) {
            console.error(
                "Erro ao consultar compras:",
                purchasesError
            );

            return NextResponse.json(
                {
                    error:
                        "Não foi possível consultar as compras realizadas.",
                },
                {
                    status: 500,
                }
            );
        }

        const purchases =
            (
                purchaseRows ?? []
            ).filter(
                (row) =>
                    Boolean(
                        row.purchase_id
                    )
            );

        // ========================================================
        // DADOS COMPLEMENTARES
        // ========================================================

        const requestExtras:
            RequestExtra[] = [];

        for (
            const group
            of chunkArray(
                requestIds,
                150
            )
        ) {
            if (
                group.length ===
                0
            ) {
                continue;
            }

            const {
                data,
                error,
            } =
                await supabase
                    .from(
                        "card_requests"
                    )
                    .select(
                        `
            id,
            request_date,
            suppliers_text,
            purchase_reason,
            purchase_reason_other,
            purpose,
            justification,
            expected_return_date,
            submission_source,
            approved_at,
            completed_at
            `
                    )
                    .in(
                        "id",
                        group
                    )
                    .is(
                        "deleted_at",
                        null
                    );

            if (error) {
                console.error(
                    "Erro ao consultar dados complementares:",
                    error
                );

                return NextResponse.json(
                    {
                        error:
                            "Não foi possível consultar os dados das solicitações.",
                    },
                    {
                        status: 500,
                    }
                );
            }

            requestExtras.push(
                ...(
                    (
                        data ??
                        []
                    ) as RequestExtra[]
                )
            );
        }

        const requestExtraMap =
            new Map(
                requestExtras.map(
                    (request) => [
                        request.id,
                        request,
                    ]
                )
            );

        // ========================================================
        // DOCUMENTOS / ANEXOS
        // ========================================================

        const attachments:
            AttachmentRow[] = [];

        for (
            const group
            of chunkArray(
                requestIds,
                150
            )
        ) {
            if (
                group.length ===
                0
            ) {
                continue;
            }

            const {
                data,
                error,
            } =
                await supabase
                    .from(
                        "attachments"
                    )
                    .select(
                        `
            id,
            card_request_id,
            category,
            file_name,
            mime_type,
            file_size,
            created_at
            `
                    )
                    .in(
                        "card_request_id",
                        group
                    )
                    .in(
                        "category",
                        [
                            "invoice",
                            "receipt",
                            "payment_receipt",
                            "accountability",
                            "quotation",
                            "sienge_document",
                            "purchase_order",
                            "other",
                        ]
                    )
                    .order(
                        "created_at",
                        {
                            ascending:
                                true,
                        }
                    );

            if (error) {
                console.error(
                    "Erro ao consultar documentos:",
                    error
                );

                return NextResponse.json(
                    {
                        error:
                            "Não foi possível consultar os documentos das prestações de contas.",
                    },
                    {
                        status: 500,
                    }
                );
            }

            attachments.push(
                ...(
                    (
                        data ??
                        []
                    ) as AttachmentRow[]
                )
            );
        }

        // ========================================================
        // CONTAGEM DE DOCUMENTOS POR SOLICITAÇÃO
        // ========================================================

        const attachmentCountMap =
            new Map<
                string,
                number
            >();

        for (
            const attachment
            of attachments
        ) {
            if (
                !attachment.card_request_id
            ) {
                continue;
            }

            attachmentCountMap.set(
                attachment.card_request_id,
                (
                    attachmentCountMap.get(
                        attachment.card_request_id
                    ) ??
                    0
                ) + 1
            );
        }

        // ========================================================
        // WORKBOOK
        // ========================================================

        const workbook =
            new ExcelJS.Workbook();

        workbook.creator =
            "Projeta Compras";

        workbook.company =
            "Projeta Consultoria e Serviços";

        workbook.title =
            "Relatório Financeiro - Cartões";

        workbook.subject =
            "Solicitações e compras realizadas com cartões corporativos";

        workbook.created =
            new Date();

        workbook.modified =
            new Date();

        // ========================================================
        // ABA 1 - SOLICITAÇÕES
        // ========================================================

        const requestsSheet =
            workbook.addWorksheet(
                "Solicitações"
            );

        const requestHeaders = [
            "Nº Solicitação",
            "Solicitante",
            "E-mail",
            "Data da Solicitação",
            "Centro de Custo / Obra",
            "Fornecedor Informado",
            "Motivo",
            "Finalidade",
            "Valor Solicitado",
            "Valor Aprovado",
            "Adições Autorizadas",
            "Total Autorizado",
            "Total Utilizado",
            "Saldo / Diferença",
            "Nº Sienge",
            "Cartão",
            "Últimos 4 Dígitos",
            "Previsão de Devolução",
            "Devolução Realizada",
            "Recebido Por",
            "Status",
            "Origem",
            "Qtd. Documentos",
            "Ver Prestação",
            "Aprovado em",
            "Concluído em",
        ];

        prepareSheet(
            requestsSheet,
            "RELATÓRIO FINANCEIRO - CARTÕES CORPORATIVOS",
            "Solicitações",
            requestHeaders
        );

        for (
            const summary
            of summaries
        ) {
            const requestExtra =
                requestExtraMap.get(
                    summary.card_request_id
                );

            const documentCount =
                attachmentCountMap.get(
                    summary.card_request_id
                ) ??
                0;

            const row =
                requestsSheet.addRow(
                    [
                        summary.request_number ??
                        "-",

                        summary.requester_name ??
                        "-",

                        summary.requester_email ??
                        "-",

                        excelDate(
                            requestExtra?.request_date ??
                            summary.requested_at
                        ),

                        summary.cost_center_or_site ??
                        "-",

                        requestExtra?.suppliers_text ??
                        "-",

                        reasonLabel(
                            requestExtra?.purchase_reason ??
                            null,
                            requestExtra?.purchase_reason_other ??
                            null
                        ),

                        requestExtra?.purpose ??
                        "-",

                        toNumber(
                            summary.requested_amount
                        ),

                        nullableNumber(
                            summary.approved_amount
                        ),

                        toNumber(
                            summary.additions_total
                        ),

                        0,

                        toNumber(
                            summary.used_total
                        ),

                        0,

                        summary.sienge_request_number ??
                        "-",

                        summary.card_name ??
                        "-",

                        summary.card_last_four_digits ??
                        "-",

                        excelDate(
                            requestExtra?.expected_return_date
                        ),

                        excelDateTime(
                            summary.returned_at
                        ),

                        summary.received_by_name ??
                        "-",

                        getCardFlowStatusLabel(
                            summary.status
                        ),

                        sourceLabel(
                            requestExtra?.submission_source ??
                            null
                        ),

                        documentCount,

                        documentCount > 0
                            ? "Abrir no sistema"
                            : "-",

                        excelDateTime(
                            requestExtra?.approved_at
                        ),

                        excelDateTime(
                            requestExtra?.completed_at
                        ),
                    ]
                );

            // ======================================================
            // TOTAL AUTORIZADO
            // ======================================================

            row.getCell(
                12
            ).value = {
                formula:
                    `IF(J${row.number}="",I${row.number},J${row.number})+K${row.number}`,

                result:
                    toNumber(
                        summary.authorized_total
                    ),
            };

            // ======================================================
            // SALDO / DIFERENÇA
            // ======================================================

            const balance =
                toNumber(
                    summary.authorized_total
                ) -
                toNumber(
                    summary.used_total
                );

            row.getCell(
                14
            ).value = {
                formula:
                    `L${row.number}-M${row.number}`,

                result:
                    balance,
            };

            // ======================================================
            // LINK PARA A PRESTAÇÃO NO SISTEMA
            // ======================================================

            if (
                documentCount >
                0
            ) {
                const detailUrl =
                    `${origin}/financeiro/devolucoes/${summary.card_request_id}`;

                const linkCell =
                    row.getCell(
                        24
                    );

                linkCell.value = {
                    text:
                        "Abrir prestação ↗",

                    hyperlink:
                        detailUrl,

                    tooltip:
                        "Abrir a prestação de contas no sistema",
                };

                styleHyperlink(
                    linkCell
                );
            }

            // ======================================================
            // ALERTA DE SALDO NEGATIVO
            // ======================================================

            if (
                balance <
                0
            ) {
                row.getCell(
                    14
                ).font = {
                    bold: true,
                    color: {
                        argb:
                            "FFB91C1C",
                    },
                };

                row.getCell(
                    14
                ).fill = {
                    type:
                        "pattern",
                    pattern:
                        "solid",
                    fgColor: {
                        argb:
                            "FFFEE2E2",
                    },
                };
            }

            row.alignment = {
                vertical:
                    "top",
                wrapText:
                    true,
            };
        }

        styleRequestsSheet(
            requestsSheet
        );

        // ========================================================
        // ABA 2 - COMPRAS POR FORNECEDOR
        // ========================================================

        const purchasesSheet =
            workbook.addWorksheet(
                "Compras por Fornecedor"
            );

        const purchaseHeaders = [
            "Nº Solicitação",
            "Solicitante",
            "E-mail",
            "Data da Solicitação",
            "Centro de Custo / Obra",
            "Nº Sienge",
            "Fornecedor",
            "Valor da Compra",
            "Data da Compra",
            "Observação",
            "Cartão",
            "Últimos 4 Dígitos",
            "Total Autorizado",
            "Status",
            "Data da Devolução",
        ];

        prepareSheet(
            purchasesSheet,
            "COMPRAS REALIZADAS POR FORNECEDOR",
            "Detalhamento da prestação de contas",
            purchaseHeaders
        );

        for (
            const purchase
            of purchases
        ) {
            const row =
                purchasesSheet.addRow(
                    [
                        purchase.request_number ??
                        "-",

                        purchase.requester_name ??
                        "-",

                        purchase.requester_email ??
                        "-",

                        excelDate(
                            purchase.request_created_at
                        ),

                        purchase.cost_center_or_site ??
                        "-",

                        purchase.sienge_request_number ??
                        "-",

                        purchase.supplier_name ??
                        "-",

                        toNumber(
                            purchase.purchase_amount
                        ),

                        excelDate(
                            purchase.purchase_date
                        ),

                        purchase.purchase_notes ??
                        "-",

                        purchase.card_name ??
                        "-",

                        purchase.card_last_four_digits ??
                        "-",

                        toNumber(
                            purchase.authorized_total
                        ),

                        getCardFlowStatusLabel(
                            purchase.status
                        ),

                        excelDateTime(
                            purchase.returned_at
                        ),
                    ]
                );

            row.alignment = {
                vertical:
                    "top",
                wrapText:
                    true,
            };
        }

        stylePurchasesSheet(
            purchasesSheet
        );

        // ========================================================
        // ABA 3 - DOCUMENTOS
        // ========================================================

        const documentsSheet =
            workbook.addWorksheet(
                "Documentos"
            );

        const documentHeaders = [
            "Nº Solicitação",
            "Solicitante",
            "E-mail",
            "Nº Sienge",
            "Centro de Custo / Obra",
            "Tipo de Documento",
            "Nome do Arquivo",
            "Formato",
            "Tamanho",
            "Enviado em",
            "Visualizar",
        ];

        prepareSheet(
            documentsSheet,
            "DOCUMENTOS DAS PRESTAÇÕES DE CONTAS",
            "Notas fiscais, cupons, comprovantes e demais anexos",
            documentHeaders
        );

        for (
            const attachment
            of attachments
        ) {
            if (
                !attachment.card_request_id
            ) {
                continue;
            }

            const summary =
                summaryMap.get(
                    attachment.card_request_id
                );

            if (!summary) {
                continue;
            }

            // ======================================================
            // LINK PERMANENTE DO SISTEMA
            //
            // Não colocamos a signed URL do Supabase no Excel.
            //
            // O Excel chama nossa API e a API gera uma signed URL
            // nova somente quando o Financeiro clicar.
            // ======================================================

            const documentUrl =
                `${origin}/api/financeiro/documentos/${attachment.id}`;

            const row =
                documentsSheet.addRow(
                    [
                        summary.request_number ??
                        "-",

                        summary.requester_name ??
                        "-",

                        summary.requester_email ??
                        "-",

                        summary.sienge_request_number ??
                        "-",

                        summary.cost_center_or_site ??
                        "-",

                        documentTypeLabel(
                            attachment.category
                        ),

                        attachment.file_name ??
                        "-",

                        fileTypeLabel(
                            attachment.mime_type
                        ),

                        formatFileSize(
                            attachment.file_size
                        ),

                        excelDateTime(
                            attachment.created_at
                        ),

                        "Abrir documento",
                    ]
                );

            // ======================================================
            // NOME DO ARQUIVO TAMBÉM CLICÁVEL
            // ======================================================

            const fileNameCell =
                row.getCell(
                    7
                );

            fileNameCell.value = {
                text:
                    attachment.file_name ??
                    "Documento",

                hyperlink:
                    documentUrl,

                tooltip:
                    `Abrir ${attachment.file_name ?? "documento"}`,
            };

            styleHyperlink(
                fileNameCell
            );

            // ======================================================
            // BOTÃO / LINK VISUALIZAR
            // ======================================================

            const linkCell =
                row.getCell(
                    11
                );

            linkCell.value = {
                text:
                    "Abrir documento ↗",

                hyperlink:
                    documentUrl,

                tooltip:
                    `Abrir ${attachment.file_name ?? "documento"}`,
            };

            styleHyperlink(
                linkCell
            );

            row.alignment = {
                vertical:
                    "top",
                wrapText:
                    true,
            };
        }

        styleDocumentsSheet(
            documentsSheet
        );

        // ========================================================
        // GERA ARQUIVO
        // ========================================================

        const buffer =
            await workbook.xlsx.writeBuffer();

        const fileName =
            `relatorio-cartoes-${formatFileDate(
                new Date()
            )}.xlsx`;

        return new Response(
            new Uint8Array(
                buffer
            ),
            {
                status: 200,

                headers: {
                    "Content-Type":
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

                    "Content-Disposition":
                        `attachment; filename="${fileName}"`,

                    "Cache-Control":
                        "no-store",
                },
            }
        );
    } catch (error) {
        console.error(
            "Erro geral ao gerar relatório de cartões:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Não foi possível gerar o relatório Excel.",
            },
            {
                status: 500,
            }
        );
    }
}

// ============================================================
// PREPARAÇÃO DAS ABAS
// ============================================================

function prepareSheet(
    worksheet:
        ExcelJS.Worksheet,

    title: string,

    subtitle: string,

    headers: string[]
) {
    worksheet.mergeCells(
        1,
        1,
        1,
        headers.length
    );

    const titleCell =
        worksheet.getCell(
            1,
            1
        );

    titleCell.value =
        title;

    titleCell.font = {
        bold: true,
        size: 16,
        color: {
            argb:
                "FFFFFFFF",
        },
    };

    titleCell.fill = {
        type:
            "pattern",
        pattern:
            "solid",
        fgColor: {
            argb:
                "FFAF1B1B",
        },
    };

    titleCell.alignment = {
        vertical:
            "middle",
        horizontal:
            "left",
    };

    worksheet.getRow(
        1
    ).height =
        32;

    // ==========================================================
    // SUBTÍTULO
    // ==========================================================

    worksheet.mergeCells(
        2,
        1,
        2,
        headers.length
    );

    const subtitleCell =
        worksheet.getCell(
            2,
            1
        );

    subtitleCell.value =
        `${subtitle} · Gerado em ${new Intl.DateTimeFormat(
            "pt-BR",
            {
                dateStyle:
                    "short",
                timeStyle:
                    "short",
            }
        ).format(new Date())}`;

    subtitleCell.font = {
        italic: true,
        size: 10,
        color: {
            argb:
                "FF64748B",
        },
    };

    subtitleCell.alignment = {
        vertical:
            "middle",
    };

    worksheet.getRow(
        2
    ).height =
        22;

    // ==========================================================
    // CABEÇALHO
    // ==========================================================

    const headerRow =
        worksheet.getRow(
            4
        );

    headerRow.values =
        headers;

    headerRow.height =
        32;

    headerRow.eachCell(
        (cell) => {
            cell.font = {
                bold: true,
                size: 10,
                color: {
                    argb:
                        "FFFFFFFF",
                },
            };

            cell.fill = {
                type:
                    "pattern",
                pattern:
                    "solid",
                fgColor: {
                    argb:
                        "FF171717",
                },
            };

            cell.alignment = {
                vertical:
                    "middle",
                horizontal:
                    "center",
                wrapText:
                    true,
            };

            cell.border = {
                bottom: {
                    style:
                        "medium",
                    color: {
                        argb:
                            "FFAF1B1B",
                    },
                },
            };
        }
    );

    // ==========================================================
    // CONGELAMENTO
    // ==========================================================

    worksheet.views = [
        {
            state:
                "frozen",

            ySplit:
                4,

            xSplit:
                1,
        },
    ];

    // ==========================================================
    // FILTROS
    // ==========================================================

    worksheet.autoFilter = {
        from: {
            row: 4,
            column: 1,
        },

        to: {
            row: 4,
            column:
                headers.length,
        },
    };
}

// ============================================================
// ABA SOLICITAÇÕES
// ============================================================

function styleRequestsSheet(
    worksheet:
        ExcelJS.Worksheet
) {
    const widths = [
        18, // solicitação
        27, // solicitante
        30, // email
        17, // data
        27, // centro de custo
        27, // fornecedor
        28, // motivo
        45, // finalidade
        19, // solicitado
        19, // aprovado
        19, // adições
        19, // autorizado
        19, // utilizado
        19, // saldo
        19, // sienge
        24, // cartão
        15, // últimos 4
        20, // previsão
        21, // devolução
        25, // recebido
        24, // status
        18, // origem
        18, // documentos
        22, // link
        21, // aprovado em
        21, // concluído
    ];

    widths.forEach(
        (
            width,
            index
        ) => {
            worksheet.getColumn(
                index + 1
            ).width =
                width;
        }
    );

    // ==========================================================
    // VALORES
    // ==========================================================

    for (
        const columnIndex
        of [
            9,
            10,
            11,
            12,
            13,
            14,
        ]
    ) {
        worksheet.getColumn(
            columnIndex
        ).numFmt =
            currencyFormat;
    }

    // ==========================================================
    // DATAS
    // ==========================================================

    worksheet.getColumn(
        4
    ).numFmt =
        "dd/mm/yyyy";

    worksheet.getColumn(
        18
    ).numFmt =
        "dd/mm/yyyy";

    worksheet.getColumn(
        19
    ).numFmt =
        "dd/mm/yyyy hh:mm";

    worksheet.getColumn(
        25
    ).numFmt =
        "dd/mm/yyyy hh:mm";

    worksheet.getColumn(
        26
    ).numFmt =
        "dd/mm/yyyy hh:mm";

    // ==========================================================
    // ALINHAMENTOS
    // ==========================================================

    worksheet.getColumn(
        23
    ).alignment = {
        horizontal:
            "center",
    };

    worksheet.getColumn(
        24
    ).alignment = {
        horizontal:
            "center",
    };

    styleDataRows(
        worksheet,
        5,
        worksheet.rowCount
    );
}

// ============================================================
// ABA COMPRAS
// ============================================================

function stylePurchasesSheet(
    worksheet:
        ExcelJS.Worksheet
) {
    const widths = [
        18,
        27,
        30,
        18,
        27,
        18,
        30,
        19,
        17,
        40,
        24,
        15,
        19,
        24,
        21,
    ];

    widths.forEach(
        (
            width,
            index
        ) => {
            worksheet.getColumn(
                index + 1
            ).width =
                width;
        }
    );

    worksheet.getColumn(
        8
    ).numFmt =
        currencyFormat;

    worksheet.getColumn(
        13
    ).numFmt =
        currencyFormat;

    worksheet.getColumn(
        4
    ).numFmt =
        "dd/mm/yyyy";

    worksheet.getColumn(
        9
    ).numFmt =
        "dd/mm/yyyy";

    worksheet.getColumn(
        15
    ).numFmt =
        "dd/mm/yyyy hh:mm";

    styleDataRows(
        worksheet,
        5,
        worksheet.rowCount
    );
}

// ============================================================
// ABA DOCUMENTOS
// ============================================================

function styleDocumentsSheet(
    worksheet:
        ExcelJS.Worksheet
) {
    const widths = [
        18, // solicitação
        28, // solicitante
        32, // email
        18, // sienge
        28, // centro custo
        27, // tipo
        42, // arquivo
        18, // formato
        15, // tamanho
        22, // enviado
        23, // visualizar
    ];

    widths.forEach(
        (
            width,
            index
        ) => {
            worksheet.getColumn(
                index + 1
            ).width =
                width;
        }
    );

    worksheet.getColumn(
        10
    ).numFmt =
        "dd/mm/yyyy hh:mm";

    worksheet.getColumn(
        11
    ).alignment = {
        horizontal:
            "center",
        vertical:
            "middle",
    };

    styleDataRows(
        worksheet,
        5,
        worksheet.rowCount
    );
}

// ============================================================
// LINK
// ============================================================

function styleHyperlink(
    cell:
        ExcelJS.Cell
) {
    cell.font = {
        bold: true,
        underline: true,
        color: {
            argb:
                "FFAF1B1B",
        },
    };
}

// ============================================================
// LINHAS
// ============================================================

function styleDataRows(
    worksheet:
        ExcelJS.Worksheet,

    startRow: number,

    endRow: number
) {
    if (
        endRow <
        startRow
    ) {
        return;
    }

    for (
        let rowNumber =
            startRow;

        rowNumber <=
        endRow;

        rowNumber++
    ) {
        const row =
            worksheet.getRow(
                rowNumber
            );

        row.alignment = {
            vertical:
                "top",
            wrapText:
                true,
        };

        row.eachCell(
            {
                includeEmpty:
                    true,
            },

            (cell) => {
                cell.font = {
                    ...cell.font,

                    size:
                        cell.font?.size ??
                        10,

                    color:
                        cell.font?.color ??
                        {
                            argb:
                                "FF334155",
                        },
                };

                cell.border = {
                    bottom: {
                        style:
                            "hair",
                        color: {
                            argb:
                                "FFE2E8F0",
                        },
                    },
                };
            }
        );

        if (
            rowNumber %
            2 ===
            0
        ) {
            row.eachCell(
                {
                    includeEmpty:
                        true,
                },

                (cell) => {
                    if (
                        !cell.fill ||
                        cell.fill.type !==
                        "pattern"
                    ) {
                        cell.fill = {
                            type:
                                "pattern",
                            pattern:
                                "solid",
                            fgColor: {
                                argb:
                                    "FFF8FAFC",
                            },
                        };
                    }
                }
            );
        }
    }
}

// ============================================================
// STATUS SIMPLIFICADO
// ============================================================

function getCardFlowStatusLabel(
    status:
        | string
        | null
) {
    if (!status) {
        return "-";
    }

    if (
        status ===
        "completed"
    ) {
        return "Concluído";
    }

    if (
        [
            "returned",
            "accountability_review",
        ].includes(
            status
        )
    ) {
        return "Prestação de contas";
    }

    if (
        [
            "card_delivered",
            "in_use",
        ].includes(
            status
        )
    ) {
        return "Cartão liberado";
    }

    if (
        status ===
        "awaiting_return"
    ) {
        return "Aguardando devolução / correção";
    }

    if (
        status ===
        "rejected"
    ) {
        return "Reprovado";
    }

    if (
        status ===
        "cancelled"
    ) {
        return "Cancelado";
    }

    if (
        status ===
        "awaiting_information"
    ) {
        return "Solicitado - Ajuste solicitado";
    }

    return "Solicitado";
}

// ============================================================
// MOTIVO
// ============================================================

function reasonLabel(
    reason:
        | string
        | null,

    other:
        | string
        | null
) {
    switch (
    reason
    ) {
        case "emergency":
            return "Emergencial";

        case "supplier_not_registered":
            return "Sem fornecedor cadastrado";

        case "other":
            return other
                ? `Outro: ${other}`
                : "Outro";

        default:
            return "-";
    }
}

// ============================================================
// ORIGEM
// ============================================================

function sourceLabel(
    source:
        | string
        | null
) {
    if (
        source ===
        "external_form"
    ) {
        return "Formulário externo";
    }

    return "Sistema interno";
}

// ============================================================
// TIPO DE DOCUMENTO
// ============================================================

function documentTypeLabel(
    category:
        | string
        | null
) {
    switch (
    category
    ) {
        case "invoice":
            return "Nota Fiscal / Cupom";

        case "receipt":
            return "Recibo";

        case "payment_receipt":
            return "Comprovante da transação";

        case "accountability":
            return "Prestação de contas";

        case "quotation":
            return "Orçamento";

        case "sienge_document":
            return "Documento Sienge";

        case "purchase_order":
            return "Pedido de compra";

        case "other":
            return "Outro documento";

        default:
            return (
                category ??
                "Documento"
            );
    }
}

// ============================================================
// TIPO DE ARQUIVO
// ============================================================

function fileTypeLabel(
    mimeType:
        | string
        | null
) {
    switch (
    mimeType
    ) {
        case "application/pdf":
            return "PDF";

        case "image/jpeg":
            return "Imagem JPEG";

        case "image/jpg":
            return "Imagem JPG";

        case "image/png":
            return "Imagem PNG";

        case "image/webp":
            return "Imagem WEBP";

        default:
            return (
                mimeType ??
                "-"
            );
    }
}

// ============================================================
// TAMANHO DO ARQUIVO
// ============================================================

function formatFileSize(
    bytes:
        | number
        | string
        | null
        | undefined
) {
    const value =
        Number(
            bytes ??
            0
        );

    if (
        !Number.isFinite(
            value
        ) ||
        value <=
        0
    ) {
        return "-";
    }

    if (
        value <
        1024
    ) {
        return `${value} B`;
    }

    if (
        value <
        1024 *
        1024
    ) {
        return `${(
            value /
            1024
        ).toFixed(
            1
        )} KB`;
    }

    return `${(
        value /
        (
            1024 *
            1024
        )
    ).toFixed(
        2
    )} MB`;
}

// ============================================================
// NÚMEROS
// ============================================================

function toNumber(
    value:
        | number
        | string
        | null
        | undefined
) {
    const number =
        Number(
            value ??
            0
        );

    return Number.isFinite(
        number
    )
        ? number
        : 0;
}

function nullableNumber(
    value:
        | number
        | string
        | null
        | undefined
) {
    if (
        value ===
        null ||
        value ===
        undefined ||
        value ===
        ""
    ) {
        return null;
    }

    const number =
        Number(
            value
        );

    return Number.isFinite(
        number
    )
        ? number
        : null;
}

// ============================================================
// DATAS
// ============================================================

function excelDate(
    value:
        | string
        | null
        | undefined
) {
    if (!value) {
        return null;
    }

    const raw =
        String(
            value
        );

    const date =
        raw.includes(
            "T"
        )
            ? new Date(
                raw
            )
            : new Date(
                `${raw}T12:00:00`
            );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date;
}

function excelDateTime(
    value:
        | string
        | null
        | undefined
) {
    if (!value) {
        return null;
    }

    const date =
        new Date(
            value
        );

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {
        return null;
    }

    return date;
}

// ============================================================
// CHUNKS
// ============================================================

function chunkArray<T>(
    values: T[],
    size: number
) {
    const result:
        T[][] = [];

    for (
        let index =
            0;

        index <
        values.length;

        index +=
        size
    ) {
        result.push(
            values.slice(
                index,
                index +
                size
            )
        );
    }

    return result;
}

// ============================================================
// NOME DO ARQUIVO
// ============================================================

function formatFileDate(
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

    const hour =
        String(
            date.getHours()
        ).padStart(
            2,
            "0"
        );

    const minute =
        String(
            date.getMinutes()
        ).padStart(
            2,
            "0"
        );

    return `${year}-${month}-${day}_${hour}-${minute}`;
}

// ============================================================
// FORMATO FINANCEIRO
// ============================================================

const currencyFormat =
    '"R$" #,##0.00;[Red]-"R$" #,##0.00';