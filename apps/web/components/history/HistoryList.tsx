"use client";

import { AnimatePresence, motion } from "framer-motion";
import { HistoryItemCard } from "./HistoryItemCard";
import { HistoryEmptyState } from "./HistoryEmptyState";
import type { HistoryItem } from "../../lib/api/classify";

interface HistoryListProps {
  items: HistoryItem[];
  activeId: string | null;
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export function HistoryList({ items, activeId, onSelect, onDelete, onClearAll }: HistoryListProps) {
  function handleClearAll() {
    if (window.confirm("Clear all history? This cannot be undone.")) {
      onClearAll();
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {items.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 shrink-0">
          <span className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? "result" : "results"}
          </span>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-muted-foreground/60 hover:text-risk-high transition-colors focus:outline-none focus:ring-1 focus:ring-primary/40 rounded px-1"
          >
            Clear all
          </button>
        </div>
      )}

      {items.length === 0 ? (
        <HistoryEmptyState />
      ) : (
        <ul
          role="list"
          aria-label="Classification history"
          className="flex-1 overflow-y-auto space-y-2 p-3"
        >
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.15 }}
                style={{ overflow: "hidden" }}
              >
                <HistoryItemCard
                  item={item}
                  isActive={item.id === activeId}
                  onSelect={onSelect}
                  onDelete={onDelete}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
