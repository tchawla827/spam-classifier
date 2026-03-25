"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  getGmailStatus,
  startGmailConnect,
  disconnectGmail,
  getGmailMessages,
  classifyGmailMessage,
  classifyGmailBatch,
  GmailStatusResponse,
  GmailMessage,
  GmailClassifyResult,
  GmailMessagesParams,
} from "../lib/api/gmail";

const PAGE_SIZE = 20;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const CACHE_KEY_PREFIX = "gmail_cache_";

interface CacheEntry {
  items: GmailMessage[];
  cursor: string | null;
  timestamp: number;
}

function getCacheKey(params: GmailMessagesParams): string {
  return JSON.stringify({ q: params.q ?? null, label: params.label ?? "INBOX" });
}

function readCache(params: GmailMessagesParams): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY_PREFIX + getCacheKey(params));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp >= CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY_PREFIX + getCacheKey(params));
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

function writeCache(params: GmailMessagesParams, entry: CacheEntry): void {
  try {
    sessionStorage.setItem(CACHE_KEY_PREFIX + getCacheKey(params), JSON.stringify(entry));
  } catch {
    // sessionStorage may be full or unavailable
  }
}

function deleteCache(params: GmailMessagesParams): void {
  try {
    sessionStorage.removeItem(CACHE_KEY_PREFIX + getCacheKey(params));
  } catch {}
}

function clearAllCache(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(CACHE_KEY_PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

export interface UseGmailReturn {
  // Connection state
  status: GmailStatusResponse | null;
  isConnected: boolean;
  isStatusLoading: boolean;

  // Connection error
  connectError: string | null;
  clearConnectError: () => void;

  // Message list
  messages: GmailMessage[];
  nextCursor: string | null;
  isMessagesLoading: boolean;
  isRefreshing: boolean;

  // Classification results keyed by gmail_message_id
  classifyResults: Record<string, GmailClassifyResult>;
  isClassifying: boolean;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  loadMessages: (params?: GmailMessagesParams) => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  classifyOne: (messageId: string) => Promise<void>;
  classifyBatch: (messageIds: string[]) => Promise<void>;
}

export function useGmail(): UseGmailReturn {
  const [status, setStatus] = useState<GmailStatusResponse | null>(null);
  const [isStatusLoading, setIsStatusLoading] = useState(true);

  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [classifyResults, setClassifyResults] = useState<Record<string, GmailClassifyResult>>({});
  const [isClassifying, setIsClassifying] = useState(false);

  const [connectError, setConnectError] = useState<string | null>(null);
  const clearConnectError = useCallback(() => setConnectError(null), []);

  // Track active params so loadMore uses the same query
  const currentParamsRef = useRef<GmailMessagesParams>({});
  const fetchCountRef = useRef(0);

  // Load status on mount
  useEffect(() => {
    getGmailStatus()
      .then(setStatus)
      .catch(() => setStatus(null))
      .finally(() => setIsStatusLoading(false));
  }, []);

  const loadMessages = useCallback(
    async (params: GmailMessagesParams = {}, replace = true) => {
      // Serve from cache if fresh (only for full-page loads, not pagination)
      if (replace) {
        const cached = readCache(params);
        if (cached) {
          setMessages(cached.items);
          setNextCursor(cached.cursor);
          currentParamsRef.current = params;
          return;
        }
      }

      const fetchId = ++fetchCountRef.current;
      setIsMessagesLoading(true);
      try {
        const p: GmailMessagesParams = { limit: PAGE_SIZE, ...params };
        currentParamsRef.current = params;
        const data = await getGmailMessages(p);
        if (fetchId !== fetchCountRef.current) return;

        if (replace) {
          writeCache(params, {
            items: data.items,
            cursor: data.next_cursor,
            timestamp: Date.now(),
          });
        }

        setMessages((prev) => (replace ? data.items : [...prev, ...data.items]));
        setNextCursor(data.next_cursor);
      } finally {
        if (fetchId === fetchCountRef.current) setIsMessagesLoading(false);
      }
    },
    []
  );

  const loadMore = useCallback(async () => {
    if (!nextCursor || isMessagesLoading) return;
    await loadMessages({ ...currentParamsRef.current, cursor: nextCursor }, false);
  }, [nextCursor, isMessagesLoading, loadMessages]);

  const refresh = useCallback(async () => {
    // Invalidate cache for current params so fresh data is fetched
    deleteCache(currentParamsRef.current);
    setIsRefreshing(true);
    setClassifyResults({});
    try {
      const [freshStatus, data] = await Promise.all([
        getGmailStatus().catch(() => null),
        getGmailMessages({ limit: PAGE_SIZE, ...currentParamsRef.current }),
      ]);
      // Persist fresh data to sessionStorage
      writeCache(currentParamsRef.current, {
        items: data.items,
        cursor: data.next_cursor,
        timestamp: Date.now(),
      });
      setMessages(data.items);
      setNextCursor(data.next_cursor);
      if (freshStatus) setStatus(freshStatus);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const connect = useCallback(async () => {
    setConnectError(null);
    try {
      const { auth_url } = await startGmailConnect();
      window.location.href = auth_url;
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed to start Gmail connection");
      throw err;
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectGmail();
    setStatus((prev) =>
      prev ? { ...prev, connected: false, email: null, connected_at: null } : prev
    );
    setMessages([]);
    setNextCursor(null);
    setClassifyResults({});
    clearAllCache();
  }, []);

  const classifyOne = useCallback(async (messageId: string) => {
    setIsClassifying(true);
    try {
      const result = await classifyGmailMessage(messageId);
      setClassifyResults((prev) => ({
        ...prev,
        [messageId]: result,
      }));
    } finally {
      setIsClassifying(false);
    }
  }, []);

  const classifyBatch = useCallback(async (messageIds: string[]) => {
    if (messageIds.length === 0) return;
    setIsClassifying(true);
    try {
      const results = await classifyGmailBatch(messageIds);
      const newResults: Record<string, GmailClassifyResult> = {};
      for (const r of results) {
        newResults[r.message.gmail_message_id] = r;
      }
      setClassifyResults((prev) => ({ ...prev, ...newResults }));
    } finally {
      setIsClassifying(false);
    }
  }, []);

  return {
    status,
    isConnected: status?.connected ?? false,
    isStatusLoading,
    connectError,
    clearConnectError,
    messages,
    nextCursor,
    isMessagesLoading,
    isRefreshing,
    classifyResults,
    isClassifying,
    connect,
    disconnect,
    loadMessages,
    loadMore,
    refresh,
    classifyOne,
    classifyBatch,
  };
}
