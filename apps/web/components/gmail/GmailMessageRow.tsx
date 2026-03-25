"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, Loader2, ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";
import { GmailClassifyResultBadge } from "./GmailClassifyResult";
import { FeedbackControls } from "../classify/FeedbackControls";
import { getGmailMessageDetail } from "../../lib/api/gmail";
import type {
  GmailMessage,
  GmailClassifyResult,
  GmailMessageDetail,
} from "../../lib/api/gmail";

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
    return d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function extractDomain(fromAddress: string | null): string | null {
  if (!fromAddress) return null;
  const match = fromAddress.match(/@([^>\s]+)/);
  return match ? match[1] : null;
}

function extractInitial(fromAddress: string | null): string {
  if (!fromAddress) return "?";
  const nameMatch = fromAddress.match(/^([^<@]+)/);
  if (nameMatch) return nameMatch[1].trim().charAt(0).toUpperCase();
  return fromAddress.charAt(0).toUpperCase();
}

function isHtmlContent(body: string): boolean {
  return /<[a-zA-Z][^>]*>/.test(body.trim());
}

function hasDarkBackground(html: string): boolean {
  const sample = html.slice(0, 4000).toLowerCase();
  return /(?:background(?:-color)?|bgcolor)\s*[=:]\s*["']?\s*(?:black|#(?:0[0-9a-f]{5}|1[0-9a-f]{5}|0[0-9a-f]{2}|1[0-9a-f]{2}))\b/.test(
    sample
  );
}

function SenderAvatar({ fromAddress }: { fromAddress: string | null }) {
  const [faviconError, setFaviconError] = useState(false);
  const domain = extractDomain(fromAddress);
  const initial = extractInitial(fromAddress);

  if (domain && !faviconError) {
    return (
      <img
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
        alt=""
        className="h-7 w-7 rounded-md object-contain shrink-0"
        onError={() => setFaviconError(true)}
      />
    );
  }

  return (
    <div className="h-7 w-7 rounded-md bg-primary/15 flex items-center justify-center text-[11px] font-bold text-primary/80 shrink-0 select-none">
      {initial}
    </div>
  );
}

export function GmailMessageRow({
  message,
  isSelected,
  onToggleSelect,
  result,
  isClassifyingThis,
}: GmailMessageRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [detail, setDetail] = useState<GmailMessageDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  const handleExpandToggle = useCallback(async () => {
    const next = !isExpanded;
    setIsExpanded(next);
    if (next && !detail && !isLoadingDetail) {
      setIsLoadingDetail(true);
      try {
        const d = await getGmailMessageDetail(message.gmail_message_id);
        setDetail(d);
      } catch {
        // silently fall back to snippet
      } finally {
        setIsLoadingDetail(false);
      }
    }
  }, [isExpanded, detail, isLoadingDetail, message.gmail_message_id]);

  const displayBody = detail?.body || message.snippet || "(no body)";
  const isHtml = detail ? isHtmlContent(displayBody) : false;
  const isDarkEmail = isHtml && hasDarkBackground(displayBody);
  const imgReInvert = isDarkEmail
    ? "img,svg{filter:invert(1) hue-rotate(180deg) !important}"
    : "";
  const htmlSrcDoc = isHtml
    ? `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;line-height:1.65;padding:12px;word-break:break-word}img{max-width:100%;height:auto}table{border-collapse:collapse;max-width:100%;width:100%}${imgReInvert}</style></head><body>${displayBody}</body></html>`
    : "";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "rounded-xl border transition-all duration-150",
        isSelected
          ? "bg-primary/8 border-primary/25"
          : "bg-surface-2/40 border-white/[0.05] hover:border-white/[0.08]"
      )}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div
          className={cn(
            "mt-1 h-4 w-4 shrink-0 rounded border transition-colors cursor-pointer",
            isSelected
              ? "bg-primary border-primary"
              : "border-white/20 hover:border-primary/50"
          )}
          aria-checked={isSelected}
          role="checkbox"
          aria-label={`Select message: ${message.subject ?? "(no subject)"}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(message.gmail_message_id);
          }}
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

        <div className="mt-0.5 shrink-0">
          <SenderAvatar fromAddress={message.from_address} />
        </div>

        <div
          className="flex-1 min-w-0 space-y-0.5 cursor-pointer"
          onClick={handleExpandToggle}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-foreground truncate">
              {message.subject ?? "(no subject)"}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-muted-foreground/60">
                {formatDate(message.received_at)}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 text-muted-foreground/40 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {message.from_address && (
              <span className="text-xs text-muted-foreground truncate max-w-[220px]">
                {message.from_address}
              </span>
            )}
            {message.has_attachments && (
              <Paperclip className="h-3 w-3 text-muted-foreground/50 shrink-0" />
            )}
          </div>

          {!isExpanded && (
            <>
              {message.snippet && (
                <p className="text-xs text-muted-foreground/60 truncate leading-relaxed">
                  {message.snippet}
                </p>
              )}
              {isClassifyingThis ? (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
                  <span className="text-xs text-muted-foreground/60">
                    Classifying...
                  </span>
                </div>
              ) : result ? (
                <GmailClassifyResultBadge result={result} />
              ) : null}
            </>
          )}
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1.0] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/[0.05]">
              {isLoadingDetail ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-xs">Loading message...</span>
                </div>
              ) : (
                <div className="space-y-3 pt-3">
                  {isHtml ? (
                    <div className="rounded-lg overflow-hidden border border-white/[0.08]">
                      <iframe
                        sandbox="allow-same-origin"
                        srcDoc={htmlSrcDoc}
                        title="Email body"
                        className="w-full border-0 block"
                        style={{
                          height: "280px",
                          filter: isDarkEmail
                            ? "invert(1) hue-rotate(180deg)"
                            : undefined,
                        }}
                      />
                    </div>
                  ) : (
                    <pre
                      className={cn(
                        "text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans",
                        "max-h-72 overflow-y-auto rounded-lg p-3",
                        "bg-surface-1/60 border border-white/[0.04]"
                      )}
                    >
                      {displayBody}
                    </pre>
                  )}

                  {isClassifyingThis ? (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin text-primary/60" />
                      <span className="text-xs text-muted-foreground/60">
                        Classifying...
                      </span>
                    </div>
                  ) : result ? (
                    <div className="space-y-3">
                      <GmailClassifyResultBadge result={result} />
                      {result.history_id && "final_prediction" in result.result && (
                        <FeedbackControls
                          historyId={result.history_id}
                          predictedLabel={result.result.final_prediction}
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
