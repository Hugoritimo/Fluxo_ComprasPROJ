import type {
  ReactNode,
} from "react";

import SystemRouteTransition from "@/components/ui/system-route-transition";

// ============================================================
// TEMPLATE GLOBAL DO SISTEMA
// ============================================================
//
// IMPORTANTE:
//
// O template é recriado nas mudanças de rota.
//
// Por isso ele NÃO deve conter:
// - Sidebar
// - Topbar
// - consultas Supabase
// - estado persistente
//
// Tudo isso pertence ao layout.tsx.
//
// O template fica responsável somente por:
// - espaçamento abaixo da Topbar;
// - background visual;
// - animação da página atual.
// ============================================================

export default function SystemTemplate({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen pt-[72px]">
      {/* =====================================================
          BACKGROUND AMBIENTAL
      ====================================================== */}

      <SystemBackground />

      {/* =====================================================
          CONTEÚDO DA ROTA
      ====================================================== */}

      <div className="relative z-10 min-h-[calc(100vh-72px)]">
        <SystemRouteTransition>
          {children}
        </SystemRouteTransition>
      </div>
    </div>
  );
}

// ============================================================
// BACKGROUND GLOBAL
// ============================================================

function SystemBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 left-0 right-0 top-[72px] z-0 overflow-hidden lg:left-[272px]"
    >
      {/* BASE */}

      <div className="absolute inset-0 bg-[#F6F6F7]" />

      {/* GLOW SUPERIOR */}

      <div className="absolute -top-40 left-[8%] h-[420px] w-[420px] rounded-full bg-[#AF1B1B]/[0.028] blur-[110px]" />

      {/* GLOW CENTRAL */}

      <div className="absolute left-[55%] top-[18%] h-[360px] w-[360px] rounded-full bg-slate-400/[0.025] blur-[120px]" />

      {/* GLOW INFERIOR */}

      <div className="absolute -bottom-40 right-[5%] h-[420px] w-[420px] rounded-full bg-[#AF1B1B]/[0.018] blur-[120px]" />

      {/* GRID MUITO SUTIL */}

      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(23,23,23,0.025) 1px, transparent 1px), linear-gradient(to bottom, rgba(23,23,23,0.025) 1px, transparent 1px)",

          backgroundSize:
            "32px 32px",

          maskImage:
            "linear-gradient(to bottom, black, transparent 75%)",

          WebkitMaskImage:
            "linear-gradient(to bottom, black, transparent 75%)",
        }}
      />

      {/* LUZ SUPERIOR */}

      <div className="absolute left-1/2 top-0 h-px w-[70%] -translate-x-1/2 bg-gradient-to-r from-transparent via-white to-transparent" />
    </div>
  );
}