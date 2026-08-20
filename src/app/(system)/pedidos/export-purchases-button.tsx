import {
  Download,
  FileSpreadsheet,
} from "lucide-react";

export default function ExportPurchasesButton() {
  return (
    <a
      href="/api/pedidos/exportar"
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#921717]"
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