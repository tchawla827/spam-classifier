"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  History,
  Search,
  Trash2,
  ChevronDown,
  X,
  AlertTriangle,
  ShieldCheck,
  Mail,
  Keyboard,
  Loader2,
  RefreshCw,
  Filter,
  Info,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useHistory } from "../../../hooks/useHistory";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import type { HistoryItemResponse, HistoryDetailResponse } from "../../../lib/api/history";
import { FeedbackControls } from "../../../components/classify/FeedbackControls";

// ── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VerdictBadge({ prediction }: { prediction: string }) {
  const isSpam = prediction === "spam";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide",
        isSpam
          ? "bg-destructive/15 text-destructive"
          : "bg-emerald-500/15 text-emerald-400"
      )}
    >
      {isSpam ? (
        <AlertTriangle className="h-3 w-3" />
      ) : (
        <ShieldCheck className="h-3 w-3" />
      )}
      {isSpam ? "Spam" : "Safe"}
    </span>
  );
}

function SourceBadge({ source }: { source: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
        source === "gmail"
          ? "bg-blue-500/10 text-blue-400"
          : "bg-surface-3/60 text-muted-foreground"
      )}
    >
      {source === "gmail" ? <Mail className="h-3 w-3" /> : <Keyboard className="h-3 w-3" />}
      {source === "gmail" ? "Gmail" : "Manual"}
    </span>
  );
}

function RiskBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 70 ? "bg-destructive" : pct >= 40 ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-surface-3/60 overflow-hidden">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-muted-foreground w-8 text-right">{pct}%</span>
    </div>
  );
}

// ── Detail drawer ────────────────────────────────────────────────────────────

function DetailDrawer({
  itemId,
  onClose,
  fetchDetail,
}: {
  itemId: string;
  onClose: () => void;
  fetchDetail: (id: string) => Promise<HistoryDetailResponse>;
}) {
  const [detail, setDetail] = useState<HistoryDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    fetchDetail(itemId)
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [itemId, fetchDetail]);

  return (
    <motion.div
      key="drawer-backdrop"
      initial={reducedMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end"
      onClick={onClose}
    >
      <motion.aside
        initial={reducedMotion ? undefined : { x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-md h-full overflow-y-auto",
          "bg-surface-1 border-l border-white/[0.06]",
          "p-6 space-y-5"
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Classification Detail</h2>
          <button
            onClick={onClose}
            aria-label="Close detail"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground">Failed to load details.</p>
        ) : (
          <div className="space-y-5">
            {/* Verdict + source */}
            <div className="flex items-center gap-2 flex-wrap">
              <VerdictBadge prediction={detail.final_prediction} />
              <SourceBadge source={detail.source} />
              {detail.personalized && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-primary/10 text-primary">
                  <Info className="h-3 w-3" />
                  Personalized
                </span>
              )}
            </div>

            {/* Subject / sender */}
            {detail.subject && (
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono">Subject</p>
                <p className="text-sm text-foreground leading-relaxed">{detail.subject}</p>
              </div>
            )}
            {detail.sender && (
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono">Sender</p>
                <p className="text-sm text-foreground">{detail.sender}</p>
              </div>
            )}

            {/* Risk score */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono">Risk Score</p>
              <RiskBar score={detail.final_risk_score} />
            </div>

            {/* Agreement ratio */}
            <div className="rounded-lg bg-surface-2/60 border border-white/[0.06] p-3 space-y-1">
              <p className="text-[11px] text-muted-foreground">Model agreement</p>
              <p className="text-sm font-medium text-foreground">
                {Math.round(detail.agreement_ratio * 100)}%
              </p>
            </div>

            {/* Personalization reasons */}
            {detail.personalization_reasons && detail.personalization_reasons.length > 0 && (
              <div className="space-y-2">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono">Why personalized</p>
                <ul className="space-y-1">
                  {detail.personalization_reasons.map((r, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-primary/60 shrink-0" />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Feedback */}
            <div className="border-t border-white/[0.06] pt-4">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-mono mb-3">
                {detail.feedback.length > 0 ? "Your Feedback" : "Rate this classification"}
              </p>
              {detail.feedback.length > 0 ? (
                <div className="space-y-2">
                  {detail.feedback.map((fb, i) => (
                    <div key={i} className="rounded-lg bg-surface-2/60 border border-white/[0.06] p-3 space-y-1">
                      <p className="text-xs font-medium text-foreground capitalize">
                        {fb.feedback_label.replace(/_/g, " ")}
                      </p>
                      {fb.reason && <p className="text-xs text-muted-foreground">{fb.reason}</p>}
                      <p className="text-[10px] text-muted-foreground/60">{formatDate(fb.created_at)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <FeedbackControls historyId={detail.id} />
              )}
            </div>

            {/* Model version */}
            <p className="text-[10px] text-muted-foreground/50 font-mono">
              Model: {detail.model_version} · {formatDate(detail.saved_at)}
            </p>
          </div>
        )}
      </motion.aside>
    </motion.div>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-1 border border-white/[0.08] rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl">
        <p className="text-sm text-foreground">{message}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-sm rounded-lg bg-destructive/80 hover:bg-destructive text-white transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

// ── History row ──────────────────────────────────────────────────────────────

function HistoryRow({
  item,
  onSelect,
  onDelete,
}: {
  item: HistoryItemResponse;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "group flex items-center gap-3 px-4 py-3 rounded-xl",
        "bg-surface-2/40 border border-white/[0.05]",
        "hover:bg-surface-2/80 hover:border-white/[0.08]",
        "transition-all duration-150 cursor-pointer"
      )}
      onClick={() => onSelect(item.id)}
    >
      {/* Verdict icon */}
      <div
        className={cn(
          "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
          item.final_prediction === "spam"
            ? "bg-destructive/15"
            : "bg-emerald-500/15"
        )}
      >
        {item.final_prediction === "spam" ? (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        ) : (
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium text-foreground truncate">
          {item.subject ?? "(no subject)"}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {item.sender && (
            <span className="text-xs text-muted-foreground truncate max-w-[180px]">
              {item.sender}
            </span>
          )}
          <SourceBadge source={item.source} />
          {item.personalized && (
            <span className="text-[10px] text-primary/70 font-medium">personalized</span>
          )}
        </div>
      </div>

      {/* Right: score + date + delete */}
      <div className="flex flex-col items-end gap-1 shrink-0">
        <VerdictBadge prediction={item.final_prediction} />
        <span className="text-[10px] text-muted-foreground/60">
          {formatDate(item.saved_at)}
        </span>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        aria-label="Delete item"
        className={cn(
          "ml-1 p-1.5 rounded-md shrink-0",
          "text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10",
          "opacity-0 group-hover:opacity-100 transition-all duration-150"
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

// ── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="h-14 w-14 rounded-2xl bg-surface-2/60 border border-white/[0.06] flex items-center justify-center">
        <History className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          {filtered ? "No results" : "No history yet"}
        </p>
        <p className="text-xs text-muted-foreground max-w-[260px]">
          {filtered
            ? "Try adjusting your filters or search query."
            : "Classifications you run will appear here."}
        </p>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

const SOURCE_OPTIONS = [
  { label: "All sources", value: "" },
  { label: "Manual", value: "manual" },
  { label: "Gmail", value: "gmail" },
] as const;

const VERDICT_OPTIONS = [
  { label: "All verdicts", value: "" },
  { label: "Spam", value: "spam" },
  { label: "Safe", value: "not_spam" },
  { label: "Review", value: "review" },
] as const;

export default function HistoryPage() {
  const reducedMotion = useReducedMotion();
  const {
    isAuthenticated,
    isLoading,
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
  } = useHistory();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Debounce search → filters
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setFilters({ ...filters, query: debouncedSearch || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleSourceChange = useCallback(
    (v: string) => setFilters({ ...filters, source: (v as "manual" | "gmail") || undefined }),
    [filters, setFilters]
  );

  const handleVerdictChange = useCallback(
    (v: string) =>
      setFilters({
        ...filters,
        verdict: (v as "spam" | "not_spam" | "review") || undefined,
      }),
    [filters, setFilters]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      setConfirmDelete(null);
      setActionLoading(true);
      try {
        await deleteItem(id);
      } finally {
        setActionLoading(false);
      }
    },
    [deleteItem]
  );

  const handleClearAll = useCallback(async () => {
    setConfirmClear(false);
    setActionLoading(true);
    try {
      await clearAll();
    } finally {
      setActionLoading(false);
    }
  }, [clearAll]);

  const hasFilters = !!(filters.source || filters.verdict || debouncedSearch);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <span className="text-xs font-mono text-primary/80 uppercase tracking-widest">
              History
            </span>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Classification History
          </h1>
          {totalCount !== null && (
            <p className="text-sm text-muted-foreground">
              {totalCount} classification{totalCount !== 1 ? "s" : ""} total
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isLoading}
            aria-label="Refresh history"
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-2 transition-colors disabled:opacity-40"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
          {serverItems.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              disabled={actionLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg text-destructive/80 hover:text-destructive hover:bg-destructive/10 border border-destructive/20 hover:border-destructive/40 transition-all duration-150 disabled:opacity-40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
        </div>
      </motion.div>

      {/* Search + filters */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.08 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* Search */}
        <div className="relative flex-1">
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

        {/* Source filter */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <select
            value={filters.source ?? ""}
            onChange={(e) => handleSourceChange(e.target.value)}
            className={cn(
              "pl-8 pr-8 py-2 text-sm rounded-xl appearance-none",
              "bg-surface-2/60 border border-white/[0.07]",
              "text-foreground",
              "focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40",
              "transition-colors cursor-pointer"
            )}
          >
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>

        {/* Verdict filter */}
        <div className="relative">
          <select
            value={filters.verdict ?? ""}
            onChange={(e) => handleVerdictChange(e.target.value)}
            className={cn(
              "px-3 pr-8 py-2 text-sm rounded-xl appearance-none",
              "bg-surface-2/60 border border-white/[0.07]",
              "text-foreground",
              "focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40",
              "transition-colors cursor-pointer"
            )}
          >
            {VERDICT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
      </motion.div>

      {/* Active filters indicator */}
      <AnimatePresence>
        {hasFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-2 text-xs text-muted-foreground"
          >
            <Filter className="h-3 w-3" />
            Filters active —{" "}
            <button
              onClick={() => {
                setSearch("");
                setFilters({});
              }}
              className="text-primary hover:underline"
            >
              clear all
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* List */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {serverItems.map((item) => (
            <HistoryRow
              key={item.id}
              item={item}
              onSelect={setSelectedId}
              onDelete={(id) => setConfirmDelete(id)}
            />
          ))}
        </AnimatePresence>

        {/* Loading skeleton rows */}
        {isLoading && serverItems.length === 0 && (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-surface-2/30 border border-white/[0.04] animate-pulse"
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && serverItems.length === 0 && (
          <EmptyState filtered={hasFilters} />
        )}
      </div>

      {/* Load more */}
      <AnimatePresence>
        {nextCursor && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center"
          >
            <button
              onClick={loadMore}
              className={cn(
                "flex items-center gap-2 px-5 py-2 text-sm rounded-xl",
                "bg-surface-2/60 border border-white/[0.07]",
                "text-muted-foreground hover:text-foreground hover:bg-surface-2",
                "transition-all duration-150"
              )}
            >
              <ChevronDown className="h-4 w-4" />
              Load more
            </button>
          </motion.div>
        )}
        {isLoading && serverItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center py-2"
          >
            <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail drawer */}
      <AnimatePresence>
        {selectedId && (
          <DetailDrawer
            key={selectedId}
            itemId={selectedId}
            onClose={() => setSelectedId(null)}
            fetchDetail={fetchDetail}
          />
        )}
      </AnimatePresence>

      {/* Delete confirm */}
      <AnimatePresence>
        {confirmDelete && (
          <ConfirmDialog
            message="Delete this classification from your history? This cannot be undone."
            onConfirm={() => handleDelete(confirmDelete)}
            onCancel={() => setConfirmDelete(null)}
          />
        )}
      </AnimatePresence>

      {/* Clear all confirm */}
      <AnimatePresence>
        {confirmClear && (
          <ConfirmDialog
            message="Clear your entire classification history? This cannot be undone."
            onConfirm={handleClearAll}
            onCancel={() => setConfirmClear(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
