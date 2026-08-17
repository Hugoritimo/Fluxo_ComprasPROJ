"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type LoginState = {
    error: string | null;
};

export async function login(
    _previousState: LoginState,
    formData: FormData
): Promise<LoginState> {
    const email = String(formData.get("email") ?? "")
        .trim()
        .toLowerCase();

    const password = String(formData.get("password") ?? "");

    if (!email) {
        return {
            error: "Informe seu e-mail.",
        };
    }

    if (!password) {
        return {
            error: "Informe sua senha.",
        };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return {
            error: "E-mail ou senha inválidos.",
        };
    }

    revalidatePath("/", "layout");

    redirect("/dashboard");
}