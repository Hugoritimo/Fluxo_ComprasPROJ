"use client";

import {
    createBrowserClient,
} from "@supabase/ssr";

export function createClient() {
    const supabaseUrl =
        process.env
            .NEXT_PUBLIC_SUPABASE_URL;

    const publishableKey =
        process.env
            .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!supabaseUrl) {
        throw new Error(
            "NEXT_PUBLIC_SUPABASE_URL não configurada."
        );
    }

    if (!publishableKey) {
        throw new Error(
            "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY não configurada."
        );
    }

    return createBrowserClient(
        supabaseUrl,
        publishableKey
    );
}