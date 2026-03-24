"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Search,
  X,
  RefreshCw,
  Zap,
  CheckSquare,
  Square,
  Loader2,
  MailX,
  ExternalLink,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useGmail } from "../../../hooks/useGmail";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { GmailMessageList } from "../../../components/gmail/GmailMessageList";

// ── Not connected state ───────────────────────────────────────────────────────

function ConnectCTA({
  onConnect,
  isConnecting,
}: {
  onConnect: () => void;
  isConnecting: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="flex flex-col items-center justify-center py-24 gap-6 text-center"
    >
      <div className="h-20 w-20 rounded-3xl bg-surface-2/60 border border-white/[0.07] flex items-center justify-center shadow-lg">
        <Mail className="h-9 w-9 text-primary" />
      </div>

      <div className="space-y-2 max-w-sm">
        <h2 className="text-xl font-display font-bold text-foreground">
          Connect your Gmail
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Grant read-only access so SpamShield can scan your inbox and classify
          messages without leaving the app.
        </p>
      </div>

      <div className="rounded-xl bg-surface-2/40 border border-white/[0.06] p-4 max-w-xs w-full text-left space-y-2">
        {[
          "Read-only access — no send or delete permissions",
          "Tokens encrypted at rest",
          "Disconnect any time from Settings",
        ].map((item) => (
          <div key={item} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
            <p className="text-xs text-muted-foreground">{item}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onConnect}
        disabled={isConnecting}
        className={cn(
          "inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium",
          "bg-primary text-primary-foreground",
          "hover:bg-primary/90 active:scale-[0.98]",
          "transition-all duration-150 shadow-md",
          "disabled:opacity-50 disabled:cursor-not-allowed"
        )}
      >
        {isConnecting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
        {isConnecting ? "Redirecting…" : "Connect Gmail"}
      </button>
    </motion.div>
  );
}

// ── Classify toolbar ──────────────────────────────────────────────────────────

function ClassifyToolbar({
  selectedCount,
  totalCount,
  isClassifying,
  onSelectAll,
  onDeselectAll,
  onClassifySelected,
}: {
  selectedCount: number;
  totalCount: number;
  isClassifying: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onClassifySelected: () => void;
}) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Select all toggle */}
      <button
        onClick={allSelected ? onDeselectAll : onSelectAll}
        disabled={totalCount === 0}
        className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border",
          "transition-all duration-150 disabled:opacity-40",
          allSelected
            ? "border-primary/30 text-primary bg-primary/8"
            : "border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-surface-2"
        )}
      >
        {allSelected ? (
          <CheckSquare className="h-3.5 w-3.5" />
        ) : (
          <Square className="h-3.5 w-3.5" />
        )}
        {allSelected ? "Deselect all" : "Select all"}
      </button>

      {/* Selected count */}
      {selectedCount > 0 && (
        <span className="text-xs text-muted-foreground">
          {selectedCount} selected
        </span>
      )}

      {/* Classify button */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.15 }}
            onClick={onClassifySelected}
            disabled={isClassifying}
            className={cn(
              "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold",
              "bg-primary text-primary-foreground",
              "hover:bg-primary/90 active:scale-[0.98]",
              "transition-all duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {isClassifying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Zap className="h-3.5 w-3.5" />
            )}
            {isClassifying
              ? "Classifying…"
              : `Classify ${selectedCount === 1 ? "1 message" : `${selectedCount} messages`}`}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GmailPage() {
  const reducedMotion = useReducedMotion();
  const {
    status,
    isConnected,
    isStatusLoading,
    messages,
    nextCursor,
    isMessagesLoading,
    classifyResults,
    isClassifying,
    connect,
    disconnect,
    loadMessages,
    loadMore,
    refresh,
    classifyOne,
    classifyBatch,
  } = useGmail();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [classifyingIds, setClassifyingIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Load messages when connected or search changes
  useEffect(() => {
    if (!isConnected) return;
    setSelectedIds(new Set());
    loadMessages({ q: debouncedSearch || undefined });
  }, [isConnected, debouncedSearch, loadMessages]);

  const handleConnect = useCallback(async () => {
    setIsConnecting(true);
    try {
      await connect();
    } catch {
      setIsConnecting(false);
    }
  }, [connect]);

  const handleDisconnect = useCallback(async () => {
    setIsDisconnecting(true);
    try {
      await disconnect();
    } finally {
      setIsDisconnecting(false);
    }
  }, [disconnect]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(messages.map((m) => m.gmail_message_id)));
  }, [messages]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleClassifySelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    setClassifyingIds(new Set(ids));
    try {
      if (ids.length === 1) {
        await classifyOne(ids[0]);
      } else {
        await classifyBatch(ids);
      }
    } finally {
      setClassifyingIds(new Set());
      setSelectedIds(new Set());
    }
  }, [selectedIds, classifyOne, classifyBatch]);

  const handleRefresh = useCallback(async () => {
    setSelectedIds(new Set());
    await refresh();
  }, [refresh]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Page header */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <span className="text-xs font-mono text-primary/80 uppercase tracking-widest">
              Gmail
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Inbox Scanner
          </h1>
          {isConnected && status?.email && (
            <p className="text-sm text-muted-foreground">{status.email}</p>
          )}
        </div>

        {/* Actions: refresh + disconnect */}
        {isConnected && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isMessagesLoading}
              aria-label="Refresh inbox"
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-40"
            >
              <RefreshCw
                className={cn("h-4 w-4", isMessagesLoading && "animate-spin")}
              />
            </button>
            <button
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border",
                "border-destructive/25 text-destructive/70 hover:bg-destructive/10 hover:border-destructive/40",
                "transition-all duration-150 disabled:opacity-40"
              )}
            >
              {isDisconnecting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <MailX className="h-3 w-3" />
              )}
              Disconnect
            </button>
          </div>
        )}
      </motion.div>

      {/* Loading status */}
      {isStatusLoading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
        </div>
      ) : !isConnected ? (
        /* Not connected CTA */
        <ConnectCTA onConnect={handleConnect} isConnecting={isConnecting} />
      ) : (
        /* Connected: search + toolbar + list */
        <motion.div
          initial={reducedMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-4"
        >
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder="Search subject or sender…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "w-full pl-9 pr-9 py-2 text-sm rounded-xl",
                "bg-surface-2/60 border border-white/[0.07]",
                "text-foreground placeholder:text-muted-foreground/50",
                "focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40",
                "transition-colors"
              )}
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Classify toolbar */}
          <ClassifyToolbar
            selectedCount={selectedIds.size}
            totalCount={messages.length}
            isClassifying={isClassifying}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onClassifySelected={handleClassifySelected}
          />

          {/* Message list */}
          <GmailMessageList
            messages={messages}
            isLoading={isMessagesLoading}
            nextCursor={nextCursor}
            selectedIds={selectedIds}
            classifyResults={classifyResults}
            classifyingIds={classifyingIds}
            onToggleSelect={handleToggleSelect}
            onLoadMore={loadMore}
          />
        </motion.div>
      )}
    </div>
  );
}
