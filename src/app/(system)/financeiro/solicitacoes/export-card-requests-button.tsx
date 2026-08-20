import {
  Download,
  FileSpreadsheet,
} from "lucide-react";

export default function ExportCardRequestsButton() {
  return (
    <a
      href="/api/financeiro/cartoes/exportar"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-100"
    >
      <FileSpreadsheet
        size={18}
      />

      Exportar Excel

      <Download
        size={16}
      />
    </a>
  );
}