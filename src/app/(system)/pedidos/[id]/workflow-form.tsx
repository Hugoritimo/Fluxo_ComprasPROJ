"use client";

import { useActionState } from "react";

import {
  AlertCircle,
  CheckCircle2,
  LoaderCircle,
  Save,
} from "lucide-react";

import {
  type PurchaseWorkflowState,
  updatePurchaseWorkflow,
} from "../actions";

type Supplier = {
  id: string;
  name: string;
};

type WorkflowFormProps = {
  request: {
    id: string;
    status: string;
    sienge_request_number: string | null;
    sienge_order_number: string | null;
    supplier_id: string | null;
    order_date: string | null;
    expected_delivery_date: string | null;
    internal_notes: string | null;
  };

  suppliers: Supplier[];
};

const initialState: PurchaseWorkflowState = {
  error: null,
  success: null,
};

export default function WorkflowForm({
  request,
  suppliers,
}: WorkflowFormProps) {
  const [state, formAction, pending] =
    useActionState(
      updatePurchaseWorkflow,
      initialState
    );

  return (
    <form
      action={formAction}
      className="space-y-5"
    >
      <input
        type="hidden"
        name="request_id"
        value={request.id}
      />

      {state.error && (
        <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle size={16} />
          {state.error}
        </div>
      )}

      {state.success && (
        <div className="flex gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
          <CheckCircle2 size={16} />
          {state.success}
        </div>
      )}

      <div>
        <label className="mb-2 block text-xs font-medium text-slate-600">
          Status
        </label>

        <select
          name="status"
          defaultValue={request.status}
          disabled={pending}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
        >
          <option value="submitted">
            Solicitado
          </option>

          <option value="under_review">
            Em análise
          </option>

          <option value="awaiting_information">
            Aguardando informações
          </option>

          <option value="quotation">
            Em cotação
          </option>

          <option value="awaiting_approval">
            Aguardando aprovação
          </option>

          <option value="approved">
            Aprovado
          </option>

          <option value="rejected">
            Reprovado
          </option>

          <option value="sienge_registered">
            Registrado no Sienge
          </option>

          <option value="order_issued">
            Pedido emitido
          </option>

          <option value="awaiting_delivery">
            Aguardando entrega
          </option>

          <option value="partially_received">
            Recebido parcialmente
          </option>

          <option value="received">
            Recebido
          </option>

          <option value="completed">
            Concluído
          </option>

          <option value="cancelled">
            Cancelado
          </option>
        </select>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-slate-600">
          Solicitação Sienge
        </label>

        <input
          name="sienge_request_number"
          defaultValue={
            request.sienge_request_number ??
            ""
          }
          disabled={pending}
          placeholder="Ex.: 18251"
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#AF1B1B]"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-slate-600">
          Pedido Sienge
        </label>

        <input
          name="sienge_order_number"
          defaultValue={
            request.sienge_order_number ?? ""
          }
          disabled={pending}
          placeholder="Ex.: 85142"
          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#AF1B1B]"
        />
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-slate-600">
          Fornecedor
        </label>

        <select
          name="supplier_id"
          defaultValue={
            request.supplier_id ?? ""
          }
          disabled={pending}
          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#AF1B1B]"
        >
          <option value="">
            Não informado
          </option>

          {suppliers.map((supplier) => (
            <option
              key={supplier.id}
              value={supplier.id}
            >
              {supplier.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs font-medium text-slate-600">
            Data do pedido
          </label>

          <input
            type="date"
            name="order_date"
            defaultValue={
              request.order_date ?? ""
            }
            disabled={pending}
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#AF1B1B]"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-slate-600">
            Previsão de entrega
          </label>

          <input
            type="date"
            name="expected_delivery_date"
            defaultValue={
              request.expected_delivery_date ??
              ""
            }
            disabled={pending}
            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#AF1B1B]"
          />
        </div>
      </div>

      <div>
        <label className="mb-2 block text-xs font-medium text-slate-600">
          Observação interna
        </label>

        <textarea
          name="internal_notes"
          defaultValue={
            request.internal_notes ?? ""
          }
          disabled={pending}
          rows={4}
          className="w-full resize-none rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-[#AF1B1B]"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-4 text-sm font-semibold text-white transition hover:bg-[#921717] disabled:opacity-50"
      >
        {pending ? (
          <LoaderCircle
            size={17}
            className="animate-spin"
          />
        ) : (
          <Save size={17} />
        )}

        {pending
          ? "Salvando..."
          : "Atualizar pedido"}
      </button>
    </form>
  );
}