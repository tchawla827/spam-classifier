"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useHeroStore } from "@/lib/hero/heroState";

export function HeroStatus() {
  const statusLabel = useHeroStore((s) => s.statusLabel);
  const isComplete = useHeroStore((s) => s.isComplete);

  return (
    <div
      className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-sm border border-border rounded-full px-4 py-2 text-sm"
      role="status"
      aria-live="polite"
    >
      <span
        className={`inline-block h-2 w-2 rounded-full ${
          isComplete ? "bg-risk-low" : "bg-primary"
        }`}
      />
      <span className="text-muted-foreground">{statusLabel}</span>

      <AnimatePresence>
        {isComplete && (
          <motion.a
            href="#demo"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="ml-3 inline-flex items-center rounded-md bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground hover:brightness-110 transition-all active:scale-[0.97] focus-ring"
          >
            Try Demo
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
