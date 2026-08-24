"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

// ============================================================
// TIPOS
// ============================================================

export type PasswordChangeState = {
    error: string | null;
};

// ============================================================
// ALTERAR SENHA DO PRIMEIRO ACESSO
// ============================================================

export async function changeFirstAccessPassword(
    _previousState: PasswordChangeState,
    formData: FormData
): Promise<PasswordChangeState> {
    const password =
        String(
            formData.get("password") ?? ""
        );

    const confirmPassword =
        String(
            formData.get("confirmPassword") ?? ""
        );

    // =========================================================
    // VALIDAÇÕES
    // =========================================================

    const validationError =
        validatePassword(password);

    if (validationError) {
        return {
            error: validationError,
        };
    }

    if (
        password !==
        confirmPassword
    ) {
        return {
            error:
                "As senhas informadas não são iguais.",
        };
    }

    const supabase =
        await createClient();

    // =========================================================
    // USUÁRIO LOGADO
    // =========================================================

    const {
        data: claimsData,
        error: claimsError,
    } =
        await supabase.auth.getClaims();

    const userId =
        claimsData?.claims?.sub;

    if (
        claimsError ||
        !userId
    ) {
        redirect("/login");
    }

    // =========================================================
    // PROFILE
    // =========================================================

    const {
        data: profile,
        error: profileError,
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
        console.error(
            "[PRIMEIRO ACESSO] Profile não encontrado:",
            profileError
        );

        await supabase.auth.signOut();

        redirect("/login");
    }

    // =========================================================
    // USUÁRIO DESATIVADO
    // =========================================================

    if (
        profile.is_active ===
        false
    ) {
        await supabase.auth.signOut();

        redirect("/login");
    }

    // =========================================================
    // JÁ CONFIGUROU A SENHA
    // =========================================================

    if (
        profile.must_change_password ===
        false
    ) {
        redirect("/dashboard");
    }

    // =========================================================
    // ALTERAR SENHA NO SUPABASE AUTH
    // =========================================================

    const {
        error: passwordError,
    } =
        await supabase.auth.updateUser({
            password,
        });

    if (passwordError) {
        console.error(
            "[PRIMEIRO ACESSO] Erro ao alterar senha:",
            passwordError
        );

        return {
            error:
                translatePasswordError(
                    passwordError.message
                ),
        };
    }

    // =========================================================
    // REGISTRAR ALTERAÇÃO NO PROFILE
    // =========================================================

    const {
        error: registerError,
    } =
        await supabase.rpc(
            "register_password_change"
        );

    if (registerError) {
        console.error(
            "[PRIMEIRO ACESSO] Erro na RPC register_password_change:",
            registerError
        );

        // =======================================================
        // FALLBACK
        // =======================================================

        const {
            error: fallbackError,
        } =
            await supabase
                .from("profiles")
                .update({
                    must_change_password:
                        false,

                    last_password_change_at:
                        new Date().toISOString(),
                })
                .eq(
                    "id",
                    userId
                );

        if (fallbackError) {
            console.error(
                "[PRIMEIRO ACESSO] Erro no fallback:",
                fallbackError
            );

            return {
                error:
                    "A senha foi atualizada, mas não foi possível finalizar a configuração da conta. Entre em contato com o administrador.",
            };
        }
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
                    "first_access_completed",

                p_description:
                    "Usuário concluiu o primeiro acesso e definiu sua senha.",

                p_metadata: {},
            }
        );

    if (auditError) {
        console.error(
            "[PRIMEIRO ACESSO] Erro de auditoria:",
            auditError
        );
    }

    // =========================================================
    // CACHE
    // =========================================================

    revalidatePath(
        "/",
        "layout"
    );

    // =========================================================
    // DASHBOARD
    // =========================================================

    redirect("/dashboard");
}

// ============================================================
// VALIDAR SENHA
// ============================================================

function validatePassword(
    password: string
) {
    if (
        password.length < 10
    ) {
        return "A senha deve possuir pelo menos 10 caracteres.";
    }

    if (
        !/[A-Z]/.test(password)
    ) {
        return "Inclua pelo menos uma letra maiúscula.";
    }

    if (
        !/[a-z]/.test(password)
    ) {
        return "Inclua pelo menos uma letra minúscula.";
    }

    if (
        !/[0-9]/.test(password)
    ) {
        return "Inclua pelo menos um número.";
    }

    if (
        !/[^A-Za-z0-9]/.test(
            password
        )
    ) {
        return "Inclua pelo menos um caractere especial.";
    }

    if (
        /\s/.test(password)
    ) {
        return "A senha não pode conter espaços.";
    }

    return null;
}

// ============================================================
// TRADUZIR ERRO DO SUPABASE
// ============================================================

function translatePasswordError(
    message: string
) {
    const normalized =
        message.toLowerCase();

    if (
        normalized.includes(
            "same password"
        ) ||
        normalized.includes(
            "different from the old"
        )
    ) {
        return "A nova senha deve ser diferente da senha anterior.";
    }

    if (
        normalized.includes(
            "password"
        )
    ) {
        return "Não foi possível utilizar esta senha. Escolha outra senha e tente novamente.";
    }

    return "Não foi possível alterar sua senha.";
}