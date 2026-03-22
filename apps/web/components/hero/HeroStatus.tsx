"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useHeroStore } from "../../lib/hero/heroState";

export function HeroStatus() {
  const statusLabel = useHeroStore((s) => s.statusLabel);
  const isComplete = useHeroStore((s) => s.isComplete);
  const removedCount = useHeroStore((s) => s.removedCount);
  const totalPapers = useHeroStore((s) => s.papers.length);
  const progress = totalPapers > 0 ? removedCount / totalPapers : 0;

  return (
    <div
      className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 text-sm"
      role="status"
      aria-live="polite"
    >
      <span
        className={`inline-block h-2 w-2 rounded-full transition-colors ${
          isComplete ? "bg-risk-low" : "bg-primary animate-pulse"
        }`}
      />
      <span className="text-muted-foreground">{statusLabel}</span>

      {/* Progress bar */}
      <div className="w-16 h-1 rounded-full bg-surface-2 overflow-hidden ml-1">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-cyan"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
        />
      </div>

      <AnimatePresence>
        {isComplete && (
          <motion.a
            href="#demo"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="ml-2 inline-flex items-center rounded-md bg-gradient-to-r from-primary to-primary/80 px-3 py-1 text-xs font-semibold text-primary-foreground hover:brightness-110 transition-all active:scale-[0.97] focus-ring"
          >
            Try Demo
          </motion.a>
        )}
      </AnimatePresence>
    </div>
  );
}
