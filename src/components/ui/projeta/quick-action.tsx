import type {
  ElementType,
} from "react";

import Link from "next/link";

import {
  ArrowUpRight,
} from "lucide-react";

type QuickActionProps = {
  icon: ElementType;
  title: string;
  description: string;
  href: string;
  primary?: boolean;
};

export default function QuickAction({
  icon: Icon,
  title,
  description,
  href,
  primary = false,
}: QuickActionProps) {
  return (
    <Link
      href={
        href
      }
      className={[
        "group flex items-center gap-3 rounded-2xl border p-3.5 transition-all duration-200",
        primary
          ? "border-primary/15 bg-primary/[0.035] hover:border-primary/25 hover:bg-primary/[0.065]"
          : "border-base-300/80 bg-base-200/20 hover:border-base-300 hover:bg-base-200/60",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
          primary
            ? "bg-primary text-primary-content shadow-[0_7px_18px_rgba(175,27,27,0.16)]"
            : "bg-base-100 text-base-content/45",
        ].join(" ")}
      >
        <Icon
          size={17}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-base-content/75">
          {title}
        </p>

        <p className="mt-0.5 truncate text-[10px] text-base-content/35">
          {description}
        </p>
      </div>

      <ArrowUpRight
        size={14}
        className="shrink-0 text-base-content/20 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary"
      />
    </Link>
  );
}