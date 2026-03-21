"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { HistoryItem } from "@/lib/api/classify";

const RISK_STYLES = {
  high: { dot: "bg-risk-high", label: "text-risk-high", badge: "bg-risk-high/10" },
  medium: { dot: "bg-risk-medium", label: "text-risk-medium", badge: "bg-risk-medium/10" },
  low: { dot: "bg-risk-low", label: "text-risk-low", badge: "bg-risk-low/10" },
} as const;

function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  return new Date(isoString).toLocaleDateString();
}

interface HistoryItemCardProps {
  item: HistoryItem;
  isActive: boolean;
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}

export function HistoryItemCard({ item, isActive, onSelect, onDelete }: HistoryItemCardProps) {
  const { result } = item;
  const risk = RISK_STYLES[result.risk_band];
  const isSpam = result.final_prediction === "spam";
  const scorePercent = Math.round(result.final_risk_score * 100);

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item)}
        className={cn(
          "group w-full text-left rounded-lg border px-3 py-3 transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary/40",
          isActive
            ? "border-primary/60 bg-primary/5 border-l-2"
            : "border-border bg-card/60 hover:bg-card hover:border-border/80"
        )}
        aria-label={`Restore result: ${item.subject || "no subject"}, ${isSpam ? "spam" : "not spam"}, ${scorePercent}% risk`}
        aria-pressed={isActive}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={cn("shrink-0 h-2 w-2 rounded-full mt-0.5", risk.dot)}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-semibold", risk.label)}>
                  {isSpam ? "Spam" : "Safe"}
                </span>
                <span className="text-xs font-mono text-muted-foreground">
                  {scorePercent}%
                </span>
              </div>
              <p className="text-xs text-foreground/80 truncate mt-0.5">
                {item.subject ? (
                  item.subject
                ) : (
                  <span className="italic text-muted-foreground/60">(no subject)</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground/50 whitespace-nowrap">
              {formatRelativeTime(item.savedAt)}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              aria-label={`Delete history item: ${item.subject || "no subject"}`}
              className={cn(
                "rounded p-1 text-muted-foreground/40 transition-colors",
                "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                "hover:text-risk-high hover:bg-risk-high/10",
                "focus:outline-none focus:ring-1 focus:ring-primary/40 focus:opacity-100"
              )}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      </button>
    </li>
  );
}
