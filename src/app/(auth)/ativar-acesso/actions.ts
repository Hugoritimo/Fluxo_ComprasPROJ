"use server";

import type {
    EmailOtpType,
} from "@supabase/supabase-js";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type ActivateAccessState = {
    error: string | null;
};

// ============================================================
// CONFIRMAR PRIMEIRO ACESSO
// ============================================================

export async function activateAccess(
    _previousState: ActivateAccessState,
    formData: FormData
): Promise<ActivateAccessState> {
    const tokenHash =
        String(
            formData.get(
                "tokenHash"
            ) ?? ""
        ).trim();

    const rawType =
        String(
            formData.get(
                "type"
            ) ?? ""
        ).trim();

    if (!tokenHash) {
        return {
            error:
                "O link de ativação está incompleto.",
        };
    }

    if (
        rawType !== "invite" &&
        rawType !== "magiclink"
    ) {
        return {
            error:
                "Tipo de ativação inválido.",
        };
    }

    const supabase =
        await createClient();

    // =========================================================
    // SOMENTE AQUI O TOKEN É CONSUMIDO
    // =========================================================

    const {
        data,
        error,
    } =
        await supabase.auth.verifyOtp({
            token_hash:
                tokenHash,

            type:
                rawType as EmailOtpType,
        });

    if (
        error ||
        !data.user
    ) {
        console.error(
            "Erro ao validar primeiro acesso:",
            error
        );

        return {
            error:
                "Este link é inválido, já foi utilizado ou expirou. Solicite um novo link ao administrador.",
        };
    }

    const userId =
        data.user.id;

    // =========================================================
    // PROFILE
    // =========================================================

    const {
        data: profile,
        error:
        profileError,
    } =
        await supabase
            .from("profiles")
            .select(
                `
        id,
        is_active,
        must_change_password
        `
            )
            .eq(
                "id",
                userId
            )
            .maybeSingle();

    if (
        profileError ||
        !profile
    ) {
        await supabase.auth.signOut();

        return {
            error:
                "Seu usuário não possui um perfil válido no sistema.",
        };
    }

    if (
        !profile.is_active
    ) {
        await supabase.auth.signOut();

        return {
            error:
                "Este acesso foi desativado pelo administrador.",
        };
    }

    // =========================================================
    // AUDITORIA
    // =========================================================

    const {
        error: auditError,
    } =
        await supabase.rpc(
            "register_user_access_event",
            {
                p_event_type:
                    "first_access_link_accepted",

                p_description:
                    "Usuário validou o link de primeiro acesso.",

                p_metadata: {
                    link_type:
                        rawType,
                },
            }
        );

    if (auditError) {
        console.error(
            "Erro ao registrar validação:",
            auditError
        );
    }

    // =========================================================
    // JÁ FINALIZOU?
    // =========================================================

    if (
        !profile
            .must_change_password
    ) {
        redirect(
            "/dashboard"
        );
    }

    // =========================================================
    // DEFINIR SENHA
    // =========================================================

    redirect(
        "/primeiro-acesso"
    );
}