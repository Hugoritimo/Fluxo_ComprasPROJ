"use client";

import {
  useRef,
  useState,
  useTransition,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  FileSpreadsheet,
  Link2,
  LoaderCircle,
  RefreshCw,
  TriangleAlert,
  Upload,
  UserRoundX,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  importSiengeFile,
  previewSiengeFile,
  type SiengeImportResult,
  type SiengePreviewResult,
} from "./actions";

// ============================================================
// TIPOS
// ============================================================

type ImportResult =
  NonNullable<
    SiengeImportResult["result"]
  >;

// ============================================================
// COMPONENTE
// ============================================================

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
    >(
      null
    );

  const [
    importResult,
    setImportResult,
  ] =
    useState<ImportResult | null>(
      null
    );

  const [
    error,
    setError,
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
  // SELEÇÃO DE ARQUIVO
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

    setImportResult(
      null
    );

    setError(
      null
    );
  }

  // ==========================================================
  // ANALISAR
  // ==========================================================

  function analyzeFile() {
    if (
      !file
    ) {
      setError(
        "Selecione o arquivo Excel do Sienge."
      );

      return;
    }

    setError(
      null
    );

    setImportResult(
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
  // CONFIRMAR IMPORTAÇÃO
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

    setImportResult(
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

        setImportResult(
          result.result
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

    setImportResult(
      null
    );

    setError(
      null
    );

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        "";
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-5">
      {/* =====================================================
          ERRO
      ====================================================== */}

      {error && (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle
            size={
              18
            }
            className="mt-0.5 shrink-0"
          />

          <div>
            <p className="font-semibold">
              Não foi possível continuar
            </p>

            <p className="mt-1 text-xs leading-5">
              {error}
            </p>
          </div>
        </div>
      )}

      {/* =====================================================
          RESULTADO DA IMPORTAÇÃO
      ====================================================== */}

      {importResult && (
        <ImportSuccessPanel
          result={
            importResult
          }
        />
      )}

      {/* =====================================================
          UPLOAD
      ====================================================== */}

      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-[#AF1B1B] shadow-sm">
              <FileSpreadsheet
                size={
                  22
                }
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Arquivo do Sienge
              </p>

              <p className="mt-1 max-w-xl text-xs leading-5 text-slate-500">
                Selecione a exportação ou a máscara de
                acompanhamento em formato XLSX ou XLSM.
              </p>

              <p className="mt-2 max-w-2xl text-[11px] leading-5 text-slate-400">
                Após a importação, o sistema também verifica
                automaticamente se existem solicitações de cartão
                aguardando vínculo com uma SC do Sienge.
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
              size={
                17
              }
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

      {/* =====================================================
          AÇÃO DE ANÁLISE
      ====================================================== */}

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
              size={
                17
              }
              className="animate-spin"
            />
          ) : (
            <FileSpreadsheet
              size={
                17
              }
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
                    {
                      preview.sheetName
                    }
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
                  size={
                    14
                  }
                />

                Trocar arquivo
              </button>
            </div>

            {/* ===============================================
                INDICADORES DA PRÉVIA
            ================================================ */}

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

          {/* =================================================
              USUÁRIOS NÃO VINCULADOS
          ================================================== */}

          {preview.unmatchedUsers.length >
            0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex gap-3">
                <UserRoundX
                  size={
                    19
                  }
                  className="mt-0.5 shrink-0 text-amber-700"
                />

                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Usuários do Sienge ainda não vinculados
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    A importação pode continuar normalmente. As
                    solicitações desses usuários serão importadas,
                    mas não aparecerão em "Meus Pedidos" até que
                    o vínculo de usuário seja realizado.
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
                          {
                            username
                          }
                        </span>
                      )
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              AMOSTRA
          ================================================== */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <p className="text-sm font-semibold text-slate-900">
                Amostra dos dados
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Exibindo até 8 linhas do arquivo antes da
                confirmação.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left">
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
                        key={`${row.source_key}-${row.source_row}`}
                        className="text-xs text-slate-600"
                      >
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-[#AF1B1B]">
                          {
                            row.sc_number
                          }
                        </td>

                        <td className="whitespace-nowrap px-4 py-3">
                          {row.requester_sienge_username ??
                            "-"}
                        </td>

                        <td className="max-w-[420px] px-4 py-3">
                          {
                            row.insumo
                          }
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

          {/* =================================================
              CONFIRMAÇÃO
          ================================================== */}

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
                  size={
                    17
                  }
                  className="animate-spin"
                />
              ) : (
                <CheckCircle2
                  size={
                    17
                  }
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
// RESULTADO FINAL DA IMPORTAÇÃO
// ============================================================

function ImportSuccessPanel({
  result,
}: {
  result:
    ImportResult;
}) {
  const reconciliation =
    result.reconciliation;

  const hasReconciliationProblem =
    Boolean(
      reconciliation.error
    );

  const hasAttention =
    reconciliation.pending >
      0 ||
    reconciliation.conflicts >
      0 ||
    hasReconciliationProblem;

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
      {/* =====================================================
          CABEÇALHO
      ====================================================== */}

      <div className="flex gap-3 border-b border-emerald-100 bg-emerald-50 px-5 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
          <CheckCircle2
            size={
              20
            }
          />
        </div>

        <div>
          <p className="text-sm font-semibold text-emerald-900">
            Importação concluída
          </p>

          <p className="mt-1 text-xs leading-5 text-emerald-700">
            A máscara do Sienge foi processada com sucesso. A
            conciliação com as solicitações de cartão também foi
            executada automaticamente.
          </p>
        </div>
      </div>

      {/* =====================================================
          RESULTADO DA MÁSCARA
      ====================================================== */}

      <div className="p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Resultado da importação
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ResultMetric
              label="Linhas processadas"
              value={
                result.total
              }
            />

            <ResultMetric
              label="Novas"
              value={
                result.inserted
              }
            />

            <ResultMetric
              label="Atualizadas"
              value={
                result.updated
              }
            />

            <ResultMetric
              label="Sem alteração"
              value={
                result.unchanged
              }
            />
          </div>
        </div>

        {/* ===================================================
            USUÁRIOS NÃO VINCULADOS
        ==================================================== */}

        {result.unmatchedUsers >
          0 && (
          <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <UserRoundX
              size={
                18
              }
              className="mt-0.5 shrink-0 text-amber-700"
            />

            <div>
              <p className="text-xs font-semibold text-amber-900">
                {result.unmatchedUsers} usuário
                {result.unmatchedUsers ===
                1
                  ? ""
                  : "s"}{" "}
                do Sienge ainda sem vínculo
              </p>

              <p className="mt-1 text-[11px] leading-5 text-amber-800">
                Os dados foram importados, mas esses usuários
                precisam ser associados aos respectivos perfis do
                Projeta Compras.
              </p>
            </div>
          </div>
        )}

        {/* ===================================================
            CONCILIAÇÃO CARTÃO x SIENGE
        ==================================================== */}

        <div className="mt-6 border-t border-slate-100 pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Link2
                  size={
                    17
                  }
                  className="text-[#AF1B1B]"
                />

                <h3 className="text-sm font-semibold text-slate-950">
                  Conciliação Cartão × Sienge
                </h3>
              </div>

              <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">
                O sistema verificou automaticamente as solicitações
                de cartão que possuem número Sienge informado.
              </p>
            </div>

            {hasAttention ? (
              <span className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700">
                Requer atenção
              </span>
            ) : (
              <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700">
                Sem pendências
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReconciliationMetric
              icon={
                Link2
              }
              label="Verificados"
              value={
                reconciliation.checked
              }
              description="Solicitações analisadas"
              tone="neutral"
            />

            <ReconciliationMetric
              icon={
                CheckCircle2
              }
              label="Vinculados"
              value={
                reconciliation.linked
              }
              description="Vínculo confirmado"
              tone="success"
            />

            <ReconciliationMetric
              icon={
                Clock3
              }
              label="Aguardando"
              value={
                reconciliation.pending
              }
              description="SC ainda não localizada"
              tone={
                reconciliation.pending >
                0
                  ? "warning"
                  : "neutral"
              }
            />

            <ReconciliationMetric
              icon={
                TriangleAlert
              }
              label="Revisar"
              value={
                reconciliation.conflicts
              }
              description="Conflitos encontrados"
              tone={
                reconciliation.conflicts >
                0
                  ? "danger"
                  : "neutral"
              }
            />
          </div>

          {/* =================================================
              EXPLICAÇÃO DIDÁTICA
          ================================================== */}

          {reconciliation.checked ===
            0 &&
            !hasReconciliationProblem && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-700">
                  Nenhuma solicitação de cartão precisava ser
                  conciliada nesta importação.
                </p>

                <p className="mt-1 text-[11px] leading-5 text-slate-500">
                  Isso acontece quando não existem cartões com
                  número Sienge pendente de vínculo.
                </p>
              </div>
            )}

          {reconciliation.pending >
            0 && (
            <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <Clock3
                size={
                  17
                }
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>
                <p className="text-xs font-semibold text-amber-900">
                  Existem vínculos aguardando uma próxima
                  importação
                </p>

                <p className="mt-1 text-[11px] leading-5 text-amber-800">
                  O número Sienge já foi informado na devolução do
                  cartão, mas a SC correspondente ainda não foi
                  localizada nos dados importados. Nenhuma ação
                  manual é necessária agora.
                </p>
              </div>
            </div>
          )}

          {reconciliation.conflicts >
            0 && (
            <div className="mt-4 flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <TriangleAlert
                size={
                  17
                }
                className="mt-0.5 shrink-0 text-red-700"
              />

              <div>
                <p className="text-xs font-semibold text-red-900">
                  Existem vínculos que precisam de revisão
                </p>

                <p className="mt-1 text-[11px] leading-5 text-red-700">
                  O sistema encontrou a SC, mas não conseguiu
                  confirmar o vínculo de forma segura. Esses casos
                  aparecerão na área de conciliação do Financeiro.
                </p>
              </div>
            </div>
          )}

          {reconciliation.error && (
            <div className="mt-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <AlertCircle
                size={
                  17
                }
                className="mt-0.5 shrink-0 text-amber-700"
              />

              <div>
                <p className="text-xs font-semibold text-amber-900">
                  Importação concluída, mas a conciliação encontrou
                  um problema
                </p>

                <p className="mt-1 text-[11px] leading-5 text-amber-800">
                  {
                    reconciliation.error
                  }
                </p>

                <p className="mt-2 text-[10px] leading-4 text-amber-700">
                  Os dados do Sienge foram importados normalmente.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================================
// MÉTRICA DA PRÉVIA
// ============================================================

function PreviewMetric({
  label,
  value,
  attention = false,
}: {
  label:
    string;

  value:
    number;

  attention?:
    boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-4",
        attention
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-slate-50",
      ].join(
        " "
      )}
    >
      <p
        className={[
          "text-2xl font-semibold",
          attention
            ? "text-amber-800"
            : "text-slate-950",
        ].join(
          " "
        )}
      >
        {
          value
        }
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {
          label
        }
      </p>
    </div>
  );
}

// ============================================================
// MÉTRICA DO RESULTADO
// ============================================================

function ResultMetric({
  label,
  value,
}: {
  label:
    string;

  value:
    number;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-2xl font-semibold text-slate-950">
        {
          value
        }
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {
          label
        }
      </p>
    </div>
  );
}

// ============================================================
// MÉTRICA DE CONCILIAÇÃO
// ============================================================

function ReconciliationMetric({
  icon:
    Icon,
  label,
  value,
  description,
  tone,
}: {
  icon:
    typeof Link2;

  label:
    string;

  value:
    number;

  description:
    string;

  tone:
    | "neutral"
    | "success"
    | "warning"
    | "danger";
}) {
  const styles =
    tone ===
    "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone ===
          "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : tone ===
            "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <div
      className={[
        "rounded-xl border p-4",
        styles,
      ].join(
        " "
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <Icon
          size={
            17
          }
          className="opacity-70"
        />

        <p className="text-2xl font-semibold">
          {
            value
          }
        </p>
      </div>

      <p className="mt-3 text-xs font-semibold">
        {
          label
        }
      </p>

      <p className="mt-1 text-[10px] opacity-70">
        {
          description
        }
      </p>
    </div>
  );
}