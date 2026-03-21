"use client";

import { forwardRef } from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface HistoryToggleButtonProps {
  onClick: () => void;
  count: number;
  isHydrated: boolean;
}

export const HistoryToggleButton = forwardRef<HTMLButtonElement, HistoryToggleButtonProps>(
  function HistoryToggleButton({ onClick, count, isHydrated }, ref) {
    if (!isHydrated) return null;

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-label={`Open history panel${count > 0 ? `, ${count} saved result${count === 1 ? "" : "s"}` : ""}`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5",
          "text-sm text-muted-foreground bg-card/60",
          "hover:bg-card hover:text-foreground hover:border-border/80 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary/40"
        )}
      >
        <Clock className="h-3.5 w-3.5" />
        <span>History</span>
        {count > 0 && (
          <span
            className="inline-flex items-center justify-center rounded-full bg-primary/20 text-primary text-xs font-semibold min-w-[1.25rem] h-5 px-1"
            aria-hidden="true"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
    );
  }
);
