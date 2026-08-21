import type {
  ElementType,
} from "react";

type MetricCardProps = {
  icon: ElementType;
  label: string;
  value:
    | number
    | string;
  description?: string;
  variant?:
    | "neutral"
    | "primary"
    | "info"
    | "success"
    | "warning"
    | "error";
  large?: boolean;
};

export default function MetricCard({
  icon: Icon,
  label,
  value,
  description,
  variant = "neutral",
  large = false,
}: MetricCardProps) {
  const styles =
    {
      neutral: {
        icon:
          "bg-base-200 text-base-content/50",
        value:
          "text-base-content",
        dot:
          "bg-base-content/30",
      },

      primary: {
        icon:
          "bg-primary/10 text-primary",
        value:
          "text-base-content",
        dot:
          "bg-primary",
      },

      info: {
        icon:
          "bg-info/10 text-info",
        value:
          "text-base-content",
        dot:
          "bg-info",
      },

      success: {
        icon:
          "bg-success/10 text-success",
        value:
          "text-base-content",
        dot:
          "bg-success",
      },

      warning: {
        icon:
          "bg-warning/10 text-warning",
        value:
          "text-warning",
        dot:
          "bg-warning",
      },

      error: {
        icon:
          "bg-error/10 text-error",
        value:
          "text-error",
        dot:
          "bg-error",
      },
    }[
      variant
    ];

  return (
    <div className="group relative h-full overflow-hidden rounded-[20px] border border-base-300/80 bg-base-100 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-base-300 hover:shadow-[0_12px_35px_rgba(0,0,0,0.045)]">
      <div className="flex items-start justify-between">
        <div
          className={[
            "flex items-center justify-center rounded-xl",
            large
              ? "h-11 w-11"
              : "h-9 w-9",
            styles.icon,
          ].join(" ")}
        >
          <Icon
            size={
              large
                ? 19
                : 17
            }
          />
        </div>

        <span
          className={[
            "mt-1 h-1.5 w-1.5 rounded-full",
            styles.dot,
          ].join(" ")}
        />
      </div>

      <p
        className={[
          "mt-5 font-semibold tracking-[-0.035em]",
          large
            ? "text-4xl"
            : "text-[27px]",
          styles.value,
        ].join(" ")}
      >
        {value}
      </p>

      <p className="mt-1 text-xs font-semibold text-base-content/65">
        {label}
      </p>

      {description && (
        <p className="mt-2 text-[10px] leading-4 text-base-content/35">
          {description}
        </p>
      )}
    </div>
  );
}