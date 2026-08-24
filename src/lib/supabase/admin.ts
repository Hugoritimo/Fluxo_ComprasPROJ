import {
    createClient,
} from "@supabase/supabase-js";

export function createAdminClient() {
    const supabaseUrl =
        process.env.NEXT_PUBLIC_SUPABASE_URL;

    const adminKey =
        process.env.SUPABASE_SECRET_KEY ??
        process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) {
        throw new Error(
            "NEXT_PUBLIC_SUPABASE_URL não configurada."
        );
    }

    if (!adminKey) {
        throw new Error(
            "SUPABASE_SECRET_KEY ou SUPABASE_SERVICE_ROLE_KEY não configurada."
        );
    }

    return createClient(
        supabaseUrl,
        adminKey,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );
}