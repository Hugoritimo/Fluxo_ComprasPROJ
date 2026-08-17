"use server";

import {
    revalidatePath,
} from "next/cache";

import {
    createClient,
} from "@/lib/supabase/server";

export type UserAccessState = {
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
];

export async function updateUserAccess(
    _previousState: UserAccessState,
    formData: FormData
): Promise<UserAccessState> {
    const userId =
        String(
            formData.get(
                "user_id"
            ) ?? ""
        ).trim();

    const fullName =
        String(
            formData.get(
                "full_name"
            ) ?? ""
        ).trim();

    const jobTitle =
        String(
            formData.get(
                "job_title"
            ) ?? ""
        ).trim();

    const active =
        formData.get(
            "active"
        ) === "on";

    const roles =
        formData
            .getAll("roles")
            .map(
                (role) =>
                    String(role)
            )
            .filter(
                (role) =>
                    allowedRoles.includes(
                        role
                    )
            );

    if (!userId) {
        return {
            error:
                "Usuário inválido.",
            success: null,
        };
    }

    if (!fullName) {
        return {
            error:
                "Informe o nome do usuário.",
            success: null,
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
            success: null,
        };
    }

    const {
        error,
    } = await supabase.rpc(
        "admin_update_user_access",
        {
            p_user_id:
                userId,

            p_full_name:
                fullName,

            p_job_title:
                jobTitle ||
                null,

            p_active:
                active,

            p_roles:
                roles,
        }
    );

    if (error) {
        console.error(
            "Erro ao atualizar usuário:",
            error
        );

        return {
            error:
                error.message ||
                "Não foi possível atualizar o usuário.",
            success: null,
        };
    }

    revalidatePath(
        "/administracao/usuarios"
    );

    revalidatePath(
        `/administracao/usuarios/${userId}`
    );

    return {
        error: null,
        success:
            "Usuário atualizado com sucesso.",
    };
}