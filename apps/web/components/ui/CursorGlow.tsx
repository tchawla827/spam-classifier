"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (reducedMotion) return;

    // Skip on touch devices
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    const el = ref.current;
    if (!el) return;

    let rafId: number | null = null;
    let x = 0;
    let y = 0;

    const onMove = (e: MouseEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          el.style.setProperty("--glow-x", `${x}px`);
          el.style.setProperty("--glow-y", `${y}px`);
          rafId = null;
        });
      }
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[-1] pointer-events-none hidden lg:block"
      aria-hidden="true"
      style={{
        background:
          "radial-gradient(600px circle at var(--glow-x, 50%) var(--glow-y, 50%), hsl(263 84% 58% / 0.04), transparent 60%)",
      }}
    />
  );
}
