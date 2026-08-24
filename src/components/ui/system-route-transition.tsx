"use client";

import type {
  ReactNode,
} from "react";

import {
  motion,
  useReducedMotion,
} from "motion/react";

// ============================================================
// SYSTEM ROUTE TRANSITION
// ============================================================

export default function SystemRouteTransition({
  children,
}: {
  children: ReactNode;
}) {
  const reduceMotion =
    useReducedMotion();

  // =========================================================
  // ACESSIBILIDADE
  // =========================================================

  if (reduceMotion) {
    return (
      <>
        {children}
      </>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 10,
        scale: 0.997,
      }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      transition={{
        opacity: {
          duration: 0.22,
          ease: "easeOut",
        },

        y: {
          duration: 0.38,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        },

        scale: {
          duration: 0.42,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ],
        },
      }}
      style={{
        willChange:
          "transform, opacity",
      }}
    >
      {children}
    </motion.div>
  );
}