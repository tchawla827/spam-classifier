import { getCached, invalidateCached, prefetchCached } from "../client-cache";

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

const INSIGHTS_CACHE_KEY = "insights:summary";
const INSIGHTS_CACHE_TTL_MS = 2 * 60 * 1000;

export async function getInsights(): Promise<InsightsSummary> {
  return getCached({
    key: INSIGHTS_CACHE_KEY,
    ttlMs: INSIGHTS_CACHE_TTL_MS,
    loader: async () => {
      const res = await fetch(`${API_BASE}/api/v1/insights/summary`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch insights (${res.status})`);
      return res.json();
    },
  });
}

export function prefetchInsights(): void {
  prefetchCached({
    key: INSIGHTS_CACHE_KEY,
    ttlMs: INSIGHTS_CACHE_TTL_MS,
    loader: async () => {
      const res = await fetch(`${API_BASE}/api/v1/insights/summary`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`Failed to fetch insights (${res.status})`);
      return res.json();
    },
  });
}

export function invalidateInsightsCache(): void {
  invalidateCached(INSIGHTS_CACHE_KEY);
}
