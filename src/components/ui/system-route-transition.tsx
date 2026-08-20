"use client";

import type {
  ReactNode,
} from "react";

import {
  motion,
  useReducedMotion,
} from "motion/react";

export default function SystemRouteTransition({
  children,
}: {
  children: ReactNode;
}) {
  const reduceMotion =
    useReducedMotion();

  if (reduceMotion) {
    return (
      <>
        {children}
      </>
    );
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 8,
        filter:
          "blur(2px)",
      }}
      animate={{
        opacity: 1,
        y: 0,
        filter:
          "blur(0px)",
      }}
      transition={{
        duration: 0.32,
        ease: [
          0.22,
          1,
          0.36,
          1,
        ],
      }}
    >
      {children}
    </motion.div>
  );
}