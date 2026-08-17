import type {
    EmailOtpType,
} from "@supabase/supabase-js";

import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    createClient,
} from "@/lib/supabase/server";

function safeNextPath(
    value: string | null
) {
    if (
        !value ||
        !value.startsWith("/") ||
        value.startsWith("//")
    ) {
        return "/primeiro-acesso";
    }

    return value;
}

export async function GET(
    request: NextRequest
) {
    const {
        searchParams,
    } =
        new URL(
            request.url
        );

    const tokenHash =
        searchParams.get(
            "token_hash"
        );

    const type =
        searchParams.get(
            "type"
        ) as
        | EmailOtpType
        | null;

    const next =
        safeNextPath(
            searchParams.get(
                "next"
            )
        );

    const redirectUrl =
        request.nextUrl.clone();

    redirectUrl.pathname =
        next;

    redirectUrl.search = "";

    if (
        tokenHash &&
        type
    ) {
        const supabase =
            await createClient();

        const {
            error,
        } =
            await supabase.auth
                .verifyOtp({
                    type,
                    token_hash:
                        tokenHash,
                });

        if (!error) {
            return NextResponse.redirect(
                redirectUrl
            );
        }

        console.error(
            "Erro ao confirmar convite:",
            error
        );
    }

    const errorUrl =
        request.nextUrl.clone();

    errorUrl.pathname =
        "/login";

    errorUrl.searchParams.set(
        "error",
        "invalid_invite"
    );

    return NextResponse.redirect(
        errorUrl
    );
}