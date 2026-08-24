"use client";

import {
  useActionState,
  useEffect,
} from "react";

import {
  LoaderCircle,
  LockKeyhole,
  UserCheck,
} from "lucide-react";

import {
  changeUserActiveStatus,
  type UserActionState,
} from "./actions";

const initialState: UserActionState = {
  success:
    false,

  error:
    null,

  message:
    null,
};

export default function UserStatusButton({
  userId,
  active,
  disabled = false,
}: {
  userId: string;

  active: boolean;

  disabled?: boolean;
}) {
  const [
    state,
    formAction,
    pending,
  ] =
    useActionState(
      changeUserActiveStatus,
      initialState
    );

  useEffect(
    () => {
      if (
        state.error
      ) {
        console.error(
          state.error
        );
      }
    },
    [
      state
    ]
  );

  return (
    <form
      action={
        formAction
      }
    >
      <input
        type="hidden"
        name="userId"
        value={
          userId
        }
      />

      <input
        type="hidden"
        name="newStatus"
        value={
          active
            ? "false"
            : "true"
        }
      />

      <button
        type="submit"
        disabled={
          pending ||
          disabled
        }
        title={
          active
            ? "Desativar usuário"
            : "Ativar usuário"
        }
        className={[
          "btn btn-ghost btn-sm gap-2 rounded-xl",
          active
            ? "text-error"
            : "text-success",
        ].join(" ")}
      >
        {pending ? (
          <LoaderCircle
            size={15}
            className="animate-spin"
          />
        ) : active ? (
          <LockKeyhole
            size={15}
          />
        ) : (
          <UserCheck
            size={15}
          />
        )}

        <span className="hidden xl:inline">
          {active
            ? "Desativar"
            : "Ativar"}
        </span>
      </button>
    </form>
  );
}