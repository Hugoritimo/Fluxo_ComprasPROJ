"use server";

import {
    revalidatePath,
} from "next/cache";

import {
    createClient,
} from "@/lib/supabase/server";

export type MappingActionResult = {
    success: boolean;
    error: string | null;
    updatedItems: number;
};

export async function saveSiengeUserMapping(
    siengeUsername: string,
    profileId: string
): Promise<MappingActionResult> {
    const username =
        siengeUsername
            .trim()
            .toUpperCase();

    const selectedProfileId =
        profileId.trim();

    if (!username) {
        return {
            success: false,
            error:
                "Usuário do Sienge não informado.",
            updatedItems: 0,
        };
    }

    if (!selectedProfileId) {
        return {
            success: false,
            error:
                "Selecione um usuário do sistema.",
            updatedItems: 0,
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
            success: false,
            error:
                "Usuário não autenticado.",
            updatedItems: 0,
        };
    }

    const {
        data,
        error,
    } =
        await supabase.rpc(
            "set_sienge_user_mapping",
            {
                p_sienge_username:
                    username,

                p_profile_id:
                    selectedProfileId,
            }
        );

    if (error) {
        console.error(
            "Erro ao vincular usuário Sienge:",
            error
        );

        return {
            success: false,
            error:
                error.message,
            updatedItems: 0,
        };
    }

    revalidatePath(
        "/financeiro/sienge"
    );

    revalidatePath(
        "/meus-pedidos"
    );

    return {
        success: true,
        error: null,
        updatedItems:
            Number(data ?? 0),
    };
}