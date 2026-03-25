"use client";

import { useState } from "react";
import { CheckCircle2, HelpCircle, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import {
  submitFeedback,
  type FeedbackLabel,
  type RuleSuggestion,
} from "../../lib/api/feedback";

type PredictionLabel = "spam" | "not_spam";

interface FeedbackOption {
  label: FeedbackLabel;
  display: string;
  description: string;
  variant: "positive" | "negative" | "neutral";
}

function getFeedbackOptions(prediction: PredictionLabel): FeedbackOption[] {
  if (prediction === "spam") {
    return [
      {
        label: "correct_spam",
        display: "Yes",
        description: "Prediction is correct (spam)",
        variant: "positive",
      },
      {
        label: "false_positive",
        display: "No",
        description: "Should be safe (false positive)",
        variant: "negative",
      },
      {
        label: "not_sure",
        display: "Not sure",
        description: "Unsure",
        variant: "neutral",
      },
    ];
  }

  return [
    {
      label: "correct_safe",
      display: "Yes",
      description: "Prediction is correct (safe)",
      variant: "positive",
    },
    {
      label: "false_negative",
      display: "No",
      description: "Should be spam (false negative)",
      variant: "negative",
    },
    {
      label: "not_sure",
      display: "Not sure",
      description: "Unsure",
      variant: "neutral",
    },
  ];
}

const VARIANT_STYLES = {
  positive:
    "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50",
  negative:
    "border-destructive/30 text-destructive/80 hover:bg-destructive/10 hover:border-destructive/50",
  neutral:
    "border-white/[0.08] text-muted-foreground hover:bg-surface-3/60 hover:text-foreground hover:border-white/[0.15]",
};

const SELECTED_STYLES = {
  positive: "bg-emerald-500/15 border-emerald-500/50 text-emerald-400",
  negative: "bg-destructive/15 border-destructive/50 text-destructive",
  neutral: "bg-surface-3/80 border-white/[0.15] text-foreground",
};

interface FeedbackControlsProps {
  historyId: string;
  predictedLabel: PredictionLabel;
  onFeedbackSubmitted?: (label: FeedbackLabel, suggestion: RuleSuggestion | null) => void;
}

export function FeedbackControls({
  historyId,
  predictedLabel,
  onFeedbackSubmitted,
}: FeedbackControlsProps) {
  const { isAuthenticated } = useAuth();
  const [selected, setSelected] = useState<FeedbackLabel | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const options = getFeedbackOptions(predictedLabel);

  if (!isAuthenticated) return null;

  const handleSelect = async (option: FeedbackOption) => {
    if (loading || submitted) return;
    if (selected === option.label) return;

    setSelected(option.label);
    setError(null);
    setLoading(true);

    try {
      const res = await submitFeedback(historyId, option.label);
      setSubmitted(true);
      onFeedbackSubmitted?.(option.label, res.rule_suggestion);
    } catch {
      setError("Failed to save feedback.");
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-emerald-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Feedback saved.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Is the prediction correct?</p>
      <p className="text-[11px] text-muted-foreground/80">
        Predicted as {predictedLabel === "spam" ? "spam" : "safe"}.{" "}
        {predictedLabel === "spam"
          ? "No marks this as false positive."
          : "No marks this as false negative."}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const isSelected = selected === opt.label;
          return (
            <button
              key={opt.label}
              type="button"
              disabled={loading}
              onClick={() => handleSelect(opt)}
              aria-pressed={isSelected}
              aria-label={opt.description}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border",
                "transition-all duration-150 focus-ring",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected
                  ? SELECTED_STYLES[opt.variant]
                  : VARIANT_STYLES[opt.variant]
              )}
              title={opt.description}
            >
              {loading && isSelected && <Loader2 className="h-3 w-3 animate-spin" />}
              {!loading && opt.label === "not_sure" && <HelpCircle className="h-3 w-3" />}
              {opt.display}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
