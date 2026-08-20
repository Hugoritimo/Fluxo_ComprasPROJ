import {
    createServerClient,
} from "@supabase/ssr";

import {
    NextResponse,
    type NextRequest,
} from "next/server";

export async function updateSession(
    request: NextRequest
) {
    let supabaseResponse =
        NextResponse.next({
            request,
        });

    const supabase =
        createServerClient(
            process.env
                .NEXT_PUBLIC_SUPABASE_URL!,
            process.env
                .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },

                    setAll(
                        cookiesToSet
                    ) {
                        cookiesToSet.forEach(
                            ({
                                name,
                                value,
                            }) => {
                                request.cookies.set(
                                    name,
                                    value
                                );
                            }
                        );

                        supabaseResponse =
                            NextResponse.next({
                                request,
                            });

                        cookiesToSet.forEach(
                            ({
                                name,
                                value,
                                options,
                            }) => {
                                supabaseResponse.cookies.set(
                                    name,
                                    value,
                                    options
                                );
                            }
                        );
                    },
                },
            }
        );

    // ==========================================================
    // ROTAS PÚBLICAS
    // ==========================================================

    const pathname =
        request.nextUrl.pathname;

    const isLoginRoute =
        pathname === "/login";

    const isAuthRoute =
        pathname === "/auth" ||
        pathname.startsWith(
            "/auth/"
        );

    const isExternalFormRoute =
        pathname ===
        "/formularios" ||
        pathname.startsWith(
            "/formularios/"
        );

    // ==========================================================
    // FORMULÁRIOS EXTERNOS
    //
    // Não exigem login.
    // Ainda deixamos o Supabase sincronizar cookies normalmente.
    // ==========================================================

    if (
        isExternalFormRoute
    ) {
        return supabaseResponse;
    }

    // ==========================================================
    // AUTENTICAÇÃO
    // ==========================================================

    const {
        data: claimsData,
    } =
        await supabase.auth.getClaims();

    const userId =
        claimsData?.claims?.sub;

    // ==========================================================
    // USUÁRIO NÃO AUTENTICADO
    // ==========================================================

    if (
        !userId &&
        !isLoginRoute &&
        !isAuthRoute
    ) {
        const url =
            request.nextUrl.clone();

        url.pathname =
            "/login";

        return NextResponse.redirect(
            url
        );
    }

    // ==========================================================
    // USUÁRIO AUTENTICADO TENTANDO VOLTAR AO LOGIN
    // ==========================================================

    if (
        userId &&
        isLoginRoute
    ) {
        const url =
            request.nextUrl.clone();

        url.pathname =
            "/dashboard";

        return NextResponse.redirect(
            url
        );
    }

    return supabaseResponse;
}