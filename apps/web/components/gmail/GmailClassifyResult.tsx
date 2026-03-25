"use client";

import { AlertTriangle, ShieldCheck, Info, XCircle } from "lucide-react";
import { cn } from "../../lib/utils";
import type { GmailClassifyResult } from "../../lib/api/gmail";

interface GmailClassifyResultProps {
  result: GmailClassifyResult;
}

export function GmailClassifyResultBadge({ result }: GmailClassifyResultProps) {
  if ("error" in result.result) {
    return (
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-destructive/80">
        <XCircle className="h-3 w-3 shrink-0" />
        <span>{result.result.error}</span>
      </div>
    );
  }

  const { final_prediction, final_risk_score, risk_band, personalized, personalization_reasons } =
    result.result;
  const isSpam = final_prediction === "spam";
  const pct = Math.round(final_risk_score * 100);

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {/* Verdict row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold",
            isSpam
              ? "bg-destructive/15 text-destructive"
              : "bg-emerald-500/15 text-emerald-400"
          )}
        >
          {isSpam ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <ShieldCheck className="h-3 w-3" />
          )}
          {isSpam ? "Spam" : "Safe"}
        </span>

        <span
          className={cn(
            "text-[11px] font-mono font-medium px-1.5 py-0.5 rounded",
            risk_band === "high"
              ? "bg-destructive/10 text-destructive/80"
              : risk_band === "medium"
              ? "bg-amber-400/10 text-amber-400"
              : "bg-emerald-500/10 text-emerald-400"
          )}
        >
          {pct}%
        </span>

        {personalized && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] bg-primary/10 text-primary">
            <Info className="h-2.5 w-2.5" />
            Personalized
          </span>
        )}
      </div>

      {/* Personalization reasons */}
      {personalization_reasons && personalization_reasons.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {personalization_reasons.map((r, i) => (
            <li
              key={i}
              className="text-[10px] text-muted-foreground/70 bg-surface-3/40 rounded px-1.5 py-0.5 border border-white/[0.04]"
            >
              {r}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
