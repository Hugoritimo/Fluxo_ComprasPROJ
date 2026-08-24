"use client";

import type {
  ReactNode,
} from "react";

import {
  motion,
  useReducedMotion,
} from "motion/react";

// ============================================================
// CONFIGURAÇÃO GLOBAL
// ============================================================

const easeOut = [
  0.22,
  1,
  0.36,
  1,
] as const;

const easeSoft = [
  0.16,
  1,
  0.3,
  1,
] as const;

// ============================================================
// PAGE
// ============================================================
//
// IMPORTANTE:
//
// A animação principal da página já acontece em
// SystemRouteTransition.
//
// MotionPage agora funciona como container estrutural,
// evitando animação duplicada.
// ============================================================

export function MotionPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
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
//
// Ideal para:
// - headers
// - blocos
// - seções
// - dashboards
// - painéis
//
// Usa whileInView para elementos abaixo da dobra.
// ============================================================

export function MotionReveal({
  children,
  className = "",
  delay = 0,
  distance = 14,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  distance?: number;
}) {
  const reduceMotion =
    useReducedMotion();

  if (reduceMotion) {
    return (
      <div
        className={
          className
        }
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: distance,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        amount: 0.12,
      }}
      transition={{
        duration: 0.48,
        delay,
        ease:
          easeOut,
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
// REVEAL LATERAL
// ============================================================

export function MotionRevealX({
  children,
  className = "",
  delay = 0,
  direction = "left",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?:
    | "left"
    | "right";
}) {
  const reduceMotion =
    useReducedMotion();

  if (reduceMotion) {
    return (
      <div
        className={
          className
        }
      >
        {children}
      </div>
    );
  }

  const offset =
    direction ===
    "left"
      ? -16
      : 16;

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: offset,
      }}
      whileInView={{
        opacity: 1,
        x: 0,
      }}
      viewport={{
        once: true,
        amount: 0.15,
      }}
      transition={{
        duration: 0.46,
        delay,
        ease:
          easeOut,
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
//
// Mantido para compatibilidade com telas existentes.
//
// Tem reveal + hover discreto.
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

  if (reduceMotion) {
    return (
      <div
        className={
          className
        }
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 16,
        scale: 0.988,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      viewport={{
        once: true,
        amount: 0.12,
      }}
      whileHover={{
        y: -3,
      }}
      transition={{
        opacity: {
          duration:
            0.35,

          delay,
        },

        y: {
          type:
            "spring",

          stiffness:
            320,

          damping:
            28,

          delay,
        },

        scale: {
          duration:
            0.38,

          delay,

          ease:
            easeOut,
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
// MOTION SURFACE
// ============================================================
//
// Novo componente principal.
//
// Ideal para:
// - painéis
// - dashboards
// - atalhos
// - widgets
// - superfícies interativas
// ============================================================

export function MotionSurface({
  children,
  className = "",
  delay = 0,
  interactive = true,
  lift = 3,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  interactive?: boolean;
  lift?: number;
}) {
  const reduceMotion =
    useReducedMotion();

  if (reduceMotion) {
    return (
      <div
        className={
          className
        }
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 14,
        scale: 0.992,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        scale: 1,
      }}
      viewport={{
        once: true,
        amount: 0.1,
      }}
      whileHover={
        interactive
          ? {
              y:
                -lift,

              scale:
                1.002,
            }
          : undefined
      }
      whileTap={
        interactive
          ? {
              scale:
                0.995,
            }
          : undefined
      }
      transition={{
        opacity: {
          duration:
            0.36,

          delay,
        },

        y: {
          type:
            "spring",

          stiffness:
            300,

          damping:
            30,

          delay,
        },

        scale: {
          type:
            "spring",

          stiffness:
            360,

          damping:
            32,

          delay,
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
// INTERACTIVE
// ============================================================
//
// Elementos clicáveis pequenos.
// ============================================================

export function MotionInteractive({
  children,
  className = "",
  lift = 2,
  scale = 1.004,
}: {
  children: ReactNode;
  className?: string;
  lift?: number;
  scale?: number;
}) {
  const reduceMotion =
    useReducedMotion();

  if (reduceMotion) {
    return (
      <div
        className={
          className
        }
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{
        y:
          -lift,

        scale,
      }}
      whileTap={{
        y: 0,
        scale:
          0.985,
      }}
      transition={{
        type:
          "spring",

        stiffness:
          430,

        damping:
          28,

        mass:
          0.55,
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
// LIST
// ============================================================

export function MotionList({
  children,
  className = "",
  stagger = 0.055,
  delay = 0.04,
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
}) {
  const reduceMotion =
    useReducedMotion();

  if (reduceMotion) {
    return (
      <div
        className={
          className
        }
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{
        once: true,
        amount: 0.08,
      }}
      variants={{
        hidden: {},

        visible: {
          transition: {
            staggerChildren:
              stagger,

            delayChildren:
              delay,
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
// LIST ITEM
// ============================================================

export function MotionListItem({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion =
    useReducedMotion();

  if (reduceMotion) {
    return (
      <div
        className={
          className
        }
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={{
        hidden: {
          opacity:
            0,

          y:
            10,
        },

        visible: {
          opacity:
            1,

          y:
            0,

          transition: {
            duration:
              0.34,

            ease:
              easeOut,
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
// STAGGER
// ============================================================
//
// Versão mais genérica que MotionList.
//
// Pode ser usada em grids:
// cards, KPIs, botões, atalhos etc.
// ============================================================

export function MotionStagger({
  children,
  className = "",
  delay = 0.05,
  stagger = 0.065,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
}) {
  const reduceMotion =
    useReducedMotion();

  if (reduceMotion) {
    return (
      <div
        className={
          className
        }
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{
        once: true,
        amount: 0.08,
      }}
      variants={{
        hidden: {},

        visible: {
          transition: {
            delayChildren:
              delay,

            staggerChildren:
              stagger,
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
// STAGGER ITEM
// ============================================================

export function MotionStaggerItem({
  children,
  className = "",
  scale = true,
}: {
  children: ReactNode;
  className?: string;
  scale?: boolean;
}) {
  const reduceMotion =
    useReducedMotion();

  if (reduceMotion) {
    return (
      <div
        className={
          className
        }
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      variants={{
        hidden: {
          opacity:
            0,

          y:
            12,

          scale:
            scale
              ? 0.988
              : 1,
        },

        visible: {
          opacity:
            1,

          y:
            0,

          scale:
            1,

          transition: {
            duration:
              0.42,

            ease:
              easeOut,
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
  pulse = false,
}: {
  children: ReactNode;
  className?: string;
  pulse?: boolean;
}) {
  const reduceMotion =
    useReducedMotion();

  if (reduceMotion) {
    return (
      <div
        className={
          className
        }
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{
        opacity:
          0,

        scale:
          0.82,
      }}
      animate={
        pulse
          ? {
              opacity:
                1,

              scale: [
                1,
                1.035,
                1,
              ],
            }
          : {
              opacity:
                1,

              scale:
                1,
            }
      }
      transition={
        pulse
          ? {
              opacity: {
                duration:
                  0.25,
              },

              scale: {
                duration:
                  2.2,

                repeat:
                  Infinity,

                repeatDelay:
                  1.2,

                ease:
                  "easeInOut",
              },
            }
          : {
              type:
                "spring",

              stiffness:
                430,

              damping:
                25,
            }
      }
      className={
        className
      }
    >
      {children}
    </motion.div>
  );
}

// ============================================================
// TIMELINE STEP
// ============================================================

export function MotionTimelineStep({
  children,
  index,
  active = false,
  className = "",
}: {
  children: ReactNode;
  index: number;
  active?: boolean;
  className?: string;
}) {
  const reduceMotion =
    useReducedMotion();

  if (reduceMotion) {
    return (
      <div
        className={
          className
        }
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{
        opacity:
          0,

        x:
          -12,
      }}
      whileInView={{
        opacity:
          1,

        x:
          0,
      }}
      viewport={{
        once:
          true,

        amount:
          0.15,
      }}
      transition={{
        duration:
          0.38,

        delay:
          index *
          0.055,

        ease:
          easeOut,
      }}
      className={
        className
      }
    >
      <motion.div
        animate={
          active
            ? {
                scale: [
                  1,
                  1.012,
                  1,
                ],
              }
            : undefined
        }
        transition={
          active
            ? {
                duration:
                  1.9,

                repeat:
                  Infinity,

                repeatDelay:
                  1.8,

                ease:
                  "easeInOut",
              }
            : undefined
        }
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// ICON
// ============================================================
//
// Para ícones de botões e ações.
// ============================================================

export function MotionIcon({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion =
    useReducedMotion();

  if (reduceMotion) {
    return (
      <span
        className={
          className
        }
      >
        {children}
      </span>
    );
  }

  return (
    <motion.span
      whileHover={{
        rotate:
          -4,

        scale:
          1.08,
      }}
      whileTap={{
        scale:
          0.9,
      }}
      transition={{
        type:
          "spring",

        stiffness:
          450,

        damping:
          22,
      }}
      className={
        className
      }
    >
      {children}
    </motion.span>
  );
}

// ============================================================
// SCALE IN
// ============================================================

export function MotionScaleIn({
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

  if (reduceMotion) {
    return (
      <div
        className={
          className
        }
      >
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{
        opacity:
          0,

        scale:
          0.94,
      }}
      whileInView={{
        opacity:
          1,

        scale:
          1,
      }}
      viewport={{
        once:
          true,

        amount:
          0.15,
      }}
      transition={{
        duration:
          0.42,

        delay,

        ease:
          easeSoft,
      }}
      className={
        className
      }
    >
      {children}
    </motion.div>
  );
}