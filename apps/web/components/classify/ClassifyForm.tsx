"use client";

import { useState, useCallback, useEffect } from "react";
import { classifyEmail, type ClassifyResponse } from "@/lib/api/classify";
import { cn } from "@/lib/utils";

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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="classify-subject"
          className="block text-sm font-medium text-muted-foreground mb-1.5"
        >
          Subject <span className="text-muted-foreground/60">(optional)</span>
        </label>
        <input
          id="classify-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Urgent: verify your account"
          disabled={loading}
          className={cn(
            "w-full rounded-lg border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground",
            "placeholder:text-muted-foreground/50",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors"
          )}
        />
      </div>

      <div>
        <label
          htmlFor="classify-body"
          className="block text-sm font-medium text-muted-foreground mb-1.5"
        >
          Email Body
        </label>
        <textarea
          id="classify-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Paste the email body here..."
          rows={5}
          disabled={loading}
          className={cn(
            "w-full rounded-lg border border-border bg-background/60 px-4 py-2.5 text-sm text-foreground resize-y min-h-[120px]",
            "placeholder:text-muted-foreground/50",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-colors"
          )}
        />
      </div>

      {error && (
        <p className="text-sm text-risk-high" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading || (!body.trim() && !subject.trim())}
        className={cn(
          "w-full rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground",
          "hover:bg-primary/90 active:bg-primary/80",
          "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-colors"
        )}
      >
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
            Classifying…
          </span>
        ) : (
          "Classify"
        )}
      </button>
    </form>
  );
}
