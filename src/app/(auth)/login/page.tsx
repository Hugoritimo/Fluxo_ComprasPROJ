import { createClient } from "@/lib/supabase/server";
import { BarChart3, CreditCard, FileCheck2, ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";

import LoginForm from "./login-form";

export default async function LoginPage() {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();

  if (data?.claims?.sub) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen bg-slate-50 lg:grid lg:grid-cols-2">
      <section className="relative hidden overflow-hidden bg-[#171717] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-20 -top-32 h-96 w-96 rounded-full bg-[#AF1B1B]/25 blur-3xl" />

        <div className="absolute -bottom-40 -right-32 h-[30rem] w-[30rem] rounded-full bg-[#AF1B1B]/15 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#AF1B1B] font-bold">
            P
          </div>

          <div>
            <p className="font-semibold tracking-wide">
              PROJETA
            </p>

            <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
              Compras
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <p className="mb-4 text-sm font-medium text-[#e25c5c]">
            Portal Corporativo
          </p>

          <h1 className="text-4xl font-semibold leading-tight tracking-tight">
            Gestão de compras e cartões em um único lugar.
          </h1>

          <p className="mt-5 max-w-lg leading-7 text-white/50">
            Solicite, acompanhe e gerencie pedidos de compra,
            cartões corporativos e aprovações.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3">
            <Feature
              icon={FileCheck2}
              title="Pedidos de Compra"
            />

            <Feature
              icon={CreditCard}
              title="Cartões"
            />

            <Feature
              icon={ShieldCheck}
              title="Aprovações"
            />

            <Feature
              icon={BarChart3}
              title="Dashboard"
            />
          </div>
        </div>

        <p className="relative z-10 text-xs text-white/30">
          Sistema interno Projeta
        </p>
      </section>

      <section className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#AF1B1B] font-bold text-white">
              P
            </div>

            <div>
              <p className="font-semibold text-slate-900">
                PROJETA
              </p>

              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                Compras
              </p>
            </div>
          </div>

          <div className="mb-8">
            <p className="text-sm font-semibold text-[#AF1B1B]">
              Bem-vindo
            </p>

            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Acesse sua conta
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Utilize suas credenciais para acessar o
              sistema.
            </p>
          </div>

          <LoginForm />

          <div className="mt-8 flex gap-3 rounded-xl border border-slate-200 bg-white p-4">
            <ShieldCheck
              size={20}
              className="mt-0.5 shrink-0 text-slate-400"
            />

            <p className="text-xs leading-5 text-slate-500">
              Acesso restrito aos colaboradores autorizados.
              As movimentações realizadas no sistema poderão
              ser registradas para auditoria.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
        <Icon size={18} />
      </div>

      <span className="text-sm font-medium text-white/75">
        {title}
      </span>
    </div>
  );
}