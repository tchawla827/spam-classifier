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
    </div>
  );
}
