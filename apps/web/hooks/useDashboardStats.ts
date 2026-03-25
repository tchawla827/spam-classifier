import { useState, useEffect } from "react";

interface DashboardStats {
  total_classifications: number;
  spam_detected: number;
  false_positive_count: number;
  review_count: number;
}

const CACHE_KEY = "dashboard_stats_cache";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const STATS_REFETCH_EVENT = "dashboard-stats-refetch";

interface CachedStats {
  data: DashboardStats;
  timestamp: number;
}

function getCachedStats(): DashboardStats | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const parsed: CachedStats = JSON.parse(cached);
      const now = Date.now();
      if (now - parsed.timestamp < CACHE_TTL) {
        return parsed.data;
      }
    }
  } catch {
    // Invalid cache
  }
  return null;
}

function setCachedStats(data: DashboardStats): void {
  localStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ data, timestamp: Date.now() })
  );
}

function clearCache(): void {
  localStorage.removeItem(CACHE_KEY);
}

async function fetchAndCache(): Promise<DashboardStats | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/insights/summary`, {
      credentials: "include",
    });
    if (res.ok) {
      const data: DashboardStats = await res.json();
      setCachedStats(data);
      return data;
    }
  } catch {
    // Silently fail
  }
  return null;
}

/**
 * Refetch dashboard stats, bypassing cache.
 * Emits an event so all listening hooks update.
 * Call this after classifications to refresh stats immediately.
 */
export async function refetchDashboardStats(): Promise<void> {
  clearCache();
  await fetchAndCache();
  window.dispatchEvent(new CustomEvent(STATS_REFETCH_EVENT));
}

export function useDashboardStats() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Check cache first
      let cached = getCachedStats();
      if (!cached) {
        // Fetch fresh data
        cached = await fetchAndCache();
      }
      if (cached) {
        setStats(cached);
      }
      setIsLoading(false);
    };

    init();

    // Listen for refetch events from other components (e.g., after classification)
    const handleRefetch = () => {
      const cached = getCachedStats();
      if (cached) {
        setStats(cached);
      }
    };

    window.addEventListener(STATS_REFETCH_EVENT, handleRefetch);
    return () => window.removeEventListener(STATS_REFETCH_EVENT, handleRefetch);
  }, []);

  return {
    stats,
    isLoading,
  };
}
