export default function ExternalFormsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#AF1B1B] text-sm font-black text-white">
            P
          </div>

          <div>
            <p className="text-sm font-bold text-slate-950">
              Projeta
            </p>

            <p className="text-xs text-slate-500">
              Solicitações de Compras
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl px-4 py-7 sm:px-6 sm:py-10">
        {children}
      </main>

      <footer className="mx-auto max-w-4xl px-4 pb-8 text-center text-[11px] text-slate-400 sm:px-6">
        Projeta Consultoria e Serviços
      </footer>
    </div>
  );
}