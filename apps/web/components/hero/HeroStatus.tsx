"use client";

import { useHeroStore } from "@/lib/hero/heroState";

export function HeroStatus() {
  const statusLabel = useHeroStore((s) => s.statusLabel);
  const removedCount = useHeroStore((s) => s.removedCount);
  const totalPapers = useHeroStore((s) => s.totalPapers);
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

      {isComplete && (
        <a
          href="#demo"
          className="ml-3 inline-flex items-center rounded-md bg-primary/90 px-3 py-1 text-xs font-semibold text-primary-foreground hover:brightness-110 transition-all"
        >
          Try Demo
        </a>
      )}
    </div>
  );
}
