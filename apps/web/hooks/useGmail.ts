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
      const fetchId = ++fetchCountRef.current;
      setIsMessagesLoading(true);
      try {
        const p: GmailMessagesParams = { limit: PAGE_SIZE, ...params };
        currentParamsRef.current = params;
        const data = await getGmailMessages(p);
        if (fetchId !== fetchCountRef.current) return;

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
    setIsRefreshing(true);
    setClassifyResults({});
    try {
      const [freshStatus, data] = await Promise.all([
        getGmailStatus().catch(() => null),
        getGmailMessages({ limit: PAGE_SIZE, ...currentParamsRef.current }),
      ]);
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
