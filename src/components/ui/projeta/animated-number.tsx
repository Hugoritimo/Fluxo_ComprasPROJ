"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  animate,
  useInView,
  useReducedMotion,
} from "motion/react";

// ============================================================
// PROPS
// ============================================================

type AnimatedNumberProps = {
  value: number;

  duration?: number;

  delay?: number;

  decimals?: number;

  prefix?: string;

  suffix?: string;

  className?: string;

  locale?: string;
};

// ============================================================
// COMPONENT
// ============================================================

export default function AnimatedNumber({
  value,
  duration = 0.75,
  delay = 0,
  decimals = 0,
  prefix = "",
  suffix = "",
  className = "",
  locale = "pt-BR",
}: AnimatedNumberProps) {
  const reduceMotion =
    useReducedMotion();

  const ref =
    useRef<HTMLSpanElement>(
      null
    );

  const inView =
    useInView(
      ref,
      {
        once:
          true,

        amount:
          0.5,
      }
    );

  const [
    displayValue,
    setDisplayValue,
  ] =
    useState(
      reduceMotion
        ? value
        : 0
    );

  useEffect(
    () => {
      if (
        reduceMotion
      ) {
        setDisplayValue(
          value
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
          value,
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
                setDisplayValue(
                  current
                );
              },
          }
        );

      return () =>
        controls.stop();
    },
    [
      value,
      duration,
      delay,
      inView,
      reduceMotion,
    ]
  );

  const formattedValue =
    new Intl.NumberFormat(
      locale,
      {
        minimumFractionDigits:
          decimals,

        maximumFractionDigits:
          decimals,
      }
    ).format(
      displayValue
    );

  return (
    <span
      ref={
        ref
      }
      className={[
        "tabular-nums",
        className,
      ].join(
        " "
      )}
    >
      {prefix}
      {formattedValue}
      {suffix}
    </span>
  );
}