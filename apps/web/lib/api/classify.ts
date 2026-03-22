export interface ClassifyRequest {
  subject?: string;
  body?: string;
  mode?: "email";
}

export interface ModelOutput {
  name: string;
  prediction: "spam" | "not_spam";
  confidence: number;
}

export interface ClassifyResponse {
  request_id: string;
  mode: "email";
  final_prediction: "spam" | "not_spam";
  final_risk_score: number;
  risk_band: "low" | "medium" | "high";
  agreement_ratio: number;
  models: ModelOutput[];
  ensemble: {
    name: string;
    prediction: "spam" | "not_spam";
    confidence: number;
  };
  explanations: {
    top_signals: string[];
    subject_signals: string[];
    body_signals: string[];
  };
  model_version: string;
  timestamp: string;
}

export interface HistoryItem {
  id: string;
  savedAt: string;
  subject: string;
  body: string;
  result: ClassifyResponse;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function classifyEmail(
  request: ClassifyRequest
): Promise<ClassifyResponse> {
  const res = await fetch(`${API_BASE}/api/v1/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, mode: "email" }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(
      err?.error?.message || `Classification failed (${res.status})`
    );
  }

  return res.json();
}
