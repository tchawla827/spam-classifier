const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface DomainCount {
  domain: string;
  count: number;
}

export interface InsightsSummary {
  total_classifications: number;
  spam_detected: number;
  safe_detected: number;
  review_count: number;
  false_positive_count: number;
  false_negative_count: number;
  top_flagged_domains: DomainCount[];
}

export async function getInsights(): Promise<InsightsSummary> {
  const res = await fetch(`${API_BASE}/api/v1/insights/summary`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to fetch insights (${res.status})`);
  return res.json();
}
