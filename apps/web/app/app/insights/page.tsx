"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  ShieldAlert,
  ShieldCheck,
  Clock,
  ThumbsDown,
  ThumbsUp,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { cn } from "../../../lib/utils";
import { useReducedMotion } from "../../../hooks/useReducedMotion";

// ── Types ────────────────────────────────────────────────────────────────────

interface DomainCount {
  domain: string;
  count: number;
}

interface InsightsSummary {
  total_classifications: number;
  spam_detected: number;
  safe_detected: number;
  review_count: number;
  false_positive_count: number;
  false_negative_count: number;
  top_flagged_domains: DomainCount[];
}

// ── API fetch ────────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchInsightsSummary(): Promise<InsightsSummary> {
  const res = await fetch(`${API_BASE}/api/v1/insights/summary`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error(`Failed to load insights (${res.status})`);
  return res.json();
}

// ── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
  delay,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
  delay: number;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="glass rounded-xl p-5 flex items-center gap-4"
    >
      <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold font-mono text-foreground">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      </div>
    </motion.div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <div className="h-14 w-14 rounded-2xl bg-surface-2/60 border border-white/[0.06] flex items-center justify-center">
        <BarChart3 className="h-6 w-6 text-muted-foreground/50" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">No data yet</p>
        <p className="text-xs text-muted-foreground max-w-[260px]">
          Run some classifications and your stats will appear here.
        </p>
      </div>
    </div>
  );
}

// ── Custom recharts tooltip ───────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface-1 border border-white/[0.08] rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-foreground font-medium">{label}</p>
      <p className="text-muted-foreground">{payload[0].value} flagged</p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InsightsPage() {
  const reducedMotion = useReducedMotion();
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchInsightsSummary()
      .then(setSummary)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const isEmpty = summary?.total_classifications === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="text-xs font-mono text-primary/80 uppercase tracking-widest">
            Insights
          </span>
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Your Classification Stats
        </h1>
        <p className="text-sm text-muted-foreground">
          A summary of your spam detection activity and feedback.
        </p>
      </motion.div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-primary/60" />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && isEmpty && <EmptyState />}

      {/* Content */}
      {!loading && !error && summary && !isEmpty && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard
              label="Total Classifications"
              value={summary.total_classifications}
              icon={BarChart3}
              colorClass="bg-primary/15 text-primary"
              delay={0}
            />
            <StatCard
              label="Spam Detected"
              value={summary.spam_detected}
              icon={ShieldAlert}
              colorClass="bg-destructive/15 text-destructive"
              delay={0.05}
            />
            <StatCard
              label="Safe Emails"
              value={summary.safe_detected}
              icon={ShieldCheck}
              colorClass="bg-emerald-500/15 text-emerald-400"
              delay={0.1}
            />
            <StatCard
              label="In Review"
              value={summary.review_count}
              icon={Clock}
              colorClass="bg-amber-400/15 text-amber-400"
              delay={0.15}
            />
          </div>

          {/* Feedback breakdown */}
          {(summary.false_positive_count > 0 || summary.false_negative_count > 0) && (
            <motion.div
              initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.2 }}
              className="glass rounded-xl p-6 space-y-4"
            >
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold text-foreground">Feedback Breakdown</h2>
                <p className="text-xs text-muted-foreground">
                  Corrections you've submitted to improve your results.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 rounded-lg bg-surface-2/60 border border-white/[0.06] px-4 py-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-400/15 flex items-center justify-center shrink-0">
                    <ThumbsUp className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono text-foreground">
                      {summary.false_positive_count}
                    </p>
                    <p className="text-[11px] text-muted-foreground">False positives</p>
                    <p className="text-[10px] text-muted-foreground/60">Marked spam → was safe</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-surface-2/60 border border-white/[0.06] px-4 py-3">
                  <div className="h-8 w-8 rounded-lg bg-destructive/15 flex items-center justify-center shrink-0">
                    <ThumbsDown className="h-4 w-4 text-destructive" />
                  </div>
                  <div>
                    <p className="text-lg font-bold font-mono text-foreground">
                      {summary.false_negative_count}
                    </p>
                    <p className="text-[11px] text-muted-foreground">False negatives</p>
                    <p className="text-[10px] text-muted-foreground/60">Marked safe → was spam</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Top flagged domains */}
          {summary.top_flagged_domains.length > 0 && (
            <motion.div
              initial={reducedMotion ? undefined : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25 }}
              className="glass rounded-xl p-6 space-y-4"
            >
              <div className="space-y-0.5">
                <h2 className="text-sm font-semibold text-foreground">Top Flagged Domains</h2>
                <p className="text-xs text-muted-foreground">
                  Domains most frequently flagged as spam in your inbox.
                </p>
              </div>
              <ResponsiveContainer width="100%" height={Math.min(summary.top_flagged_domains.length * 44, 320)}>
                <BarChart
                  data={summary.top_flagged_domains}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="domain"
                    width={140}
                    tick={{ fill: "hsl(var(--foreground))", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--surface-2) / 0.4)" }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {summary.top_flagged_domains.map((_, i) => (
                      <Cell
                        key={i}
                        fill={`hsl(var(--risk-high) / ${Math.max(0.4, 1 - i * 0.08)})`}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
