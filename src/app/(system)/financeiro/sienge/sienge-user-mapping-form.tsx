"use client";

import {
  useEffect,
  useState,
  useTransition,
} from "react";

import {
  CheckCircle2,
  Link2,
  LoaderCircle,
} from "lucide-react";

import {
  useRouter,
} from "next/navigation";

import {
  saveSiengeUserMapping,
} from "./mapping-actions";

type ProfileOption = {
  id: string;
  full_name: string;
  email: string;
};

type Props = {
  siengeUsername: string;

  currentProfileId:
    | string
    | null;

  profiles:
    ProfileOption[];
};

export default function SiengeUserMappingForm({
  siengeUsername,
  currentProfileId,
  profiles,
}: Props) {
  const router =
    useRouter();

  const [
    profileId,
    setProfileId,
  ] =
    useState(
      currentProfileId ??
        ""
    );

  const [
    message,
    setMessage,
  ] =
    useState<string | null>(
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

  useEffect(
    () => {
      setProfileId(
        currentProfileId ??
          ""
      );
    },
    [
      currentProfileId,
    ]
  );

  function save() {
    if (!profileId) {
      setError(
        "Selecione um usuário."
      );

      return;
    }

    setError(
      null
    );

    setMessage(
      null
    );

    startTransition(
      async () => {
        const result =
          await saveSiengeUserMapping(
            siengeUsername,
            profileId
          );

        if (
          !result.success
        ) {
          setError(
            result.error
          );

          return;
        }

        setMessage(
          result.updatedItems >
            0
            ? `${result.updatedItems} item(ns) vinculados.`
            : "Vínculo salvo."
        );

        router.refresh();
      }
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 lg:flex-row">
        <select
          value={
            profileId
          }
          onChange={(
            event
          ) => {
            setProfileId(
              event.target.value
            );

            setMessage(
              null
            );

            setError(
              null
            );
          }}
          disabled={
            pending
          }
          className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs text-slate-700 outline-none transition focus:border-[#AF1B1B]"
        >
          <option value="">
            Selecione o usuário...
          </option>

          {profiles.map(
            (profile) => (
              <option
                key={
                  profile.id
                }
                value={
                  profile.id
                }
              >
                {
                  profile.full_name
                }{" "}
                —{" "}
                {
                  profile.email
                }
              </option>
            )
          )}
        </select>

        <button
          type="button"
          onClick={
            save
          }
          disabled={
            pending ||
            !profileId
          }
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#AF1B1B] px-4 text-xs font-semibold text-white transition hover:bg-[#921717] disabled:opacity-50"
        >
          {pending ? (
            <LoaderCircle
              size={15}
              className="animate-spin"
            />
          ) : (
            <Link2
              size={15}
            />
          )}

          Vincular
        </button>
      </div>

      {message && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
          <CheckCircle2
            size={13}
          />

          {message}
        </p>
      )}

      {error && (
        <p className="text-xs font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}