"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Loader2, ChevronDown, Mail } from "lucide-react";
import { cn } from "../../lib/utils";
import { GmailMessageRow } from "./GmailMessageRow";
import type { GmailMessage, GmailClassifyResult } from "../../lib/api/gmail";
import { VirtualStack } from "../ui/VirtualStack";

interface GmailMessageListProps {
  messages: GmailMessage[];
  isLoading: boolean;
  nextCursor: string | null;
  selectedIds: Set<string>;
  classifyResults: Record<string, GmailClassifyResult>;
  classifyingIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onLoadMore: () => void;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="h-14 w-14 rounded-2xl bg-surface-2/60 border border-white/[0.06] flex items-center justify-center">
        <Mail className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">No messages found</p>
        <p className="text-xs text-muted-foreground max-w-[260px]">
          Try a different search query or check back later.
        </p>
      </div>
    </div>
  );
}

export function GmailMessageList({
  messages,
  isLoading,
  nextCursor,
  selectedIds,
  classifyResults,
  classifyingIds,
  onToggleSelect,
  onLoadMore,
}: GmailMessageListProps) {
  return (
    <div className="space-y-2">
      {messages.length > 0 && (
        <VirtualStack
          items={messages}
          getKey={(msg) => msg.gmail_message_id}
          estimateSize={86}
          overscan={900}
          renderItem={(msg) => (
            <GmailMessageRow
              key={msg.gmail_message_id}
              message={msg}
              isSelected={selectedIds.has(msg.gmail_message_id)}
              onToggleSelect={onToggleSelect}
              result={classifyResults[msg.gmail_message_id]}
              isClassifyingThis={classifyingIds.has(msg.gmail_message_id)}
            />
          )}
        />
      )}

      {/* Skeleton rows while loading initial batch */}
      {isLoading && messages.length === 0 && (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-[72px] rounded-xl bg-surface-2/30 border border-white/[0.04] animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && messages.length === 0 && <EmptyState />}

      {/* Load more */}
      <AnimatePresence>
        {nextCursor && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex justify-center pt-2"
          >
            <button
              onClick={onLoadMore}
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
        {isLoading && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-center py-2"
          >
            <Loader2 className="h-5 w-5 animate-spin text-primary/60" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
