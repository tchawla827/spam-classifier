"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { getRevealProps } from "../../lib/motion";

export function FinalCTA() {
  const reducedMotion = useReducedMotion();

  return (
    <section aria-label="Call to action" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <motion.div
          {...getRevealProps(0, reducedMotion)}
          className={cn(
            "relative rounded-2xl border border-border overflow-hidden",
            "bg-gradient-to-br from-card/90 via-card/70 to-primary/8",
            "px-6 py-16 sm:px-12 sm:py-20 text-center",
            "shimmer-container"
          )}
        >
          {/* Shimmer overlay */}
          <span
            className="pointer-events-none absolute inset-0 z-[1] overflow-hidden"
            aria-hidden="true"
          >
            <span className="absolute inset-0 -translate-x-full rotate-[-15deg] bg-gradient-to-r from-transparent via-white/[0.04] to-transparent animate-[shimmer-once_1.5s_ease-out_0.8s_forwards]" />
          </span>

          <h2 className="relative z-[2] text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
            Ready to clean up your inbox?
          </h2>
          <p className="relative z-[2] mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Try the spam classifier now. Paste an email, get an instant
            verdict &mdash; no signup required.
          </p>
          <div className="relative z-[2] mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="#demo"
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-8 py-3.5 text-sm font-semibold",
                "bg-primary text-primary-foreground",
                "hover:shadow-[0_0_32px_hsl(var(--primary-glow)/0.5)] transition-all duration-200",
                "hover:brightness-110 active:scale-[0.97]",
                "focus-ring"
              )}
            >
              Try the Classifier
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
