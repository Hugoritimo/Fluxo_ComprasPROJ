"use server";

import {
    revalidatePath,
} from "next/cache";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type CardFormState = {
    error: string | null;
};

function parseMoney(
    value:
        | FormDataEntryValue
        | null
) {
    let input = String(
        value ?? ""
    ).trim();

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

    const parsed =
        Number(input);

    return Number.isFinite(parsed)
        ? parsed
        : null;
}

export async function createCard(
    _previousState: CardFormState,
    formData: FormData
): Promise<CardFormState> {
    const name = String(
        formData.get("name") ??
        ""
    ).trim();

    const bankName = String(
        formData.get(
            "bank_name"
        ) ?? ""
    ).trim();

    const lastFourDigits =
        String(
            formData.get(
                "last_four_digits"
            ) ?? ""
        ).trim();

    const creditLimit =
        parseMoney(
            formData.get(
                "credit_limit"
            )
        );

    const notes = String(
        formData.get("notes") ??
        ""
    ).trim();

    if (!name) {
        return {
            error:
                "Informe a identificação do cartão.",
        };
    }

    if (!bankName) {
        return {
            error:
                "Informe o banco do cartão.",
        };
    }

    if (
        !/^\d{4}$/.test(
            lastFourDigits
        )
    ) {
        return {
            error:
                "Informe exatamente os 4 últimos dígitos do cartão.",
        };
    }

    if (
        creditLimit !== null &&
        creditLimit < 0
    ) {
        return {
            error:
                "O limite não pode ser negativo.",
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
                "Sua sessão expirou.",
        };
    }

    const {
        data,
        error,
    } = await supabase.rpc(
        "create_credit_card",
        {
            p_name: name,

            p_bank_name:
                bankName,

            p_last_four_digits:
                lastFourDigits,

            p_credit_limit:
                creditLimit,

            p_notes:
                notes || null,
        }
    );

    if (error) {
        console.error(
            "Erro ao cadastrar cartão:",
            error
        );

        return {
            error:
                error.message ||
                "Não foi possível cadastrar o cartão.",
        };
    }

    revalidatePath(
        "/financeiro/cartoes"
    );

    revalidatePath(
        "/financeiro/solicitacoes"
    );

    redirect(
        `/financeiro/cartoes?created=${data}`
    );
}

export async function changeCardStatus(
    formData: FormData
) {
    const cardId = String(
        formData.get("card_id") ??
        ""
    ).trim();

    const status = String(
        formData.get("status") ??
        ""
    ).trim();

    const allowed = [
        "available",
        "blocked",
        "inactive",
    ];

    if (
        !cardId ||
        !allowed.includes(status)
    ) {
        return;
    }

    const supabase =
        await createClient();

    const { error } =
        await supabase.rpc(
            "set_credit_card_status",
            {
                p_card_id:
                    cardId,

                p_status:
                    status,
            }
        );

    if (error) {
        console.error(
            "Erro ao alterar cartão:",
            error
        );

        return;
    }

    revalidatePath(
        "/financeiro/cartoes"
    );

    revalidatePath(
        "/financeiro/solicitacoes"
    );
}