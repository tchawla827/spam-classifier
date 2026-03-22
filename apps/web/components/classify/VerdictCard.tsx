"use client";

import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import type { ClassifyResponse } from "../../lib/api/classify";
import { useReducedMotion } from "../../hooks/useReducedMotion";

const RISK_COLORS = {
  high: "bg-risk-high/15 text-risk-high",
  medium: "bg-risk-medium/15 text-risk-medium",
  low: "bg-risk-low/15 text-risk-low",
} as const;

const RISK_DOT = {
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
} as const;

function formatModelName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface VerdictCardProps {
  result: ClassifyResponse;
}

export function VerdictCard({ result }: VerdictCardProps) {
  const reducedMotion = useReducedMotion();
  const isSpam = result.final_prediction === "spam";

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden shadow-lg"
    >
      {/* Verdict header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold",
              isSpam ? RISK_COLORS.high : RISK_COLORS.low
            )}
          >
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                isSpam ? RISK_DOT.high : RISK_DOT.low
              )}
            />
            {isSpam ? "Spam" : "Safe"}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              RISK_COLORS[result.risk_band]
            )}
          >
            {result.risk_band} risk
          </span>
        </div>
        <span className="text-sm font-mono text-muted-foreground">
          {(result.final_risk_score * 100).toFixed(1)}%
        </span>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-px bg-border">
        <div className="bg-card px-5 py-3">
          <p className="text-xs text-muted-foreground">Ensemble Confidence</p>
          <p className="text-lg font-semibold text-foreground font-mono">
            {(result.ensemble.confidence * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-card px-5 py-3">
          <p className="text-xs text-muted-foreground">Model Agreement</p>
          <p className="text-lg font-semibold text-foreground font-mono">
            {(result.agreement_ratio * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Explanation signals */}
      {result.explanations.top_signals.length > 0 && (
        <div className="px-5 py-4 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Key Signals</p>
          <div className="flex flex-wrap gap-1.5">
            {result.explanations.top_signals.map((signal) => (
              <span
                key={signal}
                className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per-model breakdown */}
      <div className="px-5 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground mb-3">Model Breakdown</p>
        <div className="space-y-2">
          {result.models.map((model) => (
            <div key={model.name} className="flex items-center justify-between">
              <span className="text-sm text-foreground">
                {formatModelName(model.name)}
              </span>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
                    model.prediction === "spam"
                      ? RISK_COLORS.high
                      : RISK_COLORS.low
                  )}
                >
                  <span
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      model.prediction === "spam" ? RISK_DOT.high : RISK_DOT.low
                    )}
                  />
                  {model.prediction === "spam" ? "Spam" : "Safe"}
                </span>
                <span className="text-xs font-mono text-muted-foreground w-14 text-right">
                  {(model.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
