"use client";

import { motion } from "framer-motion";
import { Paperclip, Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";
import { GmailClassifyResultBadge } from "./GmailClassifyResult";
import type { GmailMessage, GmailClassifyResult } from "../../lib/api/gmail";

interface GmailMessageRowProps {
  message: GmailMessage;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  result: GmailClassifyResult | undefined;
  isClassifyingThis: boolean;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function GmailMessageRow({
  message,
  isSelected,
  onToggleSelect,
  result,
  isClassifyingThis,
}: GmailMessageRowProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-xl",
        "border transition-all duration-150 cursor-pointer",
        isSelected
          ? "bg-primary/8 border-primary/25"
          : "bg-surface-2/40 border-white/[0.05] hover:bg-surface-2/70 hover:border-white/[0.08]"
      )}
      onClick={() => onToggleSelect(message.gmail_message_id)}
    >
      {/* Checkbox */}
      <div
        className={cn(
          "mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors",
          isSelected
            ? "bg-primary border-primary"
            : "border-white/20 hover:border-primary/50"
        )}
        aria-checked={isSelected}
        role="checkbox"
        aria-label={`Select message: ${message.subject ?? "(no subject)"}`}
      >
        {isSelected && (
          <svg viewBox="0 0 10 8" fill="none" className="w-full h-full p-0.5">
            <path
              d="M1 4l2.5 2.5L9 1"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground truncate">
            {message.subject ?? "(no subject)"}
          </p>
          <span className="text-[11px] text-muted-foreground/60 shrink-0">
            {formatDate(message.received_at)}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {message.from && (
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {message.from}
            </span>
          )}
          {message.has_attachments && (
            <Paperclip className="h-3 w-3 text-muted-foreground/50 shrink-0" />
          )}
        </div>

        {message.snippet && (
          <p className="text-xs text-muted-foreground/60 truncate leading-relaxed">
            {message.snippet}
          </p>
        )}

        {/* Classify result or loading indicator */}
        {isClassifyingThis ? (
          <div className="flex items-center gap-1.5 mt-2">
            <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
            <span className="text-xs text-muted-foreground/60">Classifying…</span>
          </div>
        ) : result ? (
          <GmailClassifyResultBadge result={result} />
        ) : null}
      </div>
    </motion.div>
  );
}
