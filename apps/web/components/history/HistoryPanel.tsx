"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock } from "lucide-react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { HistoryList } from "./HistoryList";
import type { HistoryItem } from "../../lib/api/classify";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  items: HistoryItem[];
  activeId: string | null;
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
  toggleButtonRef: React.RefObject<HTMLButtonElement | null>;
}

export function HistoryPanel({
  isOpen,
  onClose,
  items,
  activeId,
  onSelect,
  onDelete,
  onClearAll,
  toggleButtonRef,
}: HistoryPanelProps) {
  const reducedMotion = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button when panel opens; restore to toggle button on close
  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    } else {
      toggleButtonRef.current?.focus();
    }
  }, [isOpen, toggleButtonRef]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const slideVariants = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { x: "100%" },
        animate: { x: 0 },
        exit: { x: "100%" },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-background/50 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Panel */}
          <motion.aside
            {...slideVariants}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed top-0 right-0 z-40 h-full w-80 max-w-[calc(100vw-48px)] flex flex-col bg-card border-l border-border shadow-2xl"
            aria-label="Classification history"
            role="complementary"
            aria-hidden={!isOpen}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border shrink-0">
              <div className="flex items-center gap-2 text-foreground">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">History</span>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                onClick={onClose}
                aria-label="Close history panel"
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <HistoryList
                items={items}
                activeId={activeId}
                onSelect={onSelect}
                onDelete={onDelete}
                onClearAll={onClearAll}
              />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
