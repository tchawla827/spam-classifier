"use client";

import { X } from "lucide-react";
import { useHeroStore } from "@/lib/hero/heroState";
import { cn } from "@/lib/utils";

export function AccessibleControls() {
  const papers = useHeroStore((s) => s.papers);
  const selectPaper = useHeroStore((s) => s.selectPaper);
  const activePapers = papers.filter((p) => p.status === "idle" || p.status === "hovered");

  if (activePapers.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Spam removal controls"
      className="flex flex-wrap gap-2 mt-4"
    >
      {activePapers.map((paper) => (
        <button
          key={paper.id}
          onClick={() => selectPaper(paper.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium",
            "text-muted-foreground hover:text-foreground hover:border-primary/50",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          )}
          aria-label={`Remove ${paper.label} spam`}
        >
          <X className="h-3 w-3" />
          {paper.label}
        </button>
      ))}
    </div>
  );
}
