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

const RISK_BAR = {
  high: "bg-risk-high",
  medium: "bg-risk-medium",
  low: "bg-risk-low",
} as const;

// Personalization reason → display label mapping
const REASON_LABELS: Record<string, string> = {
  global_model: "Global Model",
  sender_override: "Sender Override",
  domain_override: "Sender Override",
  sensitivity_threshold: "Sensitivity Threshold",
  feedback_adjustment: "Feedback Adjustment",
};

function formatReason(reason: string): string {
  return REASON_LABELS[reason] ?? reason
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

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
  const isPersonalized = result.personalized === true;
  const isReview = result.review_state === "review";

  // Verdict badge appearance: review state gets amber treatment
  const verdictLabel = isReview ? "Review" : isSpam ? "Spam" : "Safe";
  const verdictColor = isReview
    ? "bg-amber-400/15 text-amber-400"
    : isSpam
    ? RISK_COLORS.high
    : RISK_COLORS.low;
  const verdictDot = isReview
    ? "bg-amber-400"
    : isSpam
    ? RISK_DOT.high
    : RISK_DOT.low;

  return (
    <motion.div
      initial={reducedMotion ? {} : { opacity: 0, clipPath: "inset(0 0 100% 0)" }}
      animate={{ opacity: 1, clipPath: "inset(0 0 0 0)" }}
      transition={reducedMotion ? { duration: 0.01 } : { duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      className="glass rounded-xl overflow-hidden shadow-glow-sm"
    >
      {/* Verdict header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold",
              verdictColor
            )}
          >
            <span className={cn("h-2 w-2 rounded-full", verdictDot)} />
            {verdictLabel}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium",
              RISK_COLORS[result.risk_band]
            )}
          >
            {result.risk_band} risk
          </span>
          {isPersonalized && (
            <span className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium bg-violet-500/15 text-violet-400">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
              Personalized
            </span>
          )}
        </div>
        <span className="text-sm font-mono text-muted-foreground">
          {(result.final_risk_score * 100).toFixed(1)}%
        </span>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
        <div className="bg-surface-1/40 px-5 py-3">
          <p className="text-xs text-muted-foreground">Ensemble Confidence</p>
          <p className="text-lg font-semibold text-foreground font-mono">
            {(result.ensemble.confidence * 100).toFixed(1)}%
          </p>
        </div>
        <div className="bg-surface-1/40 px-5 py-3">
          <p className="text-xs text-muted-foreground">Model Agreement</p>
          <p className="text-lg font-semibold text-foreground font-mono">
            {(result.agreement_ratio * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Explanation signals */}
      {result.explanations.top_signals.length > 0 && (
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <p className="text-xs text-muted-foreground mb-2">Key Signals</p>
          <div className="flex flex-wrap gap-1.5">
            {result.explanations.top_signals.map((signal) => (
              <span
                key={signal}
                className="inline-flex items-center rounded-md border border-white/[0.06] px-2 py-0.5 text-xs text-muted-foreground"
              >
                {signal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Personalization reasons */}
      {isPersonalized && result.personalization_reasons && result.personalization_reasons.length > 0 && (
        <div className="px-5 py-4 border-t border-white/[0.06]">
          <p className="text-xs text-muted-foreground mb-2">Decision Sources</p>
          <div className="flex flex-wrap gap-1.5">
            {result.personalization_reasons.map((reason) => (
              <span
                key={reason}
                className="inline-flex items-center rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-xs text-violet-400"
              >
                {formatReason(reason)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Per-model breakdown */}
      <div className="px-5 py-4 border-t border-white/[0.06]">
        <p className="text-xs text-muted-foreground mb-3">Model Breakdown</p>
        <div className="space-y-3">
          {result.models.map((model) => (
            <div key={model.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-foreground">
                  {formatModelName(model.name)}
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
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
              {/* Confidence bar */}
              <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    model.prediction === "spam" ? RISK_BAR.high : RISK_BAR.low
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${model.confidence * 100}%` }}
                  transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
