import { getCached, invalidateCached, prefetchCached } from "../client-cache";
import { invalidateInsightsCache } from "./insights";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface FeedbackSummary {
  feedback_label: string;
  reason: string | null;
  created_at: string;
}

export interface HistoryItemResponse {
  id: string;
  source: "manual" | "gmail";
  subject: string | null;
  sender: string | null;
  final_prediction: "spam" | "not_spam";
  final_risk_score: number;
  risk_band: "low" | "medium" | "high";
  personalized: boolean;
  saved_at: string;
}

export interface HistoryDetailResponse extends HistoryItemResponse {
  review_state: string | null;
  personalization_reasons: string[] | null;
  agreement_ratio: number;
  model_version: string;
  feedback: FeedbackSummary[];
}

export interface HistoryListResponse {
  items: HistoryItemResponse[];
  next_cursor: string | null;
  total_count: number | null;
}

export interface ClearHistoryResponse {
  deleted_count: number;
}

export interface HistoryQueryParams {
  cursor?: string;
  limit?: number;
  source?: "manual" | "gmail";
  verdict?: "spam" | "not_spam" | "review";
  query?: string;
}

const HISTORY_LIST_CACHE_PREFIX = "history:list:";
const HISTORY_DETAIL_CACHE_PREFIX = "history:detail:";
const HISTORY_LIST_CACHE_TTL_MS = 60 * 1000;
const HISTORY_DETAIL_CACHE_TTL_MS = 5 * 60 * 1000;

function getHistoryListCacheKey(params: HistoryQueryParams): string {
  return `${HISTORY_LIST_CACHE_PREFIX}${JSON.stringify({
    cursor: params.cursor ?? null,
    limit: params.limit ?? null,
    source: params.source ?? null,
    verdict: params.verdict ?? null,
    query: params.query ?? null,
  })}`;
}

export async function getHistory(
  params: HistoryQueryParams = {}
): Promise<HistoryListResponse> {
  const load = async () => {
    const url = new URL(`${API_BASE}/api/v1/history`);
    if (params.cursor) url.searchParams.set("cursor", params.cursor);
    if (params.limit) url.searchParams.set("limit", String(params.limit));
    if (params.source) url.searchParams.set("source", params.source);
    if (params.verdict) url.searchParams.set("verdict", params.verdict);
    if (params.query) url.searchParams.set("q", params.query);

    const res = await fetch(url.toString(), { credentials: "include" });
    if (!res.ok) throw new Error(`Failed to fetch history (${res.status})`);
    return res.json();
  };

  if (params.cursor) {
    return load();
  }

  return getCached({
    key: getHistoryListCacheKey(params),
    ttlMs: HISTORY_LIST_CACHE_TTL_MS,
    loader: load,
  });
}

export async function getHistoryItem(id: string): Promise<HistoryDetailResponse> {
  return getCached({
    key: `${HISTORY_DETAIL_CACHE_PREFIX}${id}`,
    ttlMs: HISTORY_DETAIL_CACHE_TTL_MS,
    loader: async () => {
      const res = await fetch(`${API_BASE}/api/v1/history/${id}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch history item (${res.status})`);
      return res.json();
    },
  });
}

export function prefetchHistory(params: HistoryQueryParams = {}): void {
  if (params.cursor) return;

  prefetchCached({
    key: getHistoryListCacheKey(params),
    ttlMs: HISTORY_LIST_CACHE_TTL_MS,
    loader: async () => {
      const url = new URL(`${API_BASE}/api/v1/history`);
      if (params.limit) url.searchParams.set("limit", String(params.limit));
      if (params.source) url.searchParams.set("source", params.source);
      if (params.verdict) url.searchParams.set("verdict", params.verdict);
      if (params.query) url.searchParams.set("q", params.query);

      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error(`Failed to fetch history (${res.status})`);
      return res.json();
    },
  });
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/history/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to delete history item (${res.status})`);
  invalidateCached(HISTORY_LIST_CACHE_PREFIX);
  invalidateCached(`${HISTORY_DETAIL_CACHE_PREFIX}${id}`);
  invalidateInsightsCache();
}

export async function clearHistory(): Promise<ClearHistoryResponse> {
  const res = await fetch(`${API_BASE}/api/v1/history/clear`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to clear history (${res.status})`);
  invalidateCached(HISTORY_LIST_CACHE_PREFIX);
  invalidateCached(HISTORY_DETAIL_CACHE_PREFIX);
  invalidateInsightsCache();
  return res.json();
}
