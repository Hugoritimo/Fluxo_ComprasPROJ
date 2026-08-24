"use client";

import Link from "next/link";

import {
  CreditCard,
  FileSpreadsheet,
  ListTodo,
  PackageSearch,
  Plus,
  Send,
  UsersRound,
} from "lucide-react";

type QuickActionsMenuProps = {
  canFinance: boolean;
  canAdmin: boolean;
};

export default function QuickActionsMenu({
  canFinance,
  canAdmin,
}: QuickActionsMenuProps) {
  return (
    <div className="dropdown dropdown-end">
      <button
        type="button"
        tabIndex={0}
        title="Ações rápidas"
        className="group flex h-10 items-center gap-2 rounded-xl bg-[#171717] px-3 text-[10px] font-semibold text-white shadow-sm transition hover:-translate-y-px hover:bg-black hover:shadow-md"
      >
        <Plus
          size={15}
          className="transition group-hover:rotate-90"
        />

        <span className="hidden lg:inline">
          Criar
        </span>
      </button>

      <div
        tabIndex={0}
        className="dropdown-content z-[120] mt-3 w-[280px] rounded-[20px] border border-base-300 bg-base-100 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.14)]"
      >
        <p className="px-3 pb-2 pt-2 text-[8px] font-bold uppercase tracking-[0.18em] text-base-content/25">
          Ações rápidas
        </p>

        <QuickLink
          href="/solicitacoes/nova"
          icon={
            <Send
              size={16}
            />
          }
          title="Nova solicitação"
          description="Solicitar cartão corporativo"
          primary
        />

        <QuickLink
          href="/meus-pedidos"
          icon={
            <PackageSearch
              size={16}
            />
          }
          title="Meus pedidos"
          description="Consultar pedidos do Sienge"
        />

        <QuickLink
          href="/pendencias"
          icon={
            <ListTodo
              size={16}
            />
          }
          title="Pendências"
          description="Ver o que precisa de atenção"
        />

        {canFinance && (
          <>
            <div className="my-2 border-t border-base-300" />

            <p className="px-3 pb-2 pt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-base-content/25">
              Financeiro
            </p>

            <QuickLink
              href="/financeiro/solicitacoes"
              icon={
                <CreditCard
                  size={16}
                />
              }
              title="Gerenciar solicitações"
              description="Acessar fila financeira"
            />

            <QuickLink
              href="/financeiro/sienge"
              icon={
                <FileSpreadsheet
                  size={16}
                />
              }
              title="Sienge"
              description="Importar e acompanhar pedidos"
            />
          </>
        )}

        {canAdmin && (
          <>
            <div className="my-2 border-t border-base-300" />

            <QuickLink
              href="/administracao/usuarios"
              icon={
                <UsersRound
                  size={16}
                />
              }
              title="Usuários"
              description="Gerenciar contas e acessos"
            />
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// LINK
// ============================================================

function QuickLink({
  href,
  icon,
  title,
  description,
  primary = false,
}: {
  href: string;

  icon: React.ReactNode;

  title: string;

  description: string;

  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "group flex items-center gap-3 rounded-[13px] p-3 transition",
        primary
          ? "bg-primary/[0.055] hover:bg-primary/[0.09]"
          : "hover:bg-base-200",
      ].join(
        " "
      )}
    >
      <div
        className={[
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition",
          primary
            ? "bg-primary text-primary-content shadow-sm"
            : "bg-base-200 text-base-content/45 group-hover:bg-base-100 group-hover:text-primary",
        ].join(
          " "
        )}
      >
        {
          icon
        }
      </div>

      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-base-content/75">
          {
            title
          }
        </p>

        <p className="mt-0.5 text-[9px] text-base-content/35">
          {
            description
          }
        </p>
      </div>
    </Link>
  );
}