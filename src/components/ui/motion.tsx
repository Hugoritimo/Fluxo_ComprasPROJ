"use client";

import type {
  ReactNode,
} from "react";

import {
  motion,
  useReducedMotion,
} from "motion/react";

// ============================================================
// PÁGINA
// ============================================================

export function MotionPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion =
    useReducedMotion();

  return (
    <motion.div
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              y: 8,
            }
      }
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.35,
        ease: [
          0.22,
          1,
          0.36,
          1,
        ],
      }}
      className={
        className
      }
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// REVEAL
// ============================================================

export function MotionReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion =
    useReducedMotion();

  return (
    <motion.div
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              y: 12,
            }
      }
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.4,
        delay,
        ease: [
          0.22,
          1,
          0.36,
          1,
        ],
      }}
      className={
        className
      }
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// CARD
// ============================================================

export function MotionCard({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduceMotion =
    useReducedMotion();

  return (
    <motion.div
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              y: 14,
              scale: 0.985,
            }
      }
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -3,
            }
      }
      transition={{
        duration: 0.3,
        delay,
        ease: [
          0.22,
          1,
          0.36,
          1,
        ],
      }}
      className={
        className
      }
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// ELEMENTO CLICÁVEL
// ============================================================

export function MotionInteractive({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion =
    useReducedMotion();

  return (
    <motion.div
      whileHover={
        reduceMotion
          ? undefined
          : {
              y: -2,
              scale: 1.003,
            }
      }
      whileTap={
        reduceMotion
          ? undefined
          : {
              scale: 0.992,
            }
      }
      transition={{
        duration: 0.15,
      }}
      className={
        className
      }
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// LISTA COM STAGGER
// ============================================================

export function MotionList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion =
    useReducedMotion();

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren:
              reduceMotion
                ? 0
                : 0.055,

            delayChildren:
              reduceMotion
                ? 0
                : 0.05,
          },
        },
      }}
      className={
        className
      }
    >
      {children}
    </motion.div>
  );
}

export function MotionListItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion =
    useReducedMotion();

  return (
    <motion.div
      variants={{
        hidden:
          reduceMotion
            ? {}
            : {
                opacity: 0,
                y: 10,
              },

        visible: {
          opacity: 1,
          y: 0,

          transition: {
            duration: 0.3,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          },
        },
      }}
      className={
        className
      }
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// STATUS
// ============================================================

export function MotionStatus({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion =
    useReducedMotion();

  return (
    <motion.div
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              scale: 0.88,
            }
      }
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        type: "spring",
        stiffness: 430,
        damping: 27,
      }}
      className={
        className
      }
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// TIMELINE
// ============================================================

export function MotionTimelineStep({
  children,
  index,
  active = false,
}: {
  children: ReactNode;
  index: number;
  active?: boolean;
}) {
  const reduceMotion =
    useReducedMotion();

  return (
    <motion.div
      initial={
        reduceMotion
          ? false
          : {
              opacity: 0,
              x: -8,
            }
      }
      animate={{
        opacity: 1,
        x: 0,
      }}
      transition={{
        duration: 0.3,
        delay:
          reduceMotion
            ? 0
            : index *
              0.07,
      }}
    >
      <motion.div
        animate={
          active &&
          !reduceMotion
            ? {
                scale: [
                  1,
                  1.015,
                  1,
                ],
              }
            : undefined
        }
        transition={{
          duration: 1.8,
          repeat:
            active &&
            !reduceMotion
              ? Infinity
              : 0,
          repeatDelay: 1.5,
        }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
}