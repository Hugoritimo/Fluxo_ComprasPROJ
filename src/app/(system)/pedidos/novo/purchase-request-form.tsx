"use client";

import {
  useActionState,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  CalendarDays,
  CircleDollarSign,
  FileText,
  LoaderCircle,
  Plus,
  Save,
  Send,
  Trash2,
} from "lucide-react";

import {
  createPurchaseRequest,
  type PurchaseRequestState,
} from "../actions";

type Option = {
  id: string;
  name: string;
};

type CostCenterOption = {
  id: string;
  name: string;
  code: string | null;
};

type PurchaseItem = {
  id: string;
  description: string;
  quantity: string;
  unit: string;
  estimated_unit_price: string;
  notes: string;
};

type PurchaseRequestFormProps = {
  companies: Option[];
  departments: Option[];
  projects: Option[];
  costCenters: CostCenterOption[];

  defaults: {
    companyId?: string | null;
    departmentId?: string | null;
  };
};

const initialState: PurchaseRequestState = {
  error: null,
};

function createEmptyItem(): PurchaseItem {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unit: "UN",
    estimated_unit_price: "0",
    notes: "",
  };
}

function parseNumber(value: string) {
  const normalized = value
    .replace(/\s/g, "")
    .replace(",", ".");

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function PurchaseRequestForm({
  companies,
  departments,
  projects,
  costCenters,
  defaults,
}: PurchaseRequestFormProps) {
  const [state, formAction, pending] =
    useActionState(
      createPurchaseRequest,
      initialState
    );

  const [items, setItems] = useState<
    PurchaseItem[]
  >([createEmptyItem()]);

  function updateItem(
    id: string,
    field: keyof PurchaseItem,
    value: string
  ) {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function addItem() {
    setItems((current) => [
      ...current,
      createEmptyItem(),
    ]);
  }

  function removeItem(id: string) {
    setItems((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter(
        (item) => item.id !== id
      );
    });
  }

  const estimatedTotal = useMemo(() => {
    return items.reduce((total, item) => {
      const quantity = parseNumber(
        item.quantity
      );

      const unitPrice = parseNumber(
        item.estimated_unit_price
      );

      return total + quantity * unitPrice;
    }, 0);
  }, [items]);

  const serializedItems = JSON.stringify(
    items.map((item) => ({
      description: item.description.trim(),
      quantity: parseNumber(
        item.quantity
      ),
      unit: item.unit.trim(),
      estimated_unit_price: parseNumber(
        item.estimated_unit_price
      ),
      notes: item.notes.trim(),
    }))
  );

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="items"
        value={serializedItems}
        readOnly
      />

      {state.error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle
            size={19}
            className="mt-0.5 shrink-0"
          />

          <p>{state.error}</p>
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <FileText size={19} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-950">
                Informações do pedido
              </h2>

              <p className="mt-0.5 text-xs text-slate-500">
                Informe os dados gerais da
                solicitação.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 p-6 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Título do pedido *
            </label>

            <input
              name="title"
              required
              disabled={pending}
              placeholder="Ex.: Aquisição de monitores para equipe técnica"
              className="h-11 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Empresa
            </label>

            <select
              name="company_id"
              defaultValue={
                defaults.companyId ?? ""
              }
              disabled={pending}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
            >
              <option value="">
                Não informado
              </option>

              {companies.map((company) => (
                <option
                  key={company.id}
                  value={company.id}
                >
                  {company.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Departamento
            </label>

            <select
              name="department_id"
              defaultValue={
                defaults.departmentId ?? ""
              }
              disabled={pending}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
            >
              <option value="">
                Não informado
              </option>

              {departments.map(
                (department) => (
                  <option
                    key={department.id}
                    value={department.id}
                  >
                    {department.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Projeto / Contrato
            </label>

            <select
              name="project_id"
              disabled={pending}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
            >
              <option value="">
                Não informado
              </option>

              {projects.map((project) => (
                <option
                  key={project.id}
                  value={project.id}
                >
                  {project.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Centro de custo
            </label>

            <select
              name="cost_center_id"
              disabled={pending}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
            >
              <option value="">
                Não informado
              </option>

              {costCenters.map(
                (costCenter) => (
                  <option
                    key={costCenter.id}
                    value={costCenter.id}
                  >
                    {costCenter.code
                      ? `${costCenter.code} - ${costCenter.name}`
                      : costCenter.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Prioridade *
            </label>

            <select
              name="priority"
              defaultValue="normal"
              required
              disabled={pending}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
            >
              <option value="low">
                Baixa
              </option>

              <option value="normal">
                Normal
              </option>

              <option value="high">
                Alta
              </option>

              <option value="urgent">
                Urgente
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Data necessária
            </label>

            <div className="relative">
              <CalendarDays
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="date"
                name="required_date"
                disabled={pending}
                className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-[#AF1B1B]"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Justificativa *
            </label>

            <textarea
              name="justification"
              required
              disabled={pending}
              rows={4}
              placeholder="Explique a necessidade desta compra..."
              className="w-full resize-none rounded-xl border border-slate-200 p-4 text-sm outline-none transition focus:border-[#AF1B1B] focus:ring-4 focus:ring-[#AF1B1B]/10"
            />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-950">
              Itens do pedido
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Informe todos os materiais ou
              serviços solicitados.
            </p>
          </div>

          <button
            type="button"
            onClick={addItem}
            disabled={pending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Plus size={17} />
            Adicionar item
          </button>
        </div>

        <div className="space-y-4 p-6">
          {items.map((item, index) => {
            const itemTotal =
              parseNumber(item.quantity) *
              parseNumber(
                item.estimated_unit_price
              );

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5"
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">
                    Item {index + 1}
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      removeItem(item.id)
                    }
                    disabled={
                      pending ||
                      items.length === 1
                    }
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <label className="mb-2 block text-xs font-medium text-slate-600">
                      Descrição *
                    </label>

                    <input
                      value={
                        item.description
                      }
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          "description",
                          event.target.value
                        )
                      }
                      disabled={pending}
                      placeholder="Descrição do item"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-xs font-medium text-slate-600">
                      Quantidade *
                    </label>

                    <input
                      type="number"
                      min="0.001"
                      step="0.001"
                      value={item.quantity}
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          "quantity",
                          event.target.value
                        )
                      }
                      disabled={pending}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
                    />
                  </div>

                  <div className="lg:col-span-2">
                    <label className="mb-2 block text-xs font-medium text-slate-600">
                      Unidade
                    </label>

                    <select
                      value={item.unit}
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          "unit",
                          event.target.value
                        )
                      }
                      disabled={pending}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
                    >
                      <option value="UN">
                        UN
                      </option>
                      <option value="CX">
                        CX
                      </option>
                      <option value="PCT">
                        PCT
                      </option>
                      <option value="KG">
                        KG
                      </option>
                      <option value="M">
                        M
                      </option>
                      <option value="M²">
                        M²
                      </option>
                      <option value="M³">
                        M³
                      </option>
                      <option value="HH">
                        HH
                      </option>
                      <option value="SV">
                        SV
                      </option>
                      <option value="VB">
                        VB
                      </option>
                    </select>
                  </div>

                  <div className="lg:col-span-3">
                    <label className="mb-2 block text-xs font-medium text-slate-600">
                      Valor estimado unitário
                    </label>

                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        R$
                      </span>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={
                          item.estimated_unit_price
                        }
                        onChange={(event) =>
                          updateItem(
                            item.id,
                            "estimated_unit_price",
                            event.target.value
                          )
                        }
                        disabled={pending}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-[#AF1B1B]"
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-9">
                    <label className="mb-2 block text-xs font-medium text-slate-600">
                      Observações do item
                    </label>

                    <input
                      value={item.notes}
                      onChange={(event) =>
                        updateItem(
                          item.id,
                          "notes",
                          event.target.value
                        )
                      }
                      disabled={pending}
                      placeholder="Especificação, modelo, referência..."
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
                    />
                  </div>

                  <div className="flex items-end lg:col-span-3">
                    <div className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2">
                      <p className="text-[10px] uppercase tracking-wide text-slate-400">
                        Total
                      </p>

                      <p className="mt-0.5 text-sm font-semibold text-slate-800">
                        {formatCurrency(
                          itemTotal
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-5 sm:flex-row sm:items-center sm:justify-end">
          <CircleDollarSign
            size={20}
            className="text-[#AF1B1B]"
          />

          <span className="text-sm text-slate-500">
            Valor estimado:
          </span>

          <strong className="text-xl text-slate-950">
            {formatCurrency(
              estimatedTotal
            )}
          </strong>
        </div>
      </section>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button
          type="submit"
          name="submit_mode"
          value="draft"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle
              size={17}
              className="animate-spin"
            />
          ) : (
            <Save size={17} />
          )}

          Salvar rascunho
        </button>

        <button
          type="submit"
          name="submit_mode"
          value="submit"
          disabled={pending}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-6 text-sm font-semibold text-white transition hover:bg-[#921717] disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle
              size={17}
              className="animate-spin"
            />
          ) : (
            <Send size={17} />
          )}

          Enviar pedido
        </button>
      </div>
    </form>
  );
}