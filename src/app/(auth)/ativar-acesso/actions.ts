"use server";

import type {
    EmailOtpType,
} from "@supabase/supabase-js";

import {
    redirect,
} from "next/navigation";

import {
    createClient,
} from "@/lib/supabase/server";

export type ActivateAccessState = {
    error: string | null;
};

// ============================================================
// TIPOS DE LINK ACEITOS PELO NOSSO SISTEMA
// ============================================================

type ActivationLinkType =
    | "invite"
    | "magiclink"
    | "email";

// ============================================================
// NORMALIZAR TIPO PARA O VERIFY OTP
// ============================================================

function resolveOtpType(
    rawType: ActivationLinkType
): EmailOtpType {
    // Convite administrativo continua sendo "invite".
    if (
        rawType === "invite"
    ) {
        return "invite";
    }

    // Magic Link / Token Hash de e-mail deve ser verificado
    // como "email".
    //
    // Também mantemos compatibilidade com links antigos que
    // possuem ?type=magiclink.
    return "email";
}

// ============================================================
// CONFIRMAR PRIMEIRO ACESSO
// ============================================================

export async function activateAccess(
    _previousState:
        ActivateAccessState,
    formData:
        FormData
): Promise<ActivateAccessState> {
    // ==========================================================
    // TOKEN
    // ==========================================================

    const tokenHash =
        String(
            formData.get(
                "tokenHash"
            ) ?? ""
        ).trim();

    // ==========================================================
    // TIPO ORIGINAL DA URL
    // ==========================================================

    const rawType =
        String(
            formData.get(
                "type"
            ) ?? ""
        )
            .trim()
            .toLowerCase();

    // ==========================================================
    // VALIDAÇÕES BÁSICAS
    // ==========================================================

    if (
        !tokenHash
    ) {
        return {
            error:
                "O link de ativação está incompleto.",
        };
    }

    if (
        rawType !==
        "invite" &&
        rawType !==
        "magiclink" &&
        rawType !==
        "email"
    ) {
        console.error(
            "Tipo de ativação recebido:",
            rawType
        );

        return {
            error:
                "Tipo de ativação inválido. Solicite um novo link ao administrador.",
        };
    }

    const activationType =
        rawType as ActivationLinkType;

    const otpType =
        resolveOtpType(
            activationType
        );

    const supabase =
        await createClient();

    // ==========================================================
    // VERIFICAR TOKEN
    //
    // IMPORTANTE:
    //
    // - invite    -> invite
    // - magiclink -> email
    // - email     -> email
    //
    // O token somente é consumido aqui, quando o usuário
    // efetivamente clica em "Ativar meu acesso".
    // ==========================================================

    const {
        data,
        error,
    } =
        await supabase.auth.verifyOtp({
            token_hash:
                tokenHash,

            type:
                otpType,
        });

    if (
        error ||
        !data.user
    ) {
        console.error(
            "Erro ao validar primeiro acesso:",
            {
                message:
                    error?.message ??
                    null,

                status:
                    error?.status ??
                    null,

                code:
                    error?.code ??
                    null,

                rawType:
                    activationType,

                otpType,
            }
        );

        return {
            error:
                "Este link é inválido, já foi utilizado ou expirou. Solicite um novo link ao administrador.",
        };
    }

    const userId =
        data.user.id;

    // ==========================================================
    // PROFILE
    // ==========================================================

    const {
        data:
        profile,

        error:
        profileError,
    } =
        await supabase
            .from(
                "profiles"
            )
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
        console.error(
            "Perfil não encontrado após ativação:",
            profileError
        );

        await supabase.auth.signOut();

        return {
            error:
                "Seu usuário não possui um perfil válido no sistema.",
        };
    }

    // ==========================================================
    // USUÁRIO DESATIVADO
    // ==========================================================

    if (
        !profile.is_active
    ) {
        await supabase.auth.signOut();

        return {
            error:
                "Este acesso foi desativado pelo administrador.",
        };
    }

    // ==========================================================
    // AUDITORIA
    // ==========================================================

    const {
        error:
        auditError,
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
                        activationType,

                    otp_type:
                        otpType,
                },
            }
        );

    if (
        auditError
    ) {
        console.error(
            "Erro ao registrar validação:",
            auditError
        );
    }

    // ==========================================================
    // USUÁRIO JÁ CONFIGURADO
    // ==========================================================

    if (
        !profile
            .must_change_password
    ) {
        redirect(
            "/dashboard"
        );
    }

    // ==========================================================
    // PRIMEIRO ACESSO
    // ==========================================================

    redirect(
        "/primeiro-acesso"
    );
}