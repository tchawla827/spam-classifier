"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

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

function Badge({ label }: { label: "spam" | "safe" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
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
    <span className="inline-flex items-center rounded-md bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">
      {value.toFixed(1)}%
    </span>
  );
}

function ReasonTag({ reason }: { reason: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground">
      {reason}
    </span>
  );
}

export function ProductPreview() {
  return (
    <section
      id="demo"
      aria-label="Product preview"
      className="py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            See It In Action
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Here&apos;s how the classifier breaks down incoming messages.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className={cn(
            "rounded-xl border border-border bg-card/80 backdrop-blur-sm overflow-hidden",
            "shadow-[0_0_40px_hsl(var(--primary-glow)/0.06)]"
          )}
        >
          {/* Header bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-card/60">
            <span className="h-2.5 w-2.5 rounded-full bg-risk-high/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-risk-medium/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-risk-low/60" />
            <span className="ml-3 text-xs text-muted-foreground font-mono">
              spam-classifier / inbox
            </span>
          </div>

          {/* Message rows */}
          <div className="divide-y divide-border">
            {sampleMessages.map((msg, i) => (
              <motion.div
                key={msg.subject}
                initial={{ opacity: 0, x: -16 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.15 + i * 0.12 }}
                className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 p-5 hover:bg-card/60 transition-colors"
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
        </motion.div>
      </div>
    </section>
  );
}
