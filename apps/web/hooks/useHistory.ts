"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import { useClassifyHistory } from "./useClassifyHistory";
import {
  getHistory,
  getHistoryItem,
  deleteHistoryItem,
  clearHistory,
  HistoryItemResponse,
  HistoryDetailResponse,
  HistoryQueryParams,
} from "../lib/api/history";

export interface ServerHistoryFilters {
  source?: "manual" | "gmail";
  verdict?: "spam" | "not_spam" | "review";
  query?: string;
}

export interface UseHistoryReturn {
  // Shared
  isLoading: boolean;
  isAuthenticated: boolean;

  // Server-backed (authenticated)
  serverItems: HistoryItemResponse[];
  nextCursor: string | null;
  totalCount: number | null;
  filters: ServerHistoryFilters;
  setFilters: (f: ServerHistoryFilters) => void;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  fetchDetail: (id: string) => Promise<HistoryDetailResponse>;

  // Anonymous fallback (unauthenticated) — from useClassifyHistory
  anonItems: ReturnType<typeof useClassifyHistory>["items"];
  anonIsHydrated: ReturnType<typeof useClassifyHistory>["isHydrated"];
  anonAddItem: ReturnType<typeof useClassifyHistory>["addItem"];
  anonRemoveItem: ReturnType<typeof useClassifyHistory>["removeItem"];
  anonClearAll: ReturnType<typeof useClassifyHistory>["clearAll"];
}

const PAGE_SIZE = 20;

export function useHistory(): UseHistoryReturn {
  const { isAuthenticated } = useAuth();
  const anon = useClassifyHistory();

  const [serverItems, setServerItems] = useState<HistoryItemResponse[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFiltersState] = useState<ServerHistoryFilters>({});

  // Track active fetch to prevent stale state on filter change
  const fetchCountRef = useRef(0);

  const fetchPage = useCallback(
    async (cursor: string | undefined, currentFilters: ServerHistoryFilters, replace: boolean) => {
      const fetchId = ++fetchCountRef.current;
      setIsLoading(true);
      try {
        const params: HistoryQueryParams = {
          limit: PAGE_SIZE,
          cursor,
          source: currentFilters.source,
          verdict: currentFilters.verdict,
          query: currentFilters.query || undefined,
        };
        const data = await getHistory(params);
        if (fetchId !== fetchCountRef.current) return; // stale
        setServerItems((prev) => (replace ? data.items : [...prev, ...data.items]));
        setNextCursor(data.next_cursor);
        setTotalCount(data.total_count ?? null);
      } finally {
        if (fetchId === fetchCountRef.current) setIsLoading(false);
      }
    },
    []
  );

  // Reload from scratch when filters change (authenticated only)
  useEffect(() => {
    if (!isAuthenticated) return;
    setServerItems([]);
    setNextCursor(null);
    fetchPage(undefined, filters, true);
  }, [isAuthenticated, filters, fetchPage]);

  const setFilters = useCallback((f: ServerHistoryFilters) => {
    setFiltersState(f);
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || isLoading) return;
    await fetchPage(nextCursor, filters, false);
  }, [nextCursor, isLoading, filters, fetchPage]);

  const refresh = useCallback(async () => {
    setServerItems([]);
    setNextCursor(null);
    await fetchPage(undefined, filters, true);
  }, [filters, fetchPage]);

  const deleteItem = useCallback(async (id: string) => {
    await deleteHistoryItem(id);
    setServerItems((prev) => prev.filter((item) => item.id !== id));
    setTotalCount((c) => (c !== null ? c - 1 : null));
  }, []);

  const clearAll = useCallback(async () => {
    await clearHistory();
    setServerItems([]);
    setNextCursor(null);
    setTotalCount(0);
  }, []);

  const fetchDetail = useCallback(async (id: string): Promise<HistoryDetailResponse> => {
    return getHistoryItem(id);
  }, []);

  return {
    isLoading,
    isAuthenticated,
    serverItems,
    nextCursor,
    totalCount,
    filters,
    setFilters,
    loadMore,
    refresh,
    deleteItem,
    clearAll,
    fetchDetail,
    anonItems: anon.items,
    anonIsHydrated: anon.isHydrated,
    anonAddItem: anon.addItem,
    anonRemoveItem: anon.removeItem,
    anonClearAll: anon.clearAll,
  };
}
