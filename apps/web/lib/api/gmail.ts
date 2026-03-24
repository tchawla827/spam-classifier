const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GmailStatusResponse {
  connected: boolean;
  email: string | null;
  scopes: string[];
  connected_at: string | null;
}

export interface GmailMessage {
  gmail_message_id: string;
  thread_id: string;
  subject: string | null;
  from: string | null;
  snippet: string | null;
  received_at: string;
  has_attachments: boolean;
}

export interface GmailMessagesResponse {
  items: GmailMessage[];
  next_cursor: string | null;
}

export interface GmailClassifyResult {
  history_id: string;
  source: "gmail";
  message: {
    gmail_message_id: string;
    subject: string | null;
    from: string | null;
  };
  result: {
    final_prediction: "spam" | "not_spam";
    final_risk_score: number;
    risk_band: "low" | "medium" | "high";
    review_state: string | null;
    personalized: boolean;
    personalization_reasons: string[] | null;
  };
}

export interface GmailBatchClassifyResponse {
  results: GmailClassifyResult[];
}

export interface GmailMessagesParams {
  cursor?: string;
  limit?: number;
  label?: string;
  q?: string;
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function getGmailStatus(): Promise<GmailStatusResponse> {
  const res = await fetch(`${API_BASE}/api/v1/gmail/status`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch Gmail status (${res.status})`);
  return res.json();
}

export async function startGmailConnect(): Promise<{ auth_url: string }> {
  const res = await fetch(`${API_BASE}/api/v1/gmail/connect/start`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to start Gmail connect (${res.status})`);
  return res.json();
}

export async function disconnectGmail(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/gmail/disconnect`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to disconnect Gmail (${res.status})`);
}

export async function getGmailMessages(
  params: GmailMessagesParams = {}
): Promise<GmailMessagesResponse> {
  const url = new URL(`${API_BASE}/api/v1/gmail/messages`);
  if (params.cursor) url.searchParams.set("cursor", params.cursor);
  if (params.limit) url.searchParams.set("limit", String(params.limit));
  if (params.label) url.searchParams.set("label", params.label);
  if (params.q) url.searchParams.set("q", params.q);

  const res = await fetch(url.toString(), { credentials: "include" });
  if (!res.ok) throw new Error(`Failed to fetch Gmail messages (${res.status})`);
  return res.json();
}

export async function classifyGmailMessage(
  messageId: string
): Promise<GmailClassifyResult> {
  const res = await fetch(`${API_BASE}/api/v1/gmail/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ gmail_message_id: messageId }),
  });
  if (!res.ok) throw new Error(`Failed to classify Gmail message (${res.status})`);
  return res.json();
}

export async function classifyGmailBatch(
  messageIds: string[]
): Promise<GmailBatchClassifyResponse> {
  const res = await fetch(`${API_BASE}/api/v1/gmail/classify-batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ gmail_message_ids: messageIds }),
  });
  if (!res.ok) throw new Error(`Failed to batch classify Gmail messages (${res.status})`);
  return res.json();
}
