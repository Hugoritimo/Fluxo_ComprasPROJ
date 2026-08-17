"use server";

import {
    revalidatePath,
} from "next/cache";

import {
    createAdminClient,
} from "@/lib/supabase/admin";

import {
    createClient,
} from "@/lib/supabase/server";

export type InviteUserState = {
    error: string | null;
    success: string | null;
};

const allowedRoles = [
    "requester",
    "buyer",
    "finance",
    "approver",
    "manager",
    "admin",
    "superadmin",
] as const;

function normalizeSiteUrl(
    value: string
) {
    return value.endsWith("/")
        ? value.slice(0, -1)
        : value;
}

export async function inviteUser(
    _previousState: InviteUserState,
    formData: FormData
): Promise<InviteUserState> {
    // =========================================================
    // CAMPOS
    // =========================================================

    const fullName =
        String(
            formData.get(
                "full_name"
            ) ?? ""
        ).trim();

    const email =
        String(
            formData.get(
                "email"
            ) ?? ""
        )
            .trim()
            .toLowerCase();

    const jobTitle =
        String(
            formData.get(
                "job_title"
            ) ?? ""
        ).trim();

    let roles =
        formData
            .getAll("roles")
            .map(
                (role) =>
                    String(role)
            )
            .filter(
                (
                    role
                ): role is
                    (typeof allowedRoles)[number] =>
                    allowedRoles.includes(
                        role as
                        (typeof allowedRoles)[number]
                    )
            );

    // Solicitante é sempre a base.
    if (
        !roles.includes(
            "requester"
        )
    ) {
        roles = [
            "requester",
            ...roles,
        ];
    }

    // =========================================================
    // VALIDAÇÃO
    // =========================================================

    if (!fullName) {
        return {
            error:
                "Informe o nome do usuário.",
            success: null,
        };
    }

    if (!email) {
        return {
            error:
                "Informe o e-mail do usuário.",
            success: null,
        };
    }

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
        !emailRegex.test(
            email
        )
    ) {
        return {
            error:
                "Informe um endereço de e-mail válido.",
            success: null,
        };
    }

    // =========================================================
    // USUÁRIO LOGADO
    // =========================================================

    const supabase =
        await createClient();

    const {
        data: claimsData,
    } =
        await supabase.auth.getClaims();

    const actorId =
        claimsData?.claims?.sub;

    if (!actorId) {
        return {
            error:
                "Sua sessão expirou.",
            success: null,
        };
    }

    // =========================================================
    // PERMISSÕES DO ADMINISTRADOR
    // =========================================================

    const {
        data: actorRoleRows,
        error: actorRolesError,
    } = await supabase
        .from("user_roles")
        .select("role")
        .eq(
            "user_id",
            actorId
        );

    if (actorRolesError) {
        return {
            error:
                "Não foi possível verificar suas permissões.",
            success: null,
        };
    }

    const actorRoles =
        (
            actorRoleRows ??
            []
        ).map(
            (item) =>
                item.role
        );

    const actorIsAdmin =
        actorRoles.includes(
            "admin"
        );

    const actorIsSuperadmin =
        actorRoles.includes(
            "superadmin"
        );

    if (
        !actorIsAdmin &&
        !actorIsSuperadmin
    ) {
        return {
            error:
                "Você não possui permissão para convidar usuários.",
            success: null,
        };
    }

    // =========================================================
    // SOMENTE SUPERADMIN CONCEDE SUPERADMIN
    // =========================================================

    if (
        roles.includes(
            "superadmin"
        ) &&
        !actorIsSuperadmin
    ) {
        return {
            error:
                "Somente um Superadministrador pode criar outro Superadministrador.",
            success: null,
        };
    }

    // =========================================================
    // VERIFICA SE JÁ EXISTE PERFIL
    // =========================================================

    const {
        data: existingProfile,
    } = await supabase
        .from("profiles")
        .select(
            "id, email"
        )
        .eq(
            "email",
            email
        )
        .maybeSingle();

    if (existingProfile) {
        return {
            error:
                "Já existe um usuário cadastrado com este e-mail.",
            success: null,
        };
    }

    // =========================================================
    // URL DO SISTEMA
    // =========================================================

    const siteUrl =
        normalizeSiteUrl(
            process.env
                .NEXT_PUBLIC_SITE_URL ??
            "http://localhost:3000"
        );

    const redirectTo =
        `${siteUrl}/auth/confirm`;

    // =========================================================
    // CLIENTE ADMIN
    // =========================================================

    let admin;

    try {
        admin =
            createAdminClient();
    } catch (
    error
    ) {
        console.error(
            error
        );

        return {
            error:
                "A chave administrativa do Supabase ainda não foi configurada.",
            success: null,
        };
    }

    // =========================================================
    // ENVIA CONVITE
    // =========================================================

    const {
        data: inviteData,
        error: inviteError,
    } =
        await admin.auth.admin
            .inviteUserByEmail(
                email,
                {
                    data: {
                        full_name:
                            fullName,

                        job_title:
                            jobTitle ||
                            null,

                        invited_by:
                            actorId,

                        projeta_invite:
                            true,
                    },

                    redirectTo,
                }
            );

    if (inviteError) {
        console.error(
            "Erro ao enviar convite:",
            inviteError
        );

        const message =
            inviteError.message
                ?.toLowerCase() ??
            "";

        if (
            message.includes(
                "already"
            ) ||
            message.includes(
                "registered"
            )
        ) {
            return {
                error:
                    "Este e-mail já possui uma conta de autenticação.",
                success: null,
            };
        }

        return {
            error:
                `Não foi possível enviar o convite: ${inviteError.message}`,
            success: null,
        };
    }

    const invitedUserId =
        inviteData.user?.id;

    if (!invitedUserId) {
        return {
            error:
                "O convite foi processado, mas não foi possível identificar o novo usuário.",
            success: null,
        };
    }

    // =========================================================
    // CONFIGURA PERFIL / PERMISSÕES
    //
    // Usa a RPC autenticada, portanto as regras de Admin /
    // Superadmin do banco continuam valendo.
    // =========================================================

    const {
        error: accessError,
    } =
        await supabase.rpc(
            "admin_update_user_access",
            {
                p_user_id:
                    invitedUserId,

                p_full_name:
                    fullName,

                p_job_title:
                    jobTitle ||
                    null,

                p_active:
                    true,

                p_roles:
                    roles,
            }
        );

    if (accessError) {
        console.error(
            "Erro ao configurar permissões:",
            accessError
        );

        // Evita deixar uma conta incompleta.
        const {
            error: deleteError,
        } =
            await admin.auth.admin
                .deleteUser(
                    invitedUserId
                );

        if (deleteError) {
            console.error(
                "Erro ao remover usuário incompleto:",
                deleteError
            );
        }

        return {
            error:
                `O convite não pôde ser concluído: ${accessError.message}`,
            success: null,
        };
    }

    // =========================================================
    // MARCA COMO PRIMEIRO ACESSO PENDENTE
    // =========================================================

    const {
        error: onboardingError,
    } =
        await admin
            .from("profiles")
            .update({
                must_set_password:
                    true,

                invited_at:
                    new Date()
                        .toISOString(),

                invited_by:
                    actorId,
            })
            .eq(
                "id",
                invitedUserId
            );

    if (
        onboardingError
    ) {
        console.error(
            "Erro ao preparar primeiro acesso:",
            onboardingError
        );

        return {
            error:
                "O usuário foi convidado, mas houve um problema ao configurar o primeiro acesso.",
            success: null,
        };
    }

    revalidatePath(
        "/administracao/usuarios"
    );

    return {
        error: null,

        success:
            `Convite enviado para ${email}.`,
    };
}