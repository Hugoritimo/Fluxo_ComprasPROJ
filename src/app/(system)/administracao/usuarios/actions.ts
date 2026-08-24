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

// ============================================================
// TIPOS
// ============================================================

export type CreateUserState = {
    success: boolean;
    error: string | null;
    userId?: string | null;
    email?: string | null;
    invitationLink?: string | null;
};

export type FirstAccessLinkState = {
    success: boolean;
    error: string | null;
    email?: string | null;
    invitationLink?: string | null;
};

export type UserActionState = {
    success: boolean;
    error: string | null;
    message?: string | null;
};

type AllowedRole =
    | "collaborator"
    | "finance"
    | "admin"
    | "superadmin";

// ============================================================
// APP URL
// ============================================================

function getAppUrl() {
    const configured =
        process.env.APP_URL?.trim() ||
        process.env.NEXT_PUBLIC_APP_URL?.trim();

    if (
        configured
    ) {
        return configured.replace(
            /\/+$/,
            ""
        );
    }

    if (
        process.env.VERCEL_URL
    ) {
        return `https://${process.env.VERCEL_URL}`;
    }

    return "http://localhost:3000";
}

// ============================================================
// MONTAR LINK DE PRIMEIRO ACESSO
// ============================================================

function buildFirstAccessUrl({
    tokenHash,
    type,
}: {
    tokenHash: string;
    type: "invite" | "magiclink";
}) {
    const url =
        new URL(
            "/ativar-acesso",
            getAppUrl()
        );

    url.searchParams.set(
        "token_hash",
        tokenHash
    );

    url.searchParams.set(
        "type",
        type
    );

    return url.toString();
}

// ============================================================
// VALIDAR ADMIN / SUPERADMIN
// ============================================================

async function requireUserManager() {
    const supabase =
        await createClient();

    const {
        data:
        claimsData,
    } =
        await supabase.auth.getClaims();

    const actorUserId =
        claimsData?.claims?.sub;

    if (
        !actorUserId
    ) {
        throw new Error(
            "Usuário não autenticado."
        );
    }

    const {
        data:
        roleRows,
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
                actorUserId
            );

    if (
        error
    ) {
        throw new Error(
            "Não foi possível validar suas permissões."
        );
    }

    const roles =
        (
            roleRows ??
            []
        ).map(
            (
                row
            ) =>
                String(
                    row.role
                )
        );

    const isSuperadmin =
        roles.includes(
            "superadmin"
        );

    const canManage =
        roles.includes(
            "admin"
        ) ||
        isSuperadmin;

    if (
        !canManage
    ) {
        throw new Error(
            "Você não possui permissão para gerenciar usuários."
        );
    }

    return {
        actorUserId,
        isSuperadmin,
        roles,
    };
}

// ============================================================
// EXIGIR SUPERADMIN
// ============================================================
//
// IMPORTANTE:
//
// Essa validação acontece no SERVIDOR.
//
// Portanto, mesmo que alguém tente executar manualmente
// a Server Action pelo navegador, somente uma conta com
// role "superadmin" poderá continuar.
// ============================================================

async function requireSuperadmin() {
    const {
        actorUserId,
        isSuperadmin,
    } =
        await requireUserManager();

    if (
        !isSuperadmin
    ) {
        throw new Error(
            "Somente o Superadministrador pode excluir usuários."
        );
    }

    return {
        actorUserId,
    };
}

// ============================================================
// CRIAR USUÁRIO + GERAR CONVITE
// ============================================================

export async function createSystemUser(
    _previousState: CreateUserState,
    formData: FormData
): Promise<CreateUserState> {
    try {
        const {
            actorUserId,
            isSuperadmin,
        } =
            await requireUserManager();

        const fullName =
            String(
                formData.get(
                    "fullName"
                ) ??
                ""
            ).trim();

        const email =
            String(
                formData.get(
                    "email"
                ) ??
                ""
            )
                .trim()
                .toLowerCase();

        const department =
            normalizeOptional(
                formData.get(
                    "department"
                )
            );

        const jobTitle =
            normalizeOptional(
                formData.get(
                    "jobTitle"
                )
            );

        const phone =
            normalizeOptional(
                formData.get(
                    "phone"
                )
            );

        const role =
            String(
                formData.get(
                    "role"
                ) ??
                "collaborator"
            ) as AllowedRole;

        // ========================================================
        // VALIDAÇÕES
        // ========================================================

        if (
            fullName.length <
            3
        ) {
            return {
                success: false,
                error:
                    "Informe o nome completo do colaborador.",
            };
        }

        if (
            !isValidEmail(
                email
            )
        ) {
            return {
                success: false,
                error:
                    "Informe um endereço de e-mail válido.",
            };
        }

        const allowedRoles: AllowedRole[] =
            [
                "collaborator",
                "finance",
                "admin",
                "superadmin",
            ];

        if (
            !allowedRoles.includes(
                role
            )
        ) {
            return {
                success: false,
                error:
                    "Perfil de acesso inválido.",
            };
        }

        // ========================================================
        // SOMENTE SUPERADMIN CRIA SUPERADMIN
        // ========================================================

        if (
            role ===
            "superadmin" &&
            !isSuperadmin
        ) {
            return {
                success: false,
                error:
                    "Somente um Superadministrador pode criar outro Superadministrador.",
            };
        }

        const admin =
            createAdminClient();

        // ========================================================
        // VERIFICAR PROFILE EXISTENTE
        // ========================================================

        const {
            data:
            existingProfile,
            error:
            existingProfileError,
        } =
            await admin
                .from(
                    "profiles"
                )
                .select(
                    "id"
                )
                .eq(
                    "email",
                    email
                )
                .maybeSingle();

        if (
            existingProfileError
        ) {
            console.error(
                "Erro ao consultar usuário:",
                existingProfileError
            );

            return {
                success: false,
                error:
                    "Não foi possível verificar o cadastro do usuário.",
            };
        }

        if (
            existingProfile
        ) {
            return {
                success: false,
                error:
                    "Já existe um usuário cadastrado com este e-mail.",
            };
        }

        // ========================================================
        // GERAR CONVITE
        //
        // generateLink NÃO envia e-mail.
        // ========================================================

        const {
            data:
            linkData,
            error:
            linkError,
        } =
            await admin.auth.admin.generateLink({
                type:
                    "invite",

                email,

                options: {
                    data: {
                        full_name:
                            fullName,
                    },
                },
            });

        if (
            linkError ||
            !linkData.user ||
            !linkData.properties
        ) {
            console.error(
                "Erro ao gerar convite:",
                linkError
            );

            const message =
                linkError?.message
                    ?.toLowerCase() ??
                "";

            if (
                message.includes(
                    "already"
                )
            ) {
                return {
                    success: false,
                    error:
                        "Este e-mail já possui uma conta no serviço de autenticação.",
                };
            }

            return {
                success: false,
                error:
                    "Não foi possível criar o acesso do usuário.",
            };
        }

        const newUserId =
            linkData.user.id;

        const tokenHash =
            linkData.properties
                .hashed_token;

        if (
            !tokenHash
        ) {
            await admin.auth.admin.deleteUser(
                newUserId
            );

            return {
                success: false,
                error:
                    "O usuário foi criado, mas o serviço de autenticação não retornou um convite válido.",
            };
        }

        const invitationLink =
            buildFirstAccessUrl({
                tokenHash,
                type:
                    "invite",
            });

        // ========================================================
        // PROFILE
        // ========================================================

        const {
            error:
            profileError,
        } =
            await admin
                .from(
                    "profiles"
                )
                .upsert(
                    {
                        id:
                            newUserId,

                        full_name:
                            fullName,

                        email,

                        department,

                        job_title:
                            jobTitle,

                        phone,

                        // Compatibilidade
                        // com a estrutura antiga.
                        active:
                            true,

                        is_active:
                            true,

                        must_change_password:
                            true,

                        last_login_at:
                            null,

                        last_password_change_at:
                            null,
                    },
                    {
                        onConflict:
                            "id",
                    }
                );

        if (
            profileError
        ) {
            console.error(
                "Erro ao criar profile:",
                profileError
            );

            await admin.auth.admin.deleteUser(
                newUserId
            );

            return {
                success: false,
                error:
                    "Não foi possível criar o perfil do usuário.",
            };
        }

        // ========================================================
        // ROLE
        //
        // Colaborador não recebe registro.
        // ========================================================

        if (
            role !==
            "collaborator"
        ) {
            const {
                error:
                roleError,
            } =
                await admin
                    .from(
                        "user_roles"
                    )
                    .insert({
                        user_id:
                            newUserId,

                        role,
                    });

            if (
                roleError
            ) {
                console.error(
                    "Erro ao atribuir role:",
                    roleError
                );

                await admin
                    .from(
                        "profiles"
                    )
                    .delete()
                    .eq(
                        "id",
                        newUserId
                    );

                await admin.auth.admin.deleteUser(
                    newUserId
                );

                return {
                    success: false,
                    error:
                        "Não foi possível atribuir o perfil de acesso.",
                };
            }
        }

        // ========================================================
        // AUDITORIA
        // ========================================================

        const {
            error:
            auditError,
        } =
            await admin
                .from(
                    "user_access_audit"
                )
                .insert({
                    user_id:
                        newUserId,

                    actor_user_id:
                        actorUserId,

                    event_type:
                        "user_created",

                    description:
                        `Usuário ${fullName} criado e aguardando primeiro acesso.`,

                    metadata: {
                        email,
                        department,
                        job_title:
                            jobTitle,
                        role,
                    },
                });

        if (
            auditError
        ) {
            console.error(
                "Erro ao registrar auditoria:",
                auditError
            );
        }

        revalidatePath(
            "/administracao/usuarios"
        );

        return {
            success: true,
            error:
                null,
            userId:
                newUserId,
            email,
            invitationLink,
        };
    } catch (
    error
    ) {
        console.error(
            "Erro ao criar usuário:",
            error
        );

        return {
            success: false,

            error:
                error instanceof
                    Error
                    ? error.message
                    : "Não foi possível criar o usuário.",
        };
    }
}

// ============================================================
// GERAR NOVO LINK PARA USUÁRIO PENDENTE
// ============================================================

export async function generateFirstAccessLink(
    _previousState:
        FirstAccessLinkState,
    formData:
        FormData
): Promise<FirstAccessLinkState> {
    try {
        const {
            actorUserId,
        } =
            await requireUserManager();

        const userId =
            String(
                formData.get(
                    "userId"
                ) ??
                ""
            ).trim();

        if (
            !userId
        ) {
            return {
                success: false,
                error:
                    "Usuário não informado.",
            };
        }

        const admin =
            createAdminClient();

        const {
            data:
            profile,
            error:
            profileError,
        } =
            await admin
                .from(
                    "profiles"
                )
                .select(
                    `
                    id,
                    full_name,
                    email,
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
            return {
                success: false,
                error:
                    "Usuário não encontrado.",
            };
        }

        if (
            !profile.is_active
        ) {
            return {
                success: false,
                error:
                    "O usuário está desativado.",
            };
        }

        if (
            !profile
                .must_change_password
        ) {
            return {
                success: false,
                error:
                    "Este usuário já concluiu o primeiro acesso.",
            };
        }

        if (
            !profile.email
        ) {
            return {
                success: false,
                error:
                    "O usuário não possui e-mail cadastrado.",
            };
        }

        // ========================================================
        // MAGIC LINK
        // ========================================================

        const {
            data:
            linkData,
            error:
            linkError,
        } =
            await admin.auth.admin.generateLink({
                type:
                    "magiclink",

                email:
                    profile.email,
            });

        if (
            linkError ||
            !linkData.properties
        ) {
            console.error(
                "Erro ao gerar novo link:",
                linkError
            );

            return {
                success: false,
                error:
                    "Não foi possível gerar um novo link de primeiro acesso.",
            };
        }

        const tokenHash =
            linkData.properties
                .hashed_token;

        if (
            !tokenHash
        ) {
            return {
                success: false,
                error:
                    "O serviço de autenticação não retornou um link válido.",
            };
        }

        const invitationLink =
            buildFirstAccessUrl({
                tokenHash,
                type:
                    "magiclink",
            });

        await admin
            .from(
                "user_access_audit"
            )
            .insert({
                user_id:
                    userId,

                actor_user_id:
                    actorUserId,

                event_type:
                    "first_access_link_generated",

                description:
                    "Administrador gerou um novo link de primeiro acesso.",

                metadata: {},
            });

        return {
            success: true,
            error:
                null,
            email:
                profile.email,
            invitationLink,
        };
    } catch (
    error
    ) {
        return {
            success: false,

            error:
                error instanceof
                    Error
                    ? error.message
                    : "Não foi possível gerar o link.",
        };
    }
}

// ============================================================
// ATIVAR / DESATIVAR
// ============================================================

export async function changeUserActiveStatus(
    _previousState:
        UserActionState,
    formData:
        FormData
): Promise<UserActionState> {
    try {
        const {
            actorUserId,
            isSuperadmin,
        } =
            await requireUserManager();

        const targetUserId =
            String(
                formData.get(
                    "userId"
                ) ??
                ""
            ).trim();

        const newStatus =
            String(
                formData.get(
                    "newStatus"
                ) ??
                ""
            ) ===
            "true";

        if (
            !targetUserId
        ) {
            return {
                success: false,
                error:
                    "Usuário não informado.",
            };
        }

        // ========================================================
        // NÃO PODE DESATIVAR A PRÓPRIA CONTA
        // ========================================================

        if (
            targetUserId ===
            actorUserId &&
            !newStatus
        ) {
            return {
                success: false,
                error:
                    "Você não pode desativar sua própria conta.",
            };
        }

        const admin =
            createAdminClient();

        // ========================================================
        // PROTEGER SUPERADMIN
        // ========================================================

        const {
            data:
            targetRoles,
        } =
            await admin
                .from(
                    "user_roles"
                )
                .select(
                    "role"
                )
                .eq(
                    "user_id",
                    targetUserId
                );

        const targetIsSuperadmin =
            (
                targetRoles ??
                []
            ).some(
                (
                    row
                ) =>
                    String(
                        row.role
                    ) ===
                    "superadmin"
            );

        if (
            targetIsSuperadmin &&
            !isSuperadmin
        ) {
            return {
                success: false,
                error:
                    "Somente outro Superadministrador pode alterar este usuário.",
            };
        }

        // ========================================================
        // PROFILE
        // ========================================================

        const {
            error:
            profileError,
        } =
            await admin
                .from(
                    "profiles"
                )
                .update({
                    active:
                        newStatus,

                    is_active:
                        newStatus,
                })
                .eq(
                    "id",
                    targetUserId
                );

        if (
            profileError
        ) {
            return {
                success: false,
                error:
                    "Não foi possível alterar o status do usuário.",
            };
        }

        // ========================================================
        // AUTH
        // ========================================================

        const {
            error:
            authError,
        } =
            await admin.auth.admin.updateUserById(
                targetUserId,
                {
                    ban_duration:
                        newStatus
                            ? "none"
                            : "876000h",
                }
            );

        if (
            authError
        ) {
            console.error(
                "Erro ao alterar Auth:",
                authError
            );

            await admin
                .from(
                    "profiles"
                )
                .update({
                    active:
                        !newStatus,

                    is_active:
                        !newStatus,
                })
                .eq(
                    "id",
                    targetUserId
                );

            return {
                success: false,
                error:
                    "Não foi possível alterar o bloqueio de autenticação.",
            };
        }

        // ========================================================
        // AUDITORIA
        // ========================================================

        await admin
            .from(
                "user_access_audit"
            )
            .insert({
                user_id:
                    targetUserId,

                actor_user_id:
                    actorUserId,

                event_type:
                    newStatus
                        ? "user_activated"
                        : "user_deactivated",

                description:
                    newStatus
                        ? "Usuário ativado pelo administrador."
                        : "Usuário desativado pelo administrador.",

                metadata: {
                    is_active:
                        newStatus,
                },
            });

        revalidatePath(
            "/administracao/usuarios"
        );

        return {
            success: true,
            error:
                null,

            message:
                newStatus
                    ? "Usuário ativado."
                    : "Usuário desativado.",
        };
    } catch (
    error
    ) {
        return {
            success: false,

            error:
                error instanceof
                    Error
                    ? error.message
                    : "Não foi possível alterar o usuário.",
        };
    }
}

// ============================================================
// EXCLUIR USUÁRIO
// ============================================================
//
// REGRA DE SEGURANÇA:
//
// ADMIN:
// - NÃO pode excluir.
//
// SUPERADMIN:
// - pode excluir;
// - NÃO pode excluir a própria conta.
//
// A validação acontece no servidor.
// ============================================================

export async function deleteSystemUser(
    _previousState:
        UserActionState,
    formData:
        FormData
): Promise<UserActionState> {
    try {
        // ========================================================
        // SOMENTE SUPERADMIN
        // ========================================================

        const {
            actorUserId,
        } =
            await requireSuperadmin();

        const targetUserId =
            String(
                formData.get(
                    "userId"
                ) ??
                ""
            ).trim();

        if (
            !targetUserId
        ) {
            return {
                success: false,
                error:
                    "Usuário não informado.",
            };
        }

        // ========================================================
        // NÃO PERMITIR AUTOEXCLUSÃO
        // ========================================================

        if (
            targetUserId ===
            actorUserId
        ) {
            return {
                success: false,
                error:
                    "Você não pode excluir sua própria conta de Superadministrador.",
            };
        }

        const admin =
            createAdminClient();

        // ========================================================
        // LOCALIZAR USUÁRIO
        // ========================================================

        const {
            data:
            targetProfile,
            error:
            targetProfileError,
        } =
            await admin
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
                .eq(
                    "id",
                    targetUserId
                )
                .maybeSingle();

        if (
            targetProfileError
        ) {
            console.error(
                "Erro ao consultar usuário para exclusão:",
                targetProfileError
            );

            return {
                success: false,
                error:
                    "Não foi possível consultar o usuário.",
            };
        }

        if (
            !targetProfile
        ) {
            return {
                success: false,
                error:
                    "Usuário não encontrado.",
            };
        }

        // ========================================================
        // CONSULTAR ROLE DO USUÁRIO
        // ========================================================

        const {
            data:
            targetRoleRows,
            error:
            targetRolesError,
        } =
            await admin
                .from(
                    "user_roles"
                )
                .select(
                    "role"
                )
                .eq(
                    "user_id",
                    targetUserId
                );

        if (
            targetRolesError
        ) {
            console.error(
                "Erro ao consultar permissões do usuário:",
                targetRolesError
            );

            return {
                success: false,
                error:
                    "Não foi possível validar o perfil do usuário.",
            };
        }

        const targetRoles =
            (
                targetRoleRows ??
                []
            ).map(
                (
                    row
                ) =>
                    String(
                        row.role
                    )
            );

        // ========================================================
        // AUDITORIA ANTES DA EXCLUSÃO
        // ========================================================
        //
        // Tentamos registrar antes porque depois da exclusão
        // o profile pode ser removido por cascade.
        //
        // Falha na auditoria NÃO impede a exclusão.
        // ========================================================

        const {
            error:
            auditError,
        } =
            await admin
                .from(
                    "user_access_audit"
                )
                .insert({
                    user_id:
                        targetUserId,

                    actor_user_id:
                        actorUserId,

                    event_type:
                        "user_deleted",

                    description:
                        `Usuário ${targetProfile.full_name ?? targetProfile.email ?? targetUserId} excluído pelo Superadministrador.`,

                    metadata: {
                        email:
                            targetProfile.email,

                        full_name:
                            targetProfile.full_name,

                        roles:
                            targetRoles,
                    },
                });

        if (
            auditError
        ) {
            console.error(
                "Não foi possível registrar auditoria antes da exclusão:",
                auditError
            );
        }

        // ========================================================
        // EXCLUIR DO SUPABASE AUTH
        // ========================================================
        //
        // Essa é a exclusão real da conta.
        //
        // Em uma estrutura padrão:
        //
        // auth.users
        //    ↓ ON DELETE CASCADE
        // profiles
        // user_roles
        //
        // também são removidos.
        // ========================================================

        const {
            error:
            authDeleteError,
        } =
            await admin.auth.admin.deleteUser(
                targetUserId
            );

        if (
            authDeleteError
        ) {
            console.error(
                "Erro ao excluir usuário do Supabase Auth:",
                authDeleteError
            );

            return {
                success: false,
                error:
                    "Não foi possível excluir a conta do usuário.",
            };
        }

        // ========================================================
        // LIMPEZA DE SEGURANÇA
        // ========================================================
        //
        // Caso profiles/user_roles não estejam configurados com
        // ON DELETE CASCADE, tentamos remover os registros
        // restantes.
        //
        // Se já tiverem sido removidos pelo banco, essas operações
        // simplesmente afetarão zero registros.
        // ========================================================

        const {
            error:
            rolesCleanupError,
        } =
            await admin
                .from(
                    "user_roles"
                )
                .delete()
                .eq(
                    "user_id",
                    targetUserId
                );

        if (
            rolesCleanupError
        ) {
            console.error(
                "Aviso ao limpar user_roles:",
                rolesCleanupError
            );
        }

        const {
            error:
            profileCleanupError,
        } =
            await admin
                .from(
                    "profiles"
                )
                .delete()
                .eq(
                    "id",
                    targetUserId
                );

        if (
            profileCleanupError
        ) {
            console.error(
                "Aviso ao limpar profile:",
                profileCleanupError
            );
        }

        // ========================================================
        // REVALIDAR
        // ========================================================

        revalidatePath(
            "/administracao/usuarios"
        );

        return {
            success: true,
            error:
                null,

            message:
                "Usuário excluído com sucesso.",
        };
    } catch (
    error
    ) {
        console.error(
            "Erro ao excluir usuário:",
            error
        );

        return {
            success: false,

            error:
                error instanceof
                    Error
                    ? error.message
                    : "Não foi possível excluir o usuário.",
        };
    }
}

// ============================================================
// HELPERS
// ============================================================

function normalizeOptional(
    value:
        | FormDataEntryValue
        | null
) {
    const result =
        String(
            value ??
            ""
        ).trim();

    return (
        result ||
        null
    );
}

function isValidEmail(
    email:
        string
) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );
}