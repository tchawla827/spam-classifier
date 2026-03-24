const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type FeedbackLabel =
  | "correct_spam"
  | "correct_safe"
  | "false_positive"
  | "false_negative"
  | "not_sure";

export interface RuleSuggestion {
  type: string;
  sender?: string;
  domain?: string;
  suggested: boolean;
}

export interface SubmitFeedbackResponse {
  success: boolean;
  feedback_id: string;
  rule_suggestion: RuleSuggestion | null;
}

export async function submitFeedback(
  historyId: string,
  label: FeedbackLabel,
  reason?: string
): Promise<SubmitFeedbackResponse> {
  const res = await fetch(`${API_BASE}/api/v1/feedback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      history_id: historyId,
      feedback_label: label,
      reason,
    }),
  });
  if (!res.ok) throw new Error(`Failed to submit feedback (${res.status})`);
  return res.json();
}

export async function deleteFeedback(feedbackId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/feedback/${feedbackId}`, {
    method: "DELETE",
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to delete feedback (${res.status})`);
}
