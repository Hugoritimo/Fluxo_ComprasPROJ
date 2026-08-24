import {
  createClient,
} from "@/lib/supabase/server";

import NotificationCenter from "@/components/system/notification-center";

// ============================================================
// TIPOS
// ============================================================

export type NotificationItem = {
  id: string;

  title: string;

  message:
    | string
    | null;

  level: string;

  category: string;

  action_url:
    | string
    | null;

  read_at:
    | string
    | null;

  created_at: string;
};

// ============================================================
// SERVER COMPONENT
// ============================================================

export default async function NotificationBell() {
  const supabase =
    await createClient();

  // =========================================================
  // AUTH
  // =========================================================

  const {
    data:
      claimsData,
  } =
    await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  if (!userId) {
    return null;
  }

  // =========================================================
  // DADOS
  // =========================================================

  const [
    notificationsResult,
    unreadResult,
  ] =
    await Promise.all([
      supabase
        .from(
          "system_notifications"
        )
        .select(
          `
          id,
          title,
          message,
          level,
          category,
          action_url,
          read_at,
          created_at
          `
        )
        .eq(
          "user_id",
          userId
        )
        .order(
          "created_at",
          {
            ascending:
              false,
          }
        )
        .limit(
          12
        ),

      supabase
        .from(
          "system_notifications"
        )
        .select(
          "id",
          {
            count:
              "exact",

            head:
              true,
          }
        )
        .eq(
          "user_id",
          userId
        )
        .is(
          "read_at",
          null
        ),
    ]);

  if (
    notificationsResult.error
  ) {
    console.error(
      "Erro ao carregar notificações:",
      notificationsResult.error
    );
  }

  if (
    unreadResult.error
  ) {
    console.error(
      "Erro ao carregar quantidade de notificações:",
      unreadResult.error
    );
  }

  const notifications =
    (
      notificationsResult.data ??
      []
    ) as NotificationItem[];

  const unreadCount =
    unreadResult.count ??
    0;

  // =========================================================
  // CLIENT DRAWER
  // =========================================================

  return (
    <NotificationCenter
      notifications={
        notifications
      }
      unreadCount={
        unreadCount
      }
    />
  );
}