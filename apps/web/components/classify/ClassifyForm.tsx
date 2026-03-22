"use client";

import { useState, useCallback, useEffect } from "react";
import { classifyEmail, type ClassifyResponse } from "../../lib/api/classify";
import { cn } from "../../lib/utils";

interface ClassifyFormProps {
  onResult: (result: ClassifyResponse, subject: string, body: string) => void;
  initialSubject?: string;
  initialBody?: string;
}

export function ClassifyForm({ onResult, initialSubject = "", initialBody = "" }: ClassifyFormProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);

  useEffect(() => {
    setSubject(initialSubject);
    setBody(initialBody);
  }, [initialSubject, initialBody]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!body.trim() && !subject.trim()) {
        setError("Please enter a subject or body to classify.");
        return;
      }

      setError(null);
      setLoading(true);

      try {
        const result = await classifyEmail({
          subject: subject.trim() || undefined,
          body: body.trim() || undefined,
        });
        onResult(result, subject.trim(), body.trim());
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [subject, body, onResult]
  );

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full space-y-5">
      {/* Floating label input — Subject */}
      <div className="relative">
        <input
          id="classify-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder=" "
          disabled={loading}
          className={cn(
            "peer w-full rounded-lg border border-white/[0.08] bg-surface-1/40 backdrop-blur-sm px-4 pt-5 pb-2 text-sm text-foreground",
            "placeholder-transparent",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:shadow-[0_0_12px_hsl(var(--primary)/0.15)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200"
          )}
        />
        <label
          htmlFor="classify-subject"
          className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground/70 pointer-events-none",
            "transition-all duration-200",
            "peer-focus:top-2.5 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-primary",
            "peer-[:not(:placeholder-shown)]:top-2.5 peer-[:not(:placeholder-shown)]:translate-y-0 peer-[:not(:placeholder-shown)]:text-xs"
          )}
        >
          Subject <span className="text-muted-foreground/40">(optional)</span>
        </label>
      </div>

      {/* Floating label textarea — Body */}
      <div className="relative">
        <textarea
          id="classify-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder=" "
          rows={5}
          disabled={loading}
          className={cn(
            "peer w-full rounded-lg border border-white/[0.08] bg-surface-1/40 backdrop-blur-sm px-4 pt-6 pb-2 text-sm text-foreground resize-y min-h-[120px]",
            "placeholder-transparent",
            "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 focus:shadow-[0_0_12px_hsl(var(--primary)/0.15)]",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all duration-200"
          )}
        />
        <label
          htmlFor="classify-body"
          className={cn(
            "absolute left-4 top-4 text-sm text-muted-foreground/70 pointer-events-none",
            "transition-all duration-200",
            "peer-focus:top-1.5 peer-focus:text-xs peer-focus:text-primary",
            "peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs"
          )}
        >
          Email Body
        </label>
      </div>

      {error && (
        <div className="flex items-start gap-2 border-l-2 border-risk-high pl-3">
          <p className="text-sm text-risk-high" role="alert">
            {error}
          </p>
        </div>
      )}

      <div className="flex-1" />

      <button
        type="submit"
        disabled={loading || (!body.trim() && !subject.trim())}
        className={cn(
          "relative w-full rounded-lg px-6 py-2.5 text-sm font-semibold text-primary-foreground overflow-hidden",
          "bg-gradient-to-r from-primary to-primary/80",
          "hover:shadow-glow-md",
          "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all duration-200"
        )}
      >
        {/* Scanning animation overlay */}
        {loading && (
          <span
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.08] to-transparent animate-[shimmer-once_1s_ease-in-out_infinite]"
            aria-hidden="true"
          />
        )}
        <span className="relative">
          {loading ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="animate-spin h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Classifying...
            </span>
          ) : (
            "Classify"
          )}
        </span>
      </button>
    </form>
  );
}
