"use client";

import type {
  FormEvent,
} from "react";

import {
  useState,
  useTransition,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  Loader2,
  Save,
  ShoppingCart,
  Store,
  Truck,
  UserRound,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  updateSupplyItem,
} from "./actions";

type Props = {
  itemId: string;
  requestKey: string;

  supplyStatus:
    | string
    | null;

  supplyStatusDate:
    | string
    | null;

  orderNumber:
    | string
    | null;

  supplierName:
    | string
    | null;

  supplierContact:
    | string
    | null;

  supplierPhone:
    | string
    | null;

  deliveryOrPickupForecast:
    | string
    | null;

  authorizationStatus:
    | string
    | null;
};

const STATUS_OPTIONS = [
  "Solicitação recebida",
  "Em cotação",
  "Em aprovação",
  "Compra realizada",
  "Compra via cartão",
  "Disponível para retirada",
  "Em processo de entrega",
  "Entregue",
];

export default function SupplyItemForm({
  itemId,
  requestKey,
  supplyStatus,
  supplyStatusDate,
  orderNumber,
  supplierName,
  supplierContact,
  supplierPhone,
  deliveryOrPickupForecast,
  authorizationStatus,
}: Props) {
  const router =
    useRouter();

  const [
    isPending,
    startTransition,
  ] =
    useTransition();

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

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError(
      null
    );

    setSuccess(
      null
    );

    const formData =
      new FormData(
        event.currentTarget
      );

    startTransition(
      async () => {
        const result =
          await updateSupplyItem(
            formData
          );

        if (
          !result.success
        ) {
          setError(
            result.error ??
              "Não foi possível salvar."
          );

          return;
        }

        setSuccess(
          result.message ??
            "Acompanhamento atualizado."
        );

        router.refresh();
      }
    );
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="p-5"
    >
      <input
        type="hidden"
        name="itemId"
        value={
          itemId
        }
      />

      <input
        type="hidden"
        name="requestKey"
        value={
          requestKey
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FormField
          icon={
            CheckCircle2
          }
          label="Status Suprimentos"
        >
          <select
            name="supplyStatus"
            defaultValue={
              supplyStatus ??
              ""
            }
            disabled={
              isPending
            }
            className="input-field"
          >
            <option value="">
              Selecione...
            </option>

            {STATUS_OPTIONS.map(
              (
                status
              ) => (
                <option
                  key={
                    status
                  }
                  value={
                    status
                  }
                >
                  {
                    status
                  }
                </option>
              )
            )}
          </select>
        </FormField>

        <FormField
          icon={
            CalendarDays
          }
          label="Data do Status"
        >
          <input
            type="date"
            name="supplyStatusDate"
            defaultValue={
              toInputDate(
                supplyStatusDate
              )
            }
            disabled={
              isPending
            }
            className="input-field"
          />
        </FormField>

        <FormField
          icon={
            ShoppingCart
          }
          label="Pedido"
        >
          <input
            name="orderNumber"
            defaultValue={
              orderNumber ??
              ""
            }
            maxLength={
              100
            }
            disabled={
              isPending
            }
            placeholder="Número do pedido"
            className="input-field"
          />
        </FormField>

        <FormField
          icon={
            Store
          }
          label="Fornecedor"
        >
          <input
            name="supplierName"
            defaultValue={
              supplierName ??
              ""
            }
            maxLength={
              200
            }
            disabled={
              isPending
            }
            placeholder="Fornecedor"
            className="input-field"
          />
        </FormField>

        <FormField
          icon={
            UserRound
          }
          label="Contato"
        >
          <input
            name="supplierContact"
            defaultValue={
              supplierContact ??
              ""
            }
            maxLength={
              150
            }
            disabled={
              isPending
            }
            placeholder="Contato"
            className="input-field"
          />
        </FormField>

        <FormField
          icon={
            UserRound
          }
          label="Telefone"
        >
          <input
            name="supplierPhone"
            defaultValue={
              supplierPhone ??
              ""
            }
            maxLength={
              100
            }
            disabled={
              isPending
            }
            placeholder="Telefone"
            className="input-field"
          />
        </FormField>

        <FormField
          icon={
            Truck
          }
          label="Previsão Entrega / Retirada"
        >
          <input
            type="date"
            name="deliveryOrPickupForecast"
            defaultValue={
              toInputDate(
                deliveryOrPickupForecast
              )
            }
            disabled={
              isPending
            }
            className="input-field"
          />
        </FormField>

        <FormField
          icon={
            CheckCircle2
          }
          label="Autorização"
        >
          <input
            name="authorizationStatus"
            defaultValue={
              authorizationStatus ??
              ""
            }
            maxLength={
              100
            }
            disabled={
              isPending
            }
            placeholder="Status da autorização"
            className="input-field"
          />
        </FormField>
      </div>

      <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {error && (
            <p className="text-xs font-semibold text-red-600">
              {
                error
              }
            </p>
          )}

          {success && (
            <p className="text-xs font-semibold text-emerald-600">
              {
                success
              }
            </p>
          )}

          {!error &&
            !success && (
            <p className="text-[10px] text-slate-400">
              As alterações ficam registradas no Projeta Compras e não são sobrescritas pela próxima importação.
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={
            isPending
          }
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#171717] px-5 text-xs font-semibold text-white transition hover:bg-[#AF1B1B] disabled:opacity-40"
        >
          {isPending ? (
            <>
              <Loader2
                size={
                  14
                }
                className="animate-spin"
              />

              Salvando...
            </>
          ) : (
            <>
              <Save
                size={
                  14
                }
              />

              Salvar acompanhamento
            </>
          )}
        </button>
      </div>

      <style jsx>{`
        .input-field {
          height: 44px;
          width: 100%;
          border-radius: 12px;
          border: 1px solid rgb(226 232 240);
          background: white;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 500;
          color: rgb(51 65 85);
          outline: none;
        }

        .input-field:focus {
          border-color: #af1b1b;
          box-shadow: 0 0 0 4px rgba(175, 27, 27, 0.08);
        }

        .input-field:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }
      `}</style>
    </form>
  );
}

function FormField({
  icon:
    Icon,
  label,
  children,
}: {
  icon:
    React.ElementType;

  label:
    string;

  children:
    React.ReactNode;
}) {
  return (
    <label>
      <span className="mb-1.5 flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-slate-500">
        <Icon
          size={
            11
          }
          className="text-[#AF1B1B]"
        />

        {
          label
        }
      </span>

      {
        children
      }
    </label>
  );
}

function toInputDate(
  value:
    | string
    | null
) {
  if (
    !value
  ) {
    return "";
  }

  return (
    value.match(
      /^\d{4}-\d{2}-\d{2}/
    )?.[0] ??
    ""
  );
}