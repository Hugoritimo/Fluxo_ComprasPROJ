"use client";

import {
  useRef,
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  LoaderCircle,
  RefreshCw,
  Upload,
  UserRoundX,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  importSiengeFile,
  previewSiengeFile,
  type SiengePreviewResult,
} from "./actions";

export default function SiengeImportForm() {
  const router =
    useRouter();

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    file,
    setFile,
  ] =
    useState<File | null>(
      null
    );

  const [
    preview,
    setPreview,
  ] =
    useState<
      NonNullable<
        SiengePreviewResult["preview"]
      > | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null
    );

  const [
    success,
    setSuccess,
  ] =
    useState<string | null>(
      null
    );

  const [
    pending,
    startTransition,
  ] =
    useTransition();

  // ==========================================================
  // SELEÇÃO
  // ==========================================================

  function handleFileChange(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      event.target.files?.[0] ??
      null;

    setFile(
      selected
    );

    setPreview(
      null
    );

    setError(
      null
    );

    setSuccess(
      null
    );
  }

  // ==========================================================
  // ANALISAR
  // ==========================================================

  function analyzeFile() {
    if (!file) {
      setError(
        "Selecione o arquivo Excel do Sienge."
      );

      return;
    }

    setError(
      null
    );

    setSuccess(
      null
    );

    startTransition(
      async () => {
        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );

        const result =
          await previewSiengeFile(
            formData
          );

        if (
          !result.success ||
          !result.preview
        ) {
          setError(
            result.error ??
              "Não foi possível analisar o arquivo."
          );

          return;
        }

        setPreview(
          result.preview
        );
      }
    );
  }

  // ==========================================================
  // CONFIRMAR
  // ==========================================================

  function confirmImport() {
    if (
      !file ||
      !preview
    ) {
      return;
    }

    setError(
      null
    );

    setSuccess(
      null
    );

    startTransition(
      async () => {
        const formData =
          new FormData();

        formData.append(
          "file",
          file
        );

        const result =
          await importSiengeFile(
            formData
          );

        if (
          !result.success ||
          !result.result
        ) {
          setError(
            result.error ??
              "Não foi possível importar o arquivo."
          );

          return;
        }

        const imported =
          result.result;

        setSuccess(
          `${imported.total} linhas processadas: ${imported.inserted} novas, ${imported.updated} atualizadas e ${imported.unchanged} sem alteração.`
        );

        setPreview(
          null
        );

        setFile(
          null
        );

        if (
          fileInputRef.current
        ) {
          fileInputRef.current.value =
            "";
        }

        router.refresh();
      }
    );
  }

  // ==========================================================
  // RESET
  // ==========================================================

  function reset() {
    setFile(
      null
    );

    setPreview(
      null
    );

    setError(
      null
    );

    setSuccess(
      null
    );

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }

  return (
    <div className="space-y-5">
      {/* ERRO */}

      {error && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-semibold">
              Não foi possível continuar
            </p>

            <p className="mt-1 text-xs">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* SUCESSO */}

      {success && (
        <div className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2
            size={18}
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-semibold">
              Importação concluída
            </p>

            <p className="mt-1 text-xs">
              {success}
            </p>
          </div>
        </div>
      )}

      {/* UPLOAD */}

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#AF1B1B] shadow-sm">
              <FileSpreadsheet
                size={22}
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Arquivo do Sienge
              </p>

              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                Selecione a exportação ou a máscara de acompanhamento em formato XLSX.
              </p>

              {file && (
                <p className="mt-2 text-xs font-semibold text-[#AF1B1B]">
                  {file.name}
                </p>
              )}
            </div>
          </div>

          <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50">
            <Upload
              size={17}
            />

            Selecionar arquivo

            <input
              ref={
                fileInputRef
              }
              type="file"
              accept=".xlsx,.xlsm"
              onChange={
                handleFileChange
              }
              disabled={
                pending
              }
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* AÇÃO DE ANÁLISE */}

      {!preview && (
        <button
          type="button"
          onClick={
            analyzeFile
          }
          disabled={
            !file ||
            pending
          }
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white transition hover:bg-[#921717] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle
              size={17}
              className="animate-spin"
            />
          ) : (
            <FileSpreadsheet
              size={17}
            />
          )}

          Analisar arquivo
        </button>
      )}

      {/* =====================================================
          PRÉVIA
      ====================================================== */}

      {preview && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[#AF1B1B]">
                  Prévia da importação
                </p>

                <h3 className="mt-1 font-semibold text-slate-950">
                  Arquivo reconhecido
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  Aba utilizada:{" "}
                  <strong>
                    {preview.sheetName}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={
                  reset
                }
                disabled={
                  pending
                }
                className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                <RefreshCw
                  size={14}
                />

                Trocar arquivo
              </button>
            </div>

            {/* INDICADORES */}

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <PreviewMetric
                label="Linhas válidas"
                value={
                  preview.totalRows
                }
              />

              <PreviewMetric
                label="Solicitações SC"
                value={
                  preview.uniqueRequests
                }
              />

              <PreviewMetric
                label="Solicitantes"
                value={
                  preview.uniqueUsers
                }
              />

              <PreviewMetric
                label="Não vinculados"
                value={
                  preview.unmatchedUsers.length
                }
                attention={
                  preview.unmatchedUsers.length >
                  0
                }
              />
            </div>
          </div>

          {/* USUÁRIOS NÃO VINCULADOS */}

          {preview.unmatchedUsers.length >
            0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex gap-3">
                <UserRoundX
                  size={19}
                  className="mt-0.5 shrink-0 text-amber-700"
                />

                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Usuários do Sienge ainda não vinculados
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    A importação pode continuar. Esses pedidos ficarão aguardando vínculo com o usuário do sistema.
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {preview.unmatchedUsers.map(
                      (
                        username
                      ) => (
                        <span
                          key={
                            username
                          }
                          className="rounded-lg border border-amber-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-amber-800"
                        >
                          {username}
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AMOSTRA */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-semibold text-slate-900">
                Amostra dos dados
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Exibindo até 8 linhas do arquivo.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[1000px] w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">
                      SC
                    </th>

                    <th className="px-4 py-3">
                      Solicitante
                    </th>

                    <th className="px-4 py-3">
                      Insumo
                    </th>

                    <th className="px-4 py-3">
                      Status
                    </th>

                    <th className="px-4 py-3">
                      Pedido
                    </th>

                    <th className="px-4 py-3">
                      Fornecedor
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {preview.sample.map(
                    (
                      row
                    ) => (
                      <tr
                        key={
                          `${row.source_key}-${row.source_row}`
                        }
                        className="text-xs text-slate-600"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#AF1B1B]">
                          {row.sc_number}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {row.requester_sienge_username ??
                            "-"}
                        </td>

                        <td className="max-w-[420px] px-4 py-3">
                          {row.insumo}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {row.supply_status ??
                            "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {row.order_number ??
                            "-"}
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {row.supplier_name ??
                            "-"}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* CONFIRMAÇÃO */}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={
                reset
              }
              disabled={
                pending
              }
              className="h-11 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={
                confirmImport
              }
              disabled={
                pending
              }
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-5 text-sm font-semibold text-white transition hover:bg-[#921717] disabled:opacity-50"
            >
              {pending ? (
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2
                  size={17}
                />
              )}

              Confirmar importação
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MÉTRICA
// ============================================================

function PreviewMetric({
  label,
  value,
  attention = false,
}: {
  label: string;
  value: number;
  attention?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-4",
        attention
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-slate-50",
      ].join(" ")}
    >
      <p
        className={[
          "text-2xl font-semibold",
          attention
            ? "text-amber-800"
            : "text-slate-950",
        ].join(" ")}
      >
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {label}
      </p>
    </div>
  );
}