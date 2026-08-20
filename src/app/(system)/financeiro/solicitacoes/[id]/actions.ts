"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type FinanceWorkflowState = {
    error: string | null;
    success: string | null;
};

type WorkflowAction =
    | "approve_release"
    | "request_adjustment"
    | "reject";

function parseMoney(
    value: FormDataEntryValue | null
) {
    let input = String(
        value ?? ""
    ).trim();

    if (!input) {
        return null;
    }

    input = input
        .replace(/\s/g, "")
        .replace("R$", "");

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

    const parsed =
        Number(input);

    return Number.isFinite(
        parsed
    )
        ? parsed
        : null;
}

function optionalString(
    value: FormDataEntryValue | null
) {
    const parsed =
        String(
            value ?? ""
        ).trim();

    return parsed || null;
}

function refreshRequestPaths(
    requestId: string
) {
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
}

export async function updateFinanceWorkflow(
    _previousState: FinanceWorkflowState,
    formData: FormData
): Promise<FinanceWorkflowState> {
    // ==========================================================
    // IDENTIFICA A SOLICITAÇÃO E A AÇÃO
    // ==========================================================

    const requestId =
        String(
            formData.get(
                "request_id"
            ) ?? ""
        ).trim();

    const workflowAction =
        String(
            formData.get(
                "workflow_action"
            ) ?? ""
        ).trim() as WorkflowAction;

    if (!requestId) {
        return {
            error:
                "Não foi possível identificar a solicitação.",
            success: null,
        };
    }

    if (
        ![
            "approve_release",
            "request_adjustment",
            "reject",
        ].includes(
            workflowAction
        )
    ) {
        return {
            error:
                "Não foi possível identificar a ação solicitada.",
            success: null,
        };
    }

    // ==========================================================
    // CAMPOS
    // ==========================================================

    const approvedAmount =
        parseMoney(
            formData.get(
                "approved_amount"
            )
        );

    const assignedCardId =
        optionalString(
            formData.get(
                "assigned_card_id"
            )
        );

    const expectedReturnDate =
        optionalString(
            formData.get(
                "expected_return_date"
            )
        );

    const financeNotes =
        optionalString(
            formData.get(
                "finance_notes"
            )
        );

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
            error:
                "Sua sessão expirou. Entre novamente no sistema.",
            success: null,
        };
    }

    // ==========================================================
    // APROVAR + LIBERAR CARTÃO
    //
    // Essa única ação substitui:
    //
    // Em análise
    // Aguardando aprovação
    // Aprovado
    // Cartão reservado
    // Cartão liberado
    //
    // Para o usuário tudo acontece em um clique.
    // ==========================================================

    if (
        workflowAction ===
        "approve_release"
    ) {
        if (
            approvedAmount ===
            null ||
            approvedAmount <= 0
        ) {
            return {
                error:
                    "Informe um valor aprovado maior que zero.",
                success: null,
            };
        }

        if (!assignedCardId) {
            return {
                error:
                    "Selecione o cartão que será liberado.",
                success: null,
            };
        }

        if (
            !expectedReturnDate
        ) {
            return {
                error:
                    "Informe a previsão de devolução do cartão.",
                success: null,
            };
        }

        const { error } =
            await supabase.rpc(
                "finance_approve_and_release_card_v2",
                {
                    p_request_id:
                        requestId,

                    p_approved_amount:
                        approvedAmount,

                    p_card_id:
                        assignedCardId,

                    p_expected_return_date:
                        expectedReturnDate,

                    p_finance_notes:
                        financeNotes,
                }
            );

        if (error) {
            console.error(
                "Erro ao aprovar e liberar cartão:",
                error
            );

            return {
                error:
                    error.message ||
                    "Não foi possível aprovar e liberar o cartão.",
                success: null,
            };
        }

        refreshRequestPaths(
            requestId
        );

        return {
            error: null,
            success:
                "Solicitação aprovada e cartão liberado com sucesso.",
        };
    }

    // ==========================================================
    // SOLICITAR AJUSTE
    // ==========================================================

    if (
        workflowAction ===
        "request_adjustment"
    ) {
        if (!financeNotes) {
            return {
                error:
                    "Informe nas observações o que precisa ser ajustado pelo solicitante.",
                success: null,
            };
        }

        const { error } =
            await supabase.rpc(
                "finance_request_card_adjustment_v2",
                {
                    p_request_id:
                        requestId,

                    p_finance_notes:
                        financeNotes,
                }
            );

        if (error) {
            console.error(
                "Erro ao solicitar ajuste:",
                error
            );

            return {
                error:
                    error.message ||
                    "Não foi possível solicitar o ajuste.",
                success: null,
            };
        }

        refreshRequestPaths(
            requestId
        );

        return {
            error: null,
            success:
                "Ajuste solicitado ao colaborador.",
        };
    }

    // ==========================================================
    // REPROVAR
    // ==========================================================

    if (
        workflowAction ===
        "reject"
    ) {
        if (!financeNotes) {
            return {
                error:
                    "Informe nas observações o motivo da reprovação.",
                success: null,
            };
        }

        const { error } =
            await supabase.rpc(
                "finance_reject_card_request_v2",
                {
                    p_request_id:
                        requestId,

                    p_finance_notes:
                        financeNotes,
                }
            );

        if (error) {
            console.error(
                "Erro ao reprovar solicitação:",
                error
            );

            return {
                error:
                    error.message ||
                    "Não foi possível reprovar a solicitação.",
                success: null,
            };
        }

        refreshRequestPaths(
            requestId
        );

        return {
            error: null,
            success:
                "Solicitação reprovada.",
        };
    }

    return {
        error:
            "Ação não reconhecida.",
        success: null,
    };
}