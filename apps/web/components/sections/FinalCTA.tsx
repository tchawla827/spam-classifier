"use client";

import { ArrowRight } from "lucide-react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { getRevealProps } from "../../lib/motion";
import { useCallback, useRef } from "react";

const PARTICLES = Array.from({ length: 6 }, (_, i) => ({
  id: i,
  left: `${15 + i * 14}%`,
  delay: `${i * 1.1}s`,
  duration: `${5 + i * 0.8}s`,
  size: 2 + (i % 3),
}));

export function FinalCTA() {
  const reducedMotion = useReducedMotion();
  const buttonRef = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const translateX = useTransform(x, [-100, 100], [-4, 4]);
  const translateY = useTransform(y, [-100, 100], [-4, 4]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (reducedMotion) return;
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        x.set(dx * 0.3);
        y.set(dy * 0.3);
      } else {
        x.set(0);
        y.set(0);
      }
    },
    [reducedMotion, x, y]
  );

  const handleMouseLeave = useCallback(() => {
    x.set(0);
    y.set(0);
  }, [x, y]);

  return (
    <section
      aria-label="Call to action"
      className="py-20 lg:py-28"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <motion.div
          {...getRevealProps(0, reducedMotion)}
          className={cn(
            "relative rounded-2xl overflow-hidden",
            "glass border border-white/[0.06]",
            "px-6 py-16 sm:px-12 sm:py-20 text-center"
          )}
        >
          {/* Animated mesh gradient background */}
          <div
            className="absolute inset-0 opacity-40"
            aria-hidden="true"
            style={{
              background:
                "radial-gradient(ellipse 50% 60% at 30% 40%, hsl(263 84% 58% / 0.3) 0%, transparent 70%), radial-gradient(ellipse 40% 50% at 70% 60%, hsl(188 95% 43% / 0.2) 0%, transparent 70%)",
            }}
          />

          {/* Floating particles */}
          {!reducedMotion &&
            PARTICLES.map((p) => (
              <span
                key={p.id}
                className="absolute rounded-full bg-primary/30 animate-float-drift pointer-events-none"
                aria-hidden="true"
                style={{
                  left: p.left,
                  bottom: "10%",
                  width: p.size,
                  height: p.size,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                }}
              />
            ))}

          {/* Shimmer overlay */}
          <span
            className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
            aria-hidden="true"
          >
            <span className="absolute inset-0 -translate-x-full rotate-[-15deg] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-[shimmer-once_2s_ease-out_0.8s_forwards]" />
          </span>

          <h2 className="relative z-[2] font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-transparent">
            Ready to clean up your inbox?
          </h2>
          <p className="relative z-[2] mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Try the spam classifier now. Paste an email, get an instant
            verdict &mdash; no signup required.
          </p>
          <div className="relative z-[2] mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <motion.a
              ref={buttonRef}
              href="#demo"
              style={reducedMotion ? {} : { x: translateX, y: translateY }}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-8 py-3.5 text-sm font-semibold",
                "bg-gradient-to-r from-primary to-cyan text-primary-foreground",
                "hover:shadow-glow-lg transition-shadow duration-200",
                "hover:brightness-110 active:scale-[0.97]",
                "focus-ring"
              )}
            >
              Try the Classifier
              <ArrowRight className="h-4 w-4" />
            </motion.a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
