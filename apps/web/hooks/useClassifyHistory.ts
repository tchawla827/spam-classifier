"use client";

import { useState, useEffect, useCallback } from "react";
import type { HistoryItem, ClassifyResponse } from "../lib/api/classify";

const STORAGE_KEY = "spamshield:history";
const MAX_ITEMS = 50;

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadFromStorage(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveToStorage(items: HistoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded or private browsing — fail silently
  }
}

export function useClassifyHistory() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setItems(loadFromStorage());
    setIsHydrated(true);
  }, []);

  const addItem = useCallback(
    (subject: string, body: string, result: ClassifyResponse) => {
      const newItem: HistoryItem = {
        id: generateId(),
        savedAt: new Date().toISOString(),
        subject,
        body,
        result,
      };
      setItems((prev) => {
        const next = [newItem, ...prev].slice(0, MAX_ITEMS);
        saveToStorage(next);
        return next;
      });
    },
    []
  );

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((item) => item.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    saveToStorage([]);
  }, []);

  return { items, isHydrated, addItem, removeItem, clearAll };
}
