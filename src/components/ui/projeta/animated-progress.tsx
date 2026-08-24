"use client";

import {
  motion,
  useReducedMotion,
} from "motion/react";

// ============================================================
// TYPES
// ============================================================

type AnimatedProgressProps = {
  value: number;

  duration?: number;

  delay?: number;

  className?: string;

  barClassName?: string;

  height?: number | string;

  rounded?: boolean;

  showGlow?: boolean;

  ariaLabel?: string;
};

// ============================================================
// COMPONENT
// ============================================================

export default function AnimatedProgress({
  value,
  duration = 0.75,
  delay = 0,
  className = "",
  barClassName = "bg-primary",
  height = 6,
  rounded = true,
  showGlow = false,
  ariaLabel = "Progresso",
}: AnimatedProgressProps) {
  const reduceMotion =
    useReducedMotion();

  // =========================================================
  // NORMALIZAÇÃO
  // =========================================================

  const normalizedValue =
    Math.min(
      100,
      Math.max(
        0,
        Number.isFinite(
          value
        )
          ? value
          : 0
      )
    );

  const heightValue =
    typeof height ===
    "number"
      ? `${height}px`
      : height;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      className={[
        "relative w-full overflow-hidden bg-base-200",
        rounded
          ? "rounded-full"
          : "",
        className,
      ].join(
        " "
      )}
      style={{
        height:
          heightValue,
      }}
      role="progressbar"
      aria-label={
        ariaLabel
      }
      aria-valuemin={
        0
      }
      aria-valuemax={
        100
      }
      aria-valuenow={
        Math.round(
          normalizedValue
        )
      }
    >
      {/* =====================================================
          BARRA
      ====================================================== */}

      <motion.div
        initial={
          reduceMotion
            ? false
            : {
                width:
                  "0%",
              }
        }
        whileInView={{
          width:
            `${normalizedValue}%`,
        }}
        viewport={{
          once:
            true,

          amount:
            0.5,
        }}
        transition={{
          duration:
            reduceMotion
              ? 0
              : duration,

          delay:
            reduceMotion
              ? 0
              : delay,

          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        }}
        className={[
          "relative h-full",
          rounded
            ? "rounded-full"
            : "",
          barClassName,
        ].join(
          " "
        )}
      >
        {/* ===================================================
            BRILHO SUAVE OPCIONAL
        ==================================================== */}

        {showGlow && (
          <motion.span
            initial={
              reduceMotion
                ? false
                : {
                    opacity:
                      0,
                  }
            }
            whileInView={{
              opacity:
                1,
            }}
            viewport={{
              once:
                true,
            }}
            transition={{
              delay:
                delay +
                duration *
                  0.45,

              duration:
                0.35,
            }}
            className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-r from-transparent to-white/30"
          />
        )}
      </motion.div>
    </div>
  );
}