import type { MotionProps } from "framer-motion";

export const REVEAL_DURATION = 0.5;
export const REVEAL_STAGGER = 0.1;
export const REVEAL_EASE: [number, number, number, number] = [0.25, 0.1, 0.25, 1.0];

/**
 * Returns Framer Motion props for a scroll-triggered fade-up reveal.
 * Returns empty object when reduced motion is preferred (no animation).
 */
export function getRevealProps(
  delay: number,
  reducedMotion: boolean
): MotionProps {
  if (reducedMotion) return {};
  return {
    initial: { opacity: 0, y: 24 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: REVEAL_DURATION, delay, ease: REVEAL_EASE },
  };
}

/** Variant for horizontal slide-in reveals (e.g. ProductPreview rows). */
export function getSlideRevealProps(
  delay: number,
  reducedMotion: boolean
): MotionProps {
  if (reducedMotion) return {};
  return {
    initial: { opacity: 0, x: -16 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true },
    transition: { duration: 0.4, delay, ease: REVEAL_EASE },
  };
}

/** Scale-up reveal with spring physics. */
export function getScaleRevealProps(
  delay: number,
  reducedMotion: boolean
): MotionProps {
  if (reducedMotion) return {};
  return {
    initial: { opacity: 0, scale: 0.95 },
    whileInView: { opacity: 1, scale: 1 },
    viewport: { once: true, margin: "-40px" },
    transition: {
      duration: 0.5,
      delay,
      type: "spring",
      stiffness: 200,
      damping: 25,
    },
  };
}

/** ClipPath wipe reveal (bottom-to-top). */
export function getClipRevealProps(
  delay: number,
  reducedMotion: boolean
): MotionProps {
  if (reducedMotion) return {};
  return {
    initial: { opacity: 0, clipPath: "inset(100% 0 0 0)" },
    whileInView: { opacity: 1, clipPath: "inset(0 0 0 0)" },
    viewport: { once: true, margin: "-40px" },
    transition: { duration: 0.6, delay, ease: REVEAL_EASE },
  };
}

/** Stagger container variants for parent. */
export function getStaggerContainer(reducedMotion: boolean) {
  if (reducedMotion) return {};
  return {
    initial: "hidden",
    whileInView: "visible",
    viewport: { once: true, margin: "-40px" } as const,
    variants: {
      hidden: {},
      visible: {
        transition: { staggerChildren: 0.08 },
      },
    },
  };
}

/** Stagger child variants. */
export function getStaggerChild(reducedMotion: boolean) {
  if (reducedMotion) return {};
  return {
    variants: {
      hidden: { opacity: 0, y: 16 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.45, ease: REVEAL_EASE },
      },
    },
  };
}

/** Hero entrance orchestration timing (delays in seconds). */
export const HERO_ENTRANCE = {
  header: 0.2,
  headline: 0.4,
  headlineStagger: 0.06,
  subheadline: 0.7,
  ctas: 0.9,
  scene: 1.0,
  helper: 1.2,
} as const;
