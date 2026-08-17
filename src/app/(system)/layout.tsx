import { redirect } from "next/navigation";

import SystemSidebar from "@/components/layout/system-sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function SystemLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();

  // =========================================================
  // AUTENTICAÇÃO
  // =========================================================

  const {
    data: claimsData,
    error: claimsError,
  } = await supabase.auth.getClaims();

  const userId =
    claimsData?.claims?.sub;

  console.log(
    "========================================"
  );

  console.log(
    "[SYSTEM LAYOUT] claims error:",
    claimsError
  );

  console.log(
    "[SYSTEM LAYOUT] user id:",
    userId
  );

  if (!userId) {
    console.log(
      "[SYSTEM LAYOUT] REDIRECT: sem userId"
    );

    redirect("/login");
  }

  // =========================================================
  // PERFIL
  // =========================================================

  const {
    data: profile,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      email,
      job_title,
      active
      `
    )
    .eq("id", userId)
    .maybeSingle();

  console.log(
    "[SYSTEM LAYOUT] profile:",
    profile
  );

  console.log(
    "[SYSTEM LAYOUT] profile error:",
    profileError
  );

  if (profileError) {
    console.log(
      "[SYSTEM LAYOUT] REDIRECT: erro no profile"
    );

    redirect("/login");
  }

  if (!profile) {
    console.log(
      "[SYSTEM LAYOUT] REDIRECT: profile não encontrado"
    );

    redirect("/login");
  }

  if (!profile.active) {
    console.log(
      "[SYSTEM LAYOUT] REDIRECT: usuário inativo"
    );

    redirect("/login");
  }

  // =========================================================
  // ROLES
  // =========================================================

  const {
    data: roleRows,
    error: rolesError,
  } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  console.log(
    "[SYSTEM LAYOUT] roles:",
    roleRows
  );

  console.log(
    "[SYSTEM LAYOUT] roles error:",
    rolesError
  );

  const roles =
    (roleRows ?? []).map(
      (item) => item.role
    );

  console.log(
    "[SYSTEM LAYOUT] acesso liberado"
  );

  console.log(
    "========================================"
  );

  return (
    <div className="min-h-screen bg-[#f5f6f8] pb-20 lg:pb-0">
      <SystemSidebar
        profile={{
          full_name:
            profile.full_name,

          email:
            profile.email,
        }}
        roles={roles}
      />

      <div className="lg:pl-64">
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-5 sm:px-6 lg:px-8">
          <div>
            <p className="text-xs text-slate-400">
              Sistema de Compras
            </p>

            <p className="mt-0.5 text-sm font-medium text-slate-700">
              {profile.full_name}
            </p>
          </div>

          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#AF1B1B] text-sm font-semibold text-white">
            {getInitials(
              profile.full_name
            )}
          </div>
        </header>

        <main className="p-5 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

function getInitials(
  name: string
) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase()
    )
    .join("");
}