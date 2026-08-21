"use server";

import {
    redirect,
} from "next/navigation";

import {
    revalidatePath,
} from "next/cache";

import {
    createClient,
} from "@/lib/supabase/server";

async function getAuthenticatedUser() {
    const supabase =
        await createClient();

    const {
        data: claimsData,
    } =
        await supabase.auth.getClaims();

    const userId =
        claimsData?.claims?.sub;

    if (!userId) {
        redirect(
            "/login"
        );
    }

    return {
        supabase,
        userId,
    };
}

function refreshNotifications() {
    revalidatePath(
        "/",
        "layout"
    );

    revalidatePath(
        "/notificacoes"
    );
}

// ============================================================
// ABRIR NOTIFICAÇÃO
// ============================================================

export async function openNotification(
    notificationId: string,
    actionUrl:
        | string
        | null
) {
    const {
        supabase,
        userId,
    } =
        await getAuthenticatedUser();

    const {
        error,
    } =
        await supabase
            .from(
                "system_notifications"
            )
            .update({
                read_at:
                    new Date().toISOString(),
            })
            .eq(
                "id",
                notificationId
            )
            .eq(
                "user_id",
                userId
            );

    if (error) {
        console.error(
            "Erro ao marcar notificação como lida:",
            error
        );
    }

    refreshNotifications();

    const destination =
        actionUrl &&
            actionUrl.startsWith("/")
            ? actionUrl
            : "/notificacoes";

    redirect(
        destination
    );
}

// ============================================================
// MARCAR UMA COMO LIDA
// ============================================================

export async function markNotificationRead(
    notificationId: string
) {
    const {
        supabase,
        userId,
    } =
        await getAuthenticatedUser();

    const {
        error,
    } =
        await supabase
            .from(
                "system_notifications"
            )
            .update({
                read_at:
                    new Date().toISOString(),
            })
            .eq(
                "id",
                notificationId
            )
            .eq(
                "user_id",
                userId
            );

    if (error) {
        console.error(
            "Erro ao marcar notificação:",
            error
        );
    }

    refreshNotifications();
}

// ============================================================
// MARCAR TODAS COMO LIDAS
// ============================================================

export async function markAllNotificationsRead() {
    const {
        supabase,
        userId,
    } =
        await getAuthenticatedUser();

    const {
        error,
    } =
        await supabase
            .from(
                "system_notifications"
            )
            .update({
                read_at:
                    new Date().toISOString(),
            })
            .eq(
                "user_id",
                userId
            )
            .is(
                "read_at",
                null
            );

    if (error) {
        console.error(
            "Erro ao marcar todas as notificações:",
            error
        );
    }

    refreshNotifications();
}