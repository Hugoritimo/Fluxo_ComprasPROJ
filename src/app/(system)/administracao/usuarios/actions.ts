"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

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

    if (configured) {
        return configured.replace(/\/+$/, "");
    }

    if (process.env.VERCEL_URL) {
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
    const url = new URL(
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
// VALIDAR ADMIN
// ============================================================

async function requireUserManager() {
    const supabase =
        await createClient();

    const {
        data: claimsData,
    } =
        await supabase.auth.getClaims();

    const actorUserId =
        claimsData?.claims?.sub;

    if (!actorUserId) {
        throw new Error(
            "Usuário não autenticado."
        );
    }

    const {
        data: roleRows,
        error,
    } =
        await supabase
            .from("user_roles")
            .select("role")
            .eq(
                "user_id",
                actorUserId
            );

    if (error) {
        throw new Error(
            "Não foi possível validar suas permissões."
        );
    }

    const roles =
        (roleRows ?? []).map(
            (row) =>
                String(row.role)
        );

    const canManage =
        roles.includes("admin") ||
        roles.includes(
            "superadmin"
        );

    if (!canManage) {
        throw new Error(
            "Você não possui permissão para gerenciar usuários."
        );
    }

    return {
        actorUserId,

        isSuperadmin:
            roles.includes(
                "superadmin"
            ),
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
            fullName.length < 3
        ) {
            return {
                success: false,
                error:
                    "Informe o nome completo do colaborador.",
            };
        }

        if (
            !isValidEmail(email)
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
                .from("profiles")
                .select("id")
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

        if (existingProfile) {
            return {
                success: false,
                error:
                    "Já existe um usuário cadastrado com este e-mail.",
            };
        }

        // ========================================================
        // GERAR CONVITE
        //
        // IMPORTANTE:
        // generateLink NÃO envia e-mail.
        //
        // No tipo invite:
        // - cria o usuário no Supabase Auth
        // - gera token individual
        // - retorna os dados do link
        // ========================================================

        const {
            data: linkData,
            error: linkError,
        } =
            await admin.auth.admin.generateLink({
                type: "invite",

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

        if (!tokenHash) {
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
                type: "invite",
            });

        // ========================================================
        // PROFILE
        // ========================================================

        const {
            error:
            profileError,
        } =
            await admin
                .from("profiles")
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

                        // Mantemos compatibilidade
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

        if (profileError) {
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
                error: roleError,
            } =
                await admin
                    .from("user_roles")
                    .insert({
                        user_id:
                            newUserId,

                        role,
                    });

            if (roleError) {
                console.error(
                    "Erro ao atribuir role:",
                    roleError
                );

                await admin
                    .from("profiles")
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
        //
        // NÃO gravamos o token/link no banco.
        // ========================================================

        const {
            error: auditError,
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

        if (auditError) {
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
            error: null,
            userId:
                newUserId,
            email,
            invitationLink,
        };
    } catch (error) {
        console.error(
            "Erro ao criar usuário:",
            error
        );

        return {
            success: false,

            error:
                error instanceof Error
                    ? error.message
                    : "Não foi possível criar o usuário.",
        };
    }
}

// ============================================================
// GERAR NOVO LINK PARA USUÁRIO PENDENTE
// ============================================================

export async function generateFirstAccessLink(
    _previousState: FirstAccessLinkState,
    formData: FormData
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
                ) ?? ""
            ).trim();

        if (!userId) {
            return {
                success: false,
                error:
                    "Usuário não informado.",
            };
        }

        const admin =
            createAdminClient();

        const {
            data: profile,
            error: profileError,
        } =
            await admin
                .from("profiles")
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

        if (!profile.email) {
            return {
                success: false,
                error:
                    "O usuário não possui e-mail cadastrado.",
            };
        }

        // ========================================================
        // PARA USUÁRIO JÁ EXISTENTE:
        //
        // Geramos um Magic Link administrativo.
        //
        // Ele NÃO entra diretamente no sistema.
        // O link aponta para nossa página de confirmação e,
        // depois da validação, o usuário obrigatoriamente vai
        // para /primeiro-acesso porque o profile permanece com:
        //
        // must_change_password = true
        // ========================================================

        const {
            data: linkData,
            error: linkError,
        } =
            await admin.auth.admin.generateLink({
                type: "magiclink",

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

        if (!tokenHash) {
            return {
                success: false,
                error:
                    "O serviço de autenticação não retornou um link válido.",
            };
        }

        const invitationLink =
            buildFirstAccessUrl({
                tokenHash,
                type: "magiclink",
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
            error: null,
            email:
                profile.email,
            invitationLink,
        };
    } catch (error) {
        return {
            success: false,

            error:
                error instanceof Error
                    ? error.message
                    : "Não foi possível gerar o link.",
        };
    }
}

// ============================================================
// ATIVAR / DESATIVAR
// ============================================================

export async function changeUserActiveStatus(
    _previousState: UserActionState,
    formData: FormData
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
                ) ?? ""
            );

        const newStatus =
            String(
                formData.get(
                    "newStatus"
                ) ?? ""
            ) === "true";

        if (!targetUserId) {
            return {
                success: false,
                error:
                    "Usuário não informado.",
            };
        }

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
                .from("user_roles")
                .select("role")
                .eq(
                    "user_id",
                    targetUserId
                );

        const targetIsSuperadmin =
            (
                targetRoles ?? []
            ).some(
                (row) =>
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
                .from("profiles")
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

        if (profileError) {
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
            error: authError,
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

        if (authError) {
            console.error(
                "Erro ao alterar Auth:",
                authError
            );

            await admin
                .from("profiles")
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
            error: null,

            message:
                newStatus
                    ? "Usuário ativado."
                    : "Usuário desativado.",
        };
    } catch (error) {
        return {
            success: false,

            error:
                error instanceof Error
                    ? error.message
                    : "Não foi possível alterar o usuário.",
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
            value ?? ""
        ).trim();

    return result || null;
}

function isValidEmail(
    email: string
) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email
    );
}