"use client";

import { useReducedMotion } from "@/hooks/useReducedMotion";

export function AmbientBackground() {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) return null;

  return (
    <div
      className="ambient-glow"
      aria-hidden="true"
    />
  );
}
