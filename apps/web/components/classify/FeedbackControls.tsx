"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown, AlertCircle, HelpCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import {
  submitFeedback,
  type FeedbackLabel,
  type RuleSuggestion,
} from "../../lib/api/feedback";

interface FeedbackOption {
  label: FeedbackLabel;
  display: string;
  icon: React.ElementType;
  description: string;
  variant: "positive" | "negative" | "neutral";
}

const FEEDBACK_OPTIONS: FeedbackOption[] = [
  {
    label: "correct_spam",
    display: "Correct — Spam",
    icon: ThumbsUp,
    description: "This was spam",
    variant: "negative",
  },
  {
    label: "correct_safe",
    display: "Correct — Safe",
    icon: ThumbsUp,
    description: "This was safe",
    variant: "positive",
  },
  {
    label: "false_positive",
    display: "False Positive",
    icon: AlertCircle,
    description: "Not actually spam",
    variant: "neutral",
  },
  {
    label: "false_negative",
    display: "False Negative",
    icon: ThumbsDown,
    description: "Missed spam",
    variant: "neutral",
  },
  {
    label: "not_sure",
    display: "Not Sure",
    icon: HelpCircle,
    description: "Unsure",
    variant: "neutral",
  },
];

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
  onFeedbackSubmitted?: (label: FeedbackLabel, suggestion: RuleSuggestion | null) => void;
}

export function FeedbackControls({
  historyId,
  onFeedbackSubmitted,
}: FeedbackControlsProps) {
  const { isAuthenticated } = useAuth();
  const [selected, setSelected] = useState<FeedbackLabel | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        <span>Feedback saved — thank you.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Was this classification correct?</p>
      <div className="flex flex-wrap gap-1.5">
        {FEEDBACK_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.label;
          return (
            <button
              key={opt.label}
              type="button"
              disabled={loading}
              onClick={() => handleSelect(opt)}
              aria-pressed={isSelected}
              aria-label={opt.display}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border",
                "transition-all duration-150 focus-ring",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                isSelected
                  ? SELECTED_STYLES[opt.variant]
                  : VARIANT_STYLES[opt.variant]
              )}
            >
              {loading && isSelected ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Icon className="h-3 w-3" />
              )}
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
