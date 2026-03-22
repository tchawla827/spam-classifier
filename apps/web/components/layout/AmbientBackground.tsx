"use client";

import { useReducedMotion } from "../../hooks/useReducedMotion";
import { CursorGlow } from "../ui/CursorGlow";

export function AmbientBackground() {
  const reducedMotion = useReducedMotion();

  if (reducedMotion) return null;

  return (
    <>
      <div className="ambient-glow" aria-hidden="true" />
      <CursorGlow />
    </>
  );
}
