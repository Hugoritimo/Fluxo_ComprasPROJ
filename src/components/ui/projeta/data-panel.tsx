import type {
  ReactNode,
} from "react";

type DataPanelProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export default function DataPanel({
  eyebrow,
  title,
  description,
  action,
  children,
  className = "",
  contentClassName = "",
}: DataPanelProps) {
  return (
    <section
      className={[
        "overflow-hidden rounded-[22px] border border-base-300/80 bg-base-100",
        "shadow-[0_1px_2px_rgba(0,0,0,0.015)]",
        className,
      ].join(" ")}
    >
      <div className="flex flex-col gap-4 border-b border-base-300/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          {eyebrow && (
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-base-content/30">
              {eyebrow}
            </p>
          )}

          <h2 className="mt-1 text-[15px] font-semibold tracking-[-0.01em] text-base-content">
            {title}
          </h2>

          {description && (
            <p className="mt-1 text-[11px] leading-5 text-base-content/40">
              {description}
            </p>
          )}
        </div>

        {action && (
          <div className="shrink-0">
            {action}
          </div>
        )}
      </div>

      <div
        className={
          contentClassName
        }
      >
        {children}
      </div>
    </section>
  );
}