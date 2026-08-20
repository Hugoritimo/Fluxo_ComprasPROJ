import ExcelJS from "exceljs";

import {
    NextResponse,
} from "next/server";

import {
    createClient,
} from "@/lib/supabase/server";

export const runtime =
    "nodejs";

type NamedRelation = {
    name: string | null;
};

type CostCenterRelation = {
    name: string | null;
    code: string | null;
};

type RequestProfile = {
    id: string;
    full_name: string | null;
    email: string | null;
};

type PurchaseItem = {
    id: string;

    purchase_request_id: string;

    description: string;

    quantity:
    | number
    | string
    | null;

    unit: string | null;

    estimated_unit_price:
    | number
    | string
    | null;

    estimated_total:
    | number
    | string
    | null;

    approved_unit_price:
    | number
    | string
    | null;

    approved_total:
    | number
    | string
    | null;

    notes: string | null;

    created_at: string;
};

// ============================================================
// GET
// ============================================================

export async function GET() {
    try {
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
        //
        // Exportação geral de pedidos fica restrita a quem
        // administra o fluxo de compras.
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

        const roles = (
            roleRows ?? []
        ).map(
            (row) =>
                row.role
        );

        const canExport =
            roles.includes(
                "buyer"
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
                        "Você não possui permissão para exportar todos os pedidos de compra.",
                },
                {
                    status: 403,
                }
            );
        }

        // ========================================================
        // PEDIDOS
        // ========================================================

        const {
            data: requestRows,
            error: requestsError,
        } =
            await supabase
                .from(
                    "purchase_requests"
                )
                .select(
                    `
          id,
          request_number,
          requester_id,

          company_id,
          department_id,
          project_id,
          cost_center_id,
          supplier_id,

          title,
          justification,
          priority,

          estimated_total,
          approved_total,

          required_date,
          status,

          sienge_request_number,
          sienge_order_number,

          order_date,
          expected_delivery_date,

          internal_notes,

          submitted_at,
          approved_at,
          completed_at,

          created_at,
          updated_at,

          company:companies(name),
          department:departments(name),
          project:projects(name),

          cost_center:cost_centers(
            name,
            code
          ),

          supplier:suppliers(name)
          `
                )
                .is(
                    "deleted_at",
                    null
                )
                .order(
                    "created_at",
                    {
                        ascending:
                            false,
                    }
                );

        if (requestsError) {
            console.error(
                "Erro ao consultar pedidos:",
                requestsError
            );

            return NextResponse.json(
                {
                    error:
                        "Não foi possível consultar os pedidos de compra.",
                },
                {
                    status: 500,
                }
            );
        }

        const requests =
            requestRows ?? [];

        const requestIds =
            requests.map(
                (request) =>
                    request.id
            );

        const requesterIds = [
            ...new Set(
                requests
                    .map(
                        (request) =>
                            request.requester_id
                    )
                    .filter(
                        Boolean
                    )
            ),
        ];

        // ========================================================
        // SOLICITANTES
        // ========================================================

        const profiles:
            RequestProfile[] = [];

        for (
            const group
            of chunkArray(
                requesterIds,
                200
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
                        "profiles"
                    )
                    .select(
                        `
            id,
            full_name,
            email
            `
                    )
                    .in(
                        "id",
                        group
                    );

            if (error) {
                console.error(
                    "Erro ao consultar solicitantes:",
                    error
                );

                return NextResponse.json(
                    {
                        error:
                            "Não foi possível consultar os solicitantes.",
                    },
                    {
                        status: 500,
                    }
                );
            }

            profiles.push(
                ...(
                    data ?? []
                )
            );
        }

        const profileMap =
            new Map(
                profiles.map(
                    (profile) => [
                        profile.id,
                        profile,
                    ]
                )
            );

        // ========================================================
        // ITENS
        // ========================================================

        const items:
            PurchaseItem[] = [];

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
                        "purchase_request_items"
                    )
                    .select(
                        `
            id,
            purchase_request_id,

            description,
            quantity,
            unit,

            estimated_unit_price,
            estimated_total,

            approved_unit_price,
            approved_total,

            notes,
            created_at
            `
                    )
                    .in(
                        "purchase_request_id",
                        group
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
                    "Erro ao consultar itens:",
                    error
                );

                return NextResponse.json(
                    {
                        error:
                            "Não foi possível consultar os itens dos pedidos.",
                    },
                    {
                        status: 500,
                    }
                );
            }

            items.push(
                ...(
                    (data ??
                        []) as PurchaseItem[]
                )
            );
        }

        // ========================================================
        // CRIA WORKBOOK
        // ========================================================

        const workbook =
            new ExcelJS.Workbook();

        workbook.creator =
            "Projeta Compras";

        workbook.company =
            "Projeta Consultoria e Serviços";

        workbook.subject =
            "Relatório de Pedidos de Compra";

        workbook.title =
            "Pedidos de Compra";

        workbook.created =
            new Date();

        // ========================================================
        // RESUMO
        // ========================================================

        const summarySheet =
            workbook.addWorksheet(
                "Resumo"
            );

        configureSummarySheet(
            summarySheet
        );

        const totalEstimated =
            requests.reduce(
                (
                    total,
                    request
                ) =>
                    total +
                    toNumber(
                        request.estimated_total
                    ),
                0
            );

        const totalApproved =
            requests.reduce(
                (
                    total,
                    request
                ) =>
                    total +
                    toNumber(
                        request.approved_total
                    ),
                0
            );

        summarySheet.getCell(
            "A1"
        ).value =
            "RELATÓRIO DE PEDIDOS DE COMPRA";

        summarySheet.getCell(
            "A2"
        ).value =
            "Projeta Consultoria e Serviços";

        summarySheet.getCell(
            "A4"
        ).value =
            "Total de pedidos";

        summarySheet.getCell(
            "B4"
        ).value =
            requests.length;

        summarySheet.getCell(
            "A5"
        ).value =
            "Total de itens";

        summarySheet.getCell(
            "B5"
        ).value =
            items.length;

        summarySheet.getCell(
            "A6"
        ).value =
            "Valor estimado";

        summarySheet.getCell(
            "B6"
        ).value =
            totalEstimated;

        summarySheet.getCell(
            "A7"
        ).value =
            "Valor aprovado";

        summarySheet.getCell(
            "B7"
        ).value =
            totalApproved;

        summarySheet.getCell(
            "A9"
        ).value =
            "Status";

        summarySheet.getCell(
            "B9"
        ).value =
            "Quantidade";

        const statusCounts =
            new Map<
                string,
                number
            >();

        for (
            const request
            of requests
        ) {
            const status =
                String(
                    request.status
                );

            statusCounts.set(
                status,
                (
                    statusCounts.get(
                        status
                    ) ?? 0
                ) + 1
            );
        }

        let summaryRow =
            10;

        for (
            const [
                status,
                count,
            ]
            of statusCounts
        ) {
            summarySheet.getCell(
                `A${summaryRow}`
            ).value =
                getStatusLabel(
                    status
                );

            summarySheet.getCell(
                `B${summaryRow}`
            ).value =
                count;

            summaryRow++;
        }

        // ========================================================
        // ABA PEDIDOS
        // ========================================================

        const ordersSheet =
            workbook.addWorksheet(
                "Pedidos"
            );

        const ordersHeaders =
            [
                "Nº Pedido",
                "Solicitante",
                "E-mail",
                "Empresa",
                "Departamento",
                "Projeto",
                "Centro de Custo",
                "Título",
                "Prioridade",
                "Status",
                "Valor Estimado",
                "Valor Aprovado",
                "Data Necessária",
                "Solicitação Sienge",
                "Pedido Sienge",
                "Fornecedor",
                "Data do Pedido",
                "Previsão de Entrega",
                "Justificativa",
                "Observações Internas",
                "Criado em",
                "Enviado em",
                "Aprovado em",
                "Concluído em",
            ];

        prepareDataSheet(
            ordersSheet,
            "PEDIDOS DE COMPRA",
            ordersHeaders
        );

        for (
            const request
            of requests
        ) {
            const profile =
                profileMap.get(
                    request.requester_id
                );

            const company =
                firstRelation<
                    NamedRelation
                >(
                    request.company
                );

            const department =
                firstRelation<
                    NamedRelation
                >(
                    request.department
                );

            const project =
                firstRelation<
                    NamedRelation
                >(
                    request.project
                );

            const costCenter =
                firstRelation<
                    CostCenterRelation
                >(
                    request.cost_center
                );

            const supplier =
                firstRelation<
                    NamedRelation
                >(
                    request.supplier
                );

            const row =
                ordersSheet.addRow(
                    [
                        request.request_number,

                        profile?.full_name ??
                        "-",

                        profile?.email ??
                        "-",

                        company?.name ??
                        "-",

                        department?.name ??
                        "-",

                        project?.name ??
                        "-",

                        formatCostCenter(
                            costCenter
                        ),

                        request.title ??
                        "-",

                        getPriorityLabel(
                            request.priority
                        ),

                        getStatusLabel(
                            request.status
                        ),

                        toNumber(
                            request.estimated_total
                        ),

                        nullableNumber(
                            request.approved_total
                        ),

                        excelDate(
                            request.required_date
                        ),

                        request.sienge_request_number ??
                        "-",

                        request.sienge_order_number ??
                        "-",

                        supplier?.name ??
                        "-",

                        excelDate(
                            request.order_date
                        ),

                        excelDate(
                            request.expected_delivery_date
                        ),

                        request.justification ??
                        "-",

                        request.internal_notes ??
                        "-",

                        excelDateTime(
                            request.created_at
                        ),

                        excelDateTime(
                            request.submitted_at
                        ),

                        excelDateTime(
                            request.approved_at
                        ),

                        excelDateTime(
                            request.completed_at
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

        // ========================================================
        // ABA ITENS
        // ========================================================

        const itemsSheet =
            workbook.addWorksheet(
                "Itens"
            );

        const itemsHeaders =
            [
                "Nº Pedido",
                "Solicitante",
                "Empresa",
                "Departamento",
                "Projeto",
                "Centro de Custo",
                "Fornecedor",
                "Status",
                "Descrição",
                "Quantidade",
                "Unidade",
                "Valor Unitário Estimado",
                "Total Estimado",
                "Valor Unitário Aprovado",
                "Total Aprovado",
                "Observações",
            ];

        prepareDataSheet(
            itemsSheet,
            "ITENS DOS PEDIDOS DE COMPRA",
            itemsHeaders
        );

        const requestMap =
            new Map(
                requests.map(
                    (request) => [
                        request.id,
                        request,
                    ]
                )
            );

        for (
            const item
            of items
        ) {
            const request =
                requestMap.get(
                    item.purchase_request_id
                );

            if (!request) {
                continue;
            }

            const profile =
                profileMap.get(
                    request.requester_id
                );

            const company =
                firstRelation<
                    NamedRelation
                >(
                    request.company
                );

            const department =
                firstRelation<
                    NamedRelation
                >(
                    request.department
                );

            const project =
                firstRelation<
                    NamedRelation
                >(
                    request.project
                );

            const costCenter =
                firstRelation<
                    CostCenterRelation
                >(
                    request.cost_center
                );

            const supplier =
                firstRelation<
                    NamedRelation
                >(
                    request.supplier
                );

            const row =
                itemsSheet.addRow(
                    [
                        request.request_number,

                        profile?.full_name ??
                        "-",

                        company?.name ??
                        "-",

                        department?.name ??
                        "-",

                        project?.name ??
                        "-",

                        formatCostCenter(
                            costCenter
                        ),

                        supplier?.name ??
                        "-",

                        getStatusLabel(
                            request.status
                        ),

                        item.description,

                        toNumber(
                            item.quantity
                        ),

                        item.unit ??
                        "-",

                        nullableNumber(
                            item.estimated_unit_price
                        ),

                        nullableNumber(
                            item.estimated_total
                        ),

                        nullableNumber(
                            item.approved_unit_price
                        ),

                        nullableNumber(
                            item.approved_total
                        ),

                        item.notes ??
                        "-",
                    ]
                );

            row.alignment = {
                vertical:
                    "top",
                wrapText:
                    true,
            };
        }

        // ========================================================
        // FORMATAÇÃO
        // ========================================================

        styleOrdersSheet(
            ordersSheet
        );

        styleItemsSheet(
            itemsSheet
        );

        // ========================================================
        // BUFFER
        // ========================================================

        const buffer =
            await workbook.xlsx.writeBuffer();

        const filename =
            `pedidos-de-compra-${formatFileDate(
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
                        `attachment; filename="${filename}"`,

                    "Cache-Control":
                        "no-store",
                },
            }
        );
    } catch (error) {
        console.error(
            "Erro geral na exportação dos pedidos:",
            error
        );

        return NextResponse.json(
            {
                error:
                    "Não foi possível gerar o arquivo Excel.",
            },
            {
                status: 500,
            }
        );
    }
}

// ============================================================
// FORMATAÇÃO BASE
// ============================================================

function prepareDataSheet(
    worksheet: ExcelJS.Worksheet,
    title: string,
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
        30;

    worksheet.mergeCells(
        2,
        1,
        2,
        headers.length
    );

    worksheet.getCell(
        2,
        1
    ).value =
        `Gerado em ${new Intl.DateTimeFormat(
            "pt-BR",
            {
                dateStyle:
                    "short",
                timeStyle:
                    "short",
            }
        ).format(new Date())}`;

    worksheet.getCell(
        2,
        1
    ).font = {
        italic: true,
        size: 10,
        color: {
            argb:
                "FF64748B",
        },
    };

    const headerRow =
        worksheet.getRow(
            4
        );

    headerRow.values =
        headers;

    headerRow.height =
        28;

    headerRow.eachCell(
        (cell) => {
            cell.font = {
                bold: true,
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
                        "thin",

                    color: {
                        argb:
                            "FFAF1B1B",
                    },
                },
            };
        }
    );

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

function configureSummarySheet(
    worksheet: ExcelJS.Worksheet
) {
    worksheet.mergeCells(
        "A1:D1"
    );

    worksheet.mergeCells(
        "A2:D2"
    );

    worksheet.getCell(
        "A1"
    ).font = {
        bold: true,
        size: 18,
        color: {
            argb:
                "FFFFFFFF",
        },
    };

    worksheet.getCell(
        "A1"
    ).fill = {
        type:
            "pattern",

        pattern:
            "solid",

        fgColor: {
            argb:
                "FFAF1B1B",
        },
    };

    worksheet.getCell(
        "A2"
    ).font = {
        size: 10,
        color: {
            argb:
                "FF64748B",
        },
    };

    worksheet.getColumn(
        "A"
    ).width =
        32;

    worksheet.getColumn(
        "B"
    ).width =
        20;

    worksheet.getColumn(
        "C"
    ).width =
        18;

    worksheet.getColumn(
        "D"
    ).width =
        18;

    for (
        const rowNumber
        of [
            4,
            5,
            6,
            7,
        ]
    ) {
        const labelCell =
            worksheet.getCell(
                `A${rowNumber}`
            );

        labelCell.font = {
            bold: true,
            color: {
                argb:
                    "FF475569",
            },
        };

        labelCell.fill = {
            type:
                "pattern",

            pattern:
                "solid",

            fgColor: {
                argb:
                    "FFF8FAFC",
            },
        };

        const valueCell =
            worksheet.getCell(
                `B${rowNumber}`
            );

        valueCell.font = {
            bold: true,
            size: 12,
            color: {
                argb:
                    "FF171717",
            },
        };
    }

    worksheet.getCell(
        "B6"
    ).numFmt =
        currencyFormat;

    worksheet.getCell(
        "B7"
    ).numFmt =
        currencyFormat;

    for (
        const cell
        of [
            worksheet.getCell(
                "A9"
            ),
            worksheet.getCell(
                "B9"
            ),
        ]
    ) {
        cell.font = {
            bold: true,
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
    }
}

function styleOrdersSheet(
    worksheet: ExcelJS.Worksheet
) {
    const widths = [
        16,
        26,
        30,
        24,
        22,
        24,
        26,
        36,
        14,
        22,
        18,
        18,
        16,
        20,
        18,
        25,
        16,
        18,
        45,
        45,
        20,
        20,
        20,
        20,
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

    const lastRow =
        Math.max(
            worksheet.rowCount,
            5
        );

    worksheet.getColumn(
        11
    ).numFmt =
        currencyFormat;

    worksheet.getColumn(
        12
    ).numFmt =
        currencyFormat;

    for (
        const column
        of [
            13,
            17,
            18,
        ]
    ) {
        worksheet.getColumn(
            column
        ).numFmt =
            "dd/mm/yyyy";
    }

    for (
        const column
        of [
            21,
            22,
            23,
            24,
        ]
    ) {
        worksheet.getColumn(
            column
        ).numFmt =
            "dd/mm/yyyy hh:mm";
    }

    styleDataRows(
        worksheet,
        5,
        lastRow
    );
}

function styleItemsSheet(
    worksheet: ExcelJS.Worksheet
) {
    const widths = [
        16,
        26,
        24,
        22,
        24,
        26,
        25,
        22,
        45,
        14,
        14,
        20,
        20,
        20,
        20,
        40,
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

    for (
        const column
        of [
            12,
            13,
            14,
            15,
        ]
    ) {
        worksheet.getColumn(
            column
        ).numFmt =
            currencyFormat;
    }

    worksheet.getColumn(
        10
    ).numFmt =
        "#,##0.000";

    styleDataRows(
        worksheet,
        5,
        Math.max(
            worksheet.rowCount,
            5
        )
    );
}

function styleDataRows(
    worksheet: ExcelJS.Worksheet,
    startRow: number,
    endRow: number
) {
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

                cell.font = {
                    size: 10,
                    color: {
                        argb:
                            "FF334155",
                    },
                };
            }
        );

        if (
            rowNumber % 2 ===
            0
        ) {
            row.eachCell(
                {
                    includeEmpty:
                        true,
                },

                (cell) => {
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
            );
        }
    }
}

// ============================================================
// HELPERS
// ============================================================

const currencyFormat =
    '"R$" #,##0.00;[Red]-"R$" #,##0.00';

function toNumber(
    value:
        | number
        | string
        | null
        | undefined
) {
    const parsed =
        Number(value ?? 0);

    return Number.isFinite(
        parsed
    )
        ? parsed
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
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return null;
    }

    const parsed =
        Number(value);

    return Number.isFinite(
        parsed
    )
        ? parsed
        : null;
}

function excelDate(
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
            `${value}T12:00:00`
        );

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
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
        new Date(value);

    return Number.isNaN(
        date.getTime()
    )
        ? null
        : date;
}

function formatCostCenter(
    costCenter:
        | CostCenterRelation
        | null
) {
    if (!costCenter) {
        return "-";
    }

    if (
        costCenter.code &&
        costCenter.name
    ) {
        return `${costCenter.code} - ${costCenter.name}`;
    }

    return (
        costCenter.name ??
        costCenter.code ??
        "-"
    );
}

function firstRelation<T>(
    value:
        | T
        | T[]
        | null
        | undefined
): T | null {
    if (!value) {
        return null;
    }

    if (
        Array.isArray(value)
    ) {
        return (
            value[0] ??
            null
        );
    }

    return value;
}

function getPriorityLabel(
    priority:
        | string
        | null
) {
    switch (
    priority
    ) {
        case "low":
            return "Baixa";

        case "normal":
            return "Normal";

        case "medium":
            return "Média";

        case "high":
            return "Alta";

        case "urgent":
            return "Urgente";

        default:
            return (
                priority ??
                "-"
            );
    }
}

function getStatusLabel(
    status:
        | string
        | null
) {
    switch (
    status
    ) {
        case "draft":
            return "Rascunho";

        case "submitted":
            return "Solicitado";

        case "under_review":
            return "Em análise";

        case "awaiting_information":
            return "Aguardando informações";

        case "awaiting_approval":
            return "Aguardando aprovação";

        case "approved":
            return "Aprovado";

        case "ordered":
            return "Pedido realizado";

        case "partially_received":
            return "Recebido parcialmente";

        case "received":
            return "Recebido";

        case "completed":
            return "Concluído";

        case "rejected":
            return "Rejeitado";

        case "cancelled":
            return "Cancelado";

        default:
            return (
                status ??
                "-"
            );
    }
}

function chunkArray<T>(
    values: T[],
    size: number
) {
    const chunks:
        T[][] = [];

    for (
        let index = 0;
        index <
        values.length;

        index += size
    ) {
        chunks.push(
            values.slice(
                index,
                index + size
            )
        );
    }

    return chunks;
}

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