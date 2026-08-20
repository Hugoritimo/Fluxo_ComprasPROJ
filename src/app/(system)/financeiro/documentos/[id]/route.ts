import {
    NextRequest,
    NextResponse,
} from "next/server";

import {
    createClient,
} from "@/lib/supabase/server";

type RouteProps = {
    params: Promise<{
        id: string;
    }>;
};

export async function GET(
    request: NextRequest,
    {
        params,
    }: RouteProps
) {
    const {
        id,
    } = await params;

    const supabase =
        await createClient();

    // =========================================================
    // AUTENTICAÇÃO
    // =========================================================

    const {
        data: claimsData,
    } =
        await supabase.auth.getClaims();

    const userId =
        claimsData?.claims?.sub;

    if (!userId) {
        const loginUrl =
            new URL(
                "/login",
                request.url
            );

        return NextResponse.redirect(
            loginUrl
        );
    }

    // =========================================================
    // PERMISSÃO
    // =========================================================

    const {
        data: roleRows,
    } =
        await supabase
            .from(
                "user_roles"
            )
            .select(
                "role"
            )
            .eq(
                "user_id",
                userId
            );

    const roles =
        (
            roleRows ?? []
        ).map(
            (row) =>
                row.role
        );

    const canView =
        roles.includes(
            "finance"
        ) ||
        roles.includes(
            "admin"
        ) ||
        roles.includes(
            "superadmin"
        );

    if (!canView) {
        return NextResponse.json(
            {
                error:
                    "Você não possui permissão para visualizar este documento.",
            },
            {
                status: 403,
            }
        );
    }

    // =========================================================
    // DOCUMENTO
    // =========================================================

    const {
        data: attachment,
        error,
    } =
        await supabase
            .from(
                "attachments"
            )
            .select(
                `
        id,
        card_request_id,
        file_name,
        storage_path,
        category,
        mime_type
        `
            )
            .eq(
                "id",
                id
            )
            .single();

    if (
        error ||
        !attachment
    ) {
        return NextResponse.json(
            {
                error:
                    "Documento não encontrado.",
            },
            {
                status: 404,
            }
        );
    }

    // =========================================================
    // LINK TEMPORÁRIO
    //
    // O Excel aponta para esta rota.
    // Somente aqui geramos o link real do Supabase.
    // =========================================================

    const {
        data: signedData,
        error: signedError,
    } =
        await supabase.storage
            .from(
                "card-documents"
            )
            .createSignedUrl(
                attachment.storage_path,
                300
            );

    if (
        signedError ||
        !signedData?.signedUrl
    ) {
        console.error(
            "Erro ao gerar URL do documento:",
            signedError
        );

        return NextResponse.json(
            {
                error:
                    "Não foi possível abrir o documento.",
            },
            {
                status: 500,
            }
        );
    }

    return NextResponse.redirect(
        signedData.signedUrl
    );
}