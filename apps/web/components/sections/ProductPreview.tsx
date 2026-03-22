"use client";

import { Inbox, Trash2, Archive, Search as SearchIcon } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { getRevealProps, getSlideRevealProps } from "../../lib/motion";

interface SampleMessage {
  subject: string;
  snippet: string;
  label: "spam" | "safe";
  confidence: number;
  reasons: string[];
}

const sampleMessages: SampleMessage[] = [
  {
    subject: "Claim your reward now!!!",
    snippet: "You've been selected as a winner. Click here to claim your $1,000 gift card immediately...",
    label: "spam",
    confidence: 98.2,
    reasons: ["Urgency language", "Reward bait", "Suspicious link pattern"],
  },
  {
    subject: "Meeting moved to 3 PM",
    snippet: "Hi team, just a heads up that tomorrow's standup has been moved to 3 PM. Same room as usual.",
    label: "safe",
    confidence: 96.5,
    reasons: ["Known sender pattern", "Professional tone", "No suspicious links"],
  },
  {
    subject: "Verify your bank details urgently",
    snippet: "Dear customer, your account has been flagged for suspicious activity. Verify your credentials now...",
    label: "spam",
    confidence: 99.1,
    reasons: ["Phishing pattern", "Urgency language", "Credential request"],
  },
];

const folders = [
  { icon: Inbox, label: "Inbox", count: 12, active: true },
  { icon: Trash2, label: "Spam", count: 8, active: false },
  { icon: Archive, label: "Archive", count: null, active: false },
];

function Badge({ label }: { label: "spam" | "safe" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold",
        label === "spam"
          ? "bg-risk-high/15 text-risk-high"
          : "bg-risk-low/15 text-risk-low"
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          label === "spam" ? "bg-risk-high" : "bg-risk-low"
        )}
      />
      {label === "spam" ? "Spam" : "Safe"}
    </span>
  );
}

function ConfidenceChip({ value }: { value: number }) {
  return (
    <span className="inline-flex items-center rounded-md bg-surface-2 px-2 py-0.5 text-xs font-mono text-muted-foreground">
      {value.toFixed(1)}%
    </span>
  );
}

function ReasonTag({ reason }: { reason: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-white/[0.06] px-2 py-0.5 text-xs text-muted-foreground">
      {reason}
    </span>
  );
}

export function ProductPreview() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      aria-label="Product preview"
      className="py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <motion.div
          {...getRevealProps(0, reducedMotion)}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            See It In Action
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Here&apos;s how the classifier breaks down incoming messages.
          </p>
        </motion.div>

        <motion.div
          {...getRevealProps(0.1, reducedMotion)}
          className="glass rounded-xl overflow-hidden shadow-glow-sm"
        >
          <div className="flex">
            {/* Sidebar — desktop only */}
            <div className="hidden lg:flex flex-col w-48 border-r border-white/[0.06] bg-surface-0/40 py-3">
              {folders.map((folder) => (
                <div
                  key={folder.label}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                    folder.active
                      ? "text-foreground bg-primary/10 border-r-2 border-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <folder.icon className="h-4 w-4" />
                  <span>{folder.label}</span>
                  {folder.count !== null && (
                    <span className="ml-auto text-xs font-mono text-muted-foreground/60">
                      {folder.count}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              {/* Header bar */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.06] bg-surface-0/30">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-risk-high/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-risk-medium/60" />
                  <span className="h-2.5 w-2.5 rounded-full bg-risk-low/60" />
                </div>
                <div className="flex-1 flex items-center gap-2 ml-2 px-3 py-1.5 rounded-md bg-surface-1/50 border border-white/[0.04]">
                  <SearchIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground/50 font-mono">
                    Search messages...
                  </span>
                </div>
                <span className="hidden sm:inline-flex items-center rounded-md bg-primary/15 text-primary px-3 py-1 text-xs font-medium">
                  Classify All
                </span>
              </div>

              {/* Message rows */}
              <div className="divide-y divide-white/[0.04]">
                {sampleMessages.map((msg, i) => (
                  <motion.div
                    key={msg.subject}
                    {...getSlideRevealProps(0.15 + i * 0.2, reducedMotion)}
                    className={cn(
                      "grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 p-5 hover:bg-surface-1/30 transition-colors",
                      i === 0 && "border-l-2 border-primary bg-surface-1/20"
                    )}
                  >
                    {/* Left: message content */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-sm font-semibold text-foreground truncate">
                          {msg.subject}
                        </h3>
                        <Badge label={msg.label} />
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {msg.snippet}
                      </p>
                    </div>

                    {/* Right: classification details */}
                    <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                      <ConfidenceChip value={msg.confidence} />
                      {msg.reasons.map((reason) => (
                        <ReasonTag key={reason} reason={reason} />
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
