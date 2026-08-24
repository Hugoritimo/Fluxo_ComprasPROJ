"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  animate,
  motion,
  useInView,
  useReducedMotion,
} from "motion/react";

// ============================================================
// TYPES
// ============================================================

type AnimatedRadialProgressProps = {
  value: number;

  duration?: number;
  delay?: number;

  size?: number | string;
  thickness?: number | string;

  decimals?: number;

  prefix?: string;
  suffix?: string;

  label?: string;

  className?: string;
  valueClassName?: string;
  labelClassName?: string;

  trackClassName?: string;

  ariaLabel?: string;
};

// ============================================================
// COMPONENT
// ============================================================

export default function AnimatedRadialProgress({
  value,
  duration = 0.9,
  delay = 0.08,
  size = "8.8rem",
  thickness = "0.55rem",
  decimals = 0,
  prefix = "",
  suffix = "%",
  label,
  className = "",
  valueClassName = "",
  labelClassName = "",
  trackClassName = "text-base-300/70",
  ariaLabel = "Progresso",
}: AnimatedRadialProgressProps) {
  const reduceMotion =
    useReducedMotion();

  const ref =
    useRef<HTMLDivElement>(
      null
    );

  const inView =
    useInView(
      ref,
      {
        once: true,
        amount: 0.4,
      }
    );

  // =========================================================
  // VALUE
  // =========================================================

  const normalizedValue =
    Math.min(
      100,
      Math.max(
        0,
        Number.isFinite(value)
          ? value
          : 0
      )
    );

  const [
    animatedValue,
    setAnimatedValue,
  ] =
    useState(
      reduceMotion
        ? normalizedValue
        : 0
    );

  // =========================================================
  // ANIMATION
  // =========================================================

  useEffect(
    () => {
      if (
        reduceMotion
      ) {
        setAnimatedValue(
          normalizedValue
        );

        return;
      }

      if (
        !inView
      ) {
        return;
      }

      const controls =
        animate(
          0,
          normalizedValue,
          {
            duration,
            delay,

            ease: [
              0.22,
              1,
              0.36,
              1,
            ],

            onUpdate:
              (
                current
              ) => {
                setAnimatedValue(
                  current
                );
              },
          }
        );

      return () => {
        controls.stop();
      };
    },
    [
      normalizedValue,
      duration,
      delay,
      reduceMotion,
      inView,
    ]
  );

  // =========================================================
  // FORMAT
  // =========================================================

  const formattedValue =
    new Intl.NumberFormat(
      "pt-BR",
      {
        minimumFractionDigits:
          decimals,

        maximumFractionDigits:
          decimals,
      }
    ).format(
      animatedValue
    );

  const sizeValue =
    typeof size ===
    "number"
      ? `${size}px`
      : size;

  const thicknessValue =
    typeof thickness ===
    "number"
      ? `${thickness}px`
      : thickness;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <div
      ref={ref}
      className="relative flex items-center justify-center"
      style={{
        width:
          sizeValue,

        height:
          sizeValue,
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
          TRACK
      ====================================================== */}

      <div
        aria-hidden="true"
        className={[
          "radial-progress absolute inset-0",
          trackClassName,
        ].join(
          " "
        )}
        style={
          {
            "--value":
              100,

            "--size":
              sizeValue,

            "--thickness":
              thicknessValue,
          } as React.CSSProperties
        }
      />

      {/* =====================================================
          PROGRESS
      ====================================================== */}

      <motion.div
        aria-hidden="true"
        initial={
          reduceMotion
            ? false
            : {
                opacity:
                  0.7,

                scale:
                  0.96,
              }
        }
        animate={{
          opacity:
            1,

          scale:
            1,
        }}
        transition={{
          duration:
            0.4,

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
          "radial-progress absolute inset-0",
          className,
        ].join(
          " "
        )}
        style={
          {
            "--value":
              animatedValue,

            "--size":
              sizeValue,

            "--thickness":
              thicknessValue,
          } as React.CSSProperties
        }
      />

      {/* =====================================================
          CENTER
      ====================================================== */}

      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <span
          className={[
            "tabular-nums",
            valueClassName,
          ].join(
            " "
          )}
        >
          {prefix}
          {formattedValue}
          {suffix}
        </span>

        {label && (
          <span
            className={
              labelClassName
            }
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}