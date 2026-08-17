import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
    const cookieStore =
        await cookies();

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

    return createServerClient(
        supabaseUrl,
        publishableKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },

                setAll(
                    cookiesToSet
                ) {
                    try {
                        cookiesToSet.forEach(
                            ({
                                name,
                                value,
                                options,
                            }) => {
                                cookieStore.set(
                                    name,
                                    value,
                                    options
                                );
                            }
                        );
                    } catch {
                        /*
                         * setAll pode ser chamado dentro de um
                         * Server Component, onde cookies não podem
                         * ser alterados diretamente.
                         *
                         * O proxy é responsável por atualizar
                         * a sessão nesses casos.
                         */
                    }
                },
            },
        }
    );
}