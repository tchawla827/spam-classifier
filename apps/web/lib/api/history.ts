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

export async function getHistory(
  params: HistoryQueryParams = {}
): Promise<HistoryListResponse> {
  const url = new URL(`${API_BASE}/api/v1/history`);
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.source) url.searchParams.set("source", params.source);
  if (params.verdict) url.searchParams.set("verdict", params.verdict);
  if (params.query) url.searchParams.set("query", params.query);

  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch history (${res.status})`);
  return res.json();
}

export async function getHistoryItem(id: string): Promise<HistoryDetailResponse> {
  const res = await fetch(`${API_BASE}/api/v1/history/${id}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch history item (${res.status})`);
  return res.json();
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/history/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to delete history item (${res.status})`);
}

export async function clearHistory(): Promise<ClearHistoryResponse> {
  const res = await fetch(`${API_BASE}/api/v1/history/clear`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to clear history (${res.status})`);
  return res.json();
}
