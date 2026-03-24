// Re-export shared types so existing imports from this file continue to work.
export type {
  ClassifyRequest,
  ClassifyResponse,
  ModelOutput,
  EnsembleOutput,
  ExplanationOutput,
  HistoryItem,
  ReviewState,
  PredictionLabel,
  RiskBand,
} from "@spam-classifier/types";

import type { ClassifyRequest, ClassifyResponse } from "@spam-classifier/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Thrown when the anonymous rate limit is hit (HTTP 429). */
export class RateLimitError extends Error {
  readonly retryAfter: number; // seconds

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

export async function classifyEmail(
  request: ClassifyRequest
): Promise<ClassifyResponse> {
  const res = await fetch(`${API_BASE}/api/v1/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ...request, mode: "email" }),
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "7200", 10);
    const body = await res.json().catch(() => null);
    throw new RateLimitError(
      body?.error?.message ?? "Free usage limit reached. Sign in to continue.",
      retryAfter
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(
      err?.error?.message || `Classification failed (${res.status})`
    );
  }

  return res.json();
}
