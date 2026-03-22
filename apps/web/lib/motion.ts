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
