"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Sparkles,
  History,
  Mail,
  Settings,
  ArrowRight,
  Shield,
  Zap,
  BarChart3,
  Loader2,
  Search,
  Brain,
  Database,
  Target,
  Timer,
  Layers,
} from "lucide-react";
import { cn } from "../../lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useDashboardStats } from "../../hooks/useDashboardStats";
import { GlassCard } from "../../components/ui/GlassCard";
import { CountUp } from "../../components/ui/CountUp";

const QUICK_ACTIONS = [
  {
    label: "Classify Email",
    description: "Paste a subject and body to detect spam instantly.",
    href: "/app/classify",
    icon: Zap,
    color: "from-primary/20 to-primary/5",
    iconColor: "text-primary",
    border: "border-primary/20 hover:border-primary/40",
  },
  {
    label: "View History",
    description: "Browse and search your past classification events.",
    href: "/app/history",
    icon: History,
    color: "from-cyan/20 to-cyan/5",
    iconColor: "text-cyan",
    border: "border-cyan/20 hover:border-cyan/40",
  },
  {
    label: "Gmail Inbox",
    description: "Connect your Gmail to classify real messages.",
    href: "/app/gmail",
    icon: Mail,
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
  },
  {
    label: "Insights",
    description: "See your false-positive rate, top domains, and stats.",
    href: "/app/insights",
    icon: BarChart3,
    color: "from-amber-500/20 to-amber-500/5",
    iconColor: "text-amber-400",
    border: "border-amber-500/20 hover:border-amber-500/40",
  },
  {
    label: "Settings",
    description: "Tune sensitivity, manage rules, and control privacy.",
    href: "/app/settings",
    icon: Settings,
    color: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-400",
    border: "border-violet-500/20 hover:border-violet-500/40",
  },
] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] } },
};

export default function AppHomePage() {
  const { user } = useAuth();
  const reducedMotion = useReducedMotion();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const { stats, isLoading: statsLoading } = useDashboardStats();

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* Welcome header */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1.0] }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2.5">
          <Shield className="h-6 w-6 text-primary animate-glow-pulse" />
          <span className="text-xs font-mono text-primary/80 uppercase tracking-widest">
            Workspace
          </span>
        </div>
        <h1 className="text-3xl font-display font-bold text-foreground">
          Welcome back, {firstName}
          <span className="inline-block ml-2 text-primary">
            <Sparkles className="inline h-6 w-6" />
          </span>
        </h1>
        <p className="text-muted-foreground text-sm">
          Your spam protection dashboard. Everything in one place.
        </p>
      </motion.div>

      {/* Stats placeholder strip */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: [0.25, 0.1, 0.25, 1.0] }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {[
          { label: "Classified", value: stats?.total_classifications, sub: "all time" },
          { label: "Spam caught", value: stats?.spam_detected, sub: "detected" },
          { label: "False positives", value: stats?.false_positive_count, sub: "your feedback" },
          { label: "In review", value: stats?.review_count, sub: "pending" },
        ].map((stat) => (
          <div
            key={stat.label}
            className={cn(
              "rounded-xl p-4",
              "bg-surface-2/60 border border-white/[0.06]",
              "flex flex-col gap-1"
            )}
          >
            <span className={cn(
              "text-2xl font-display font-bold",
              statsLoading ? "text-foreground/20" : "text-foreground"
            )}>
              {statsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                stat.value ?? 0
              )}
            </span>
            <span className="text-xs font-medium text-foreground/60">{stat.label}</span>
            <span className="text-[10px] text-muted-foreground">{stat.sub}</span>
          </div>
        ))}
      </motion.div>

      {/* Quick-action cards */}
      <div>
        <motion.h2
          initial={reducedMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25 }}
          className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4"
        >
          Quick actions
        </motion.h2>

        <motion.div
          variants={reducedMotion ? undefined : containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {QUICK_ACTIONS.map(({ label, description, href, icon: Icon, color, iconColor, border }) => (
            <motion.div key={label} variants={reducedMotion ? undefined : itemVariants}>
              <Link
                href={href}
                className={cn(
                  "group relative flex flex-col gap-3 p-5 rounded-xl",
                  "bg-gradient-to-br border transition-all duration-250",
                  "hover:-translate-y-0.5 hover:shadow-glow-sm",
                  "focus-ring",
                  color,
                  border
                )}
              >
                {/* Icon */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg flex items-center justify-center",
                    "bg-background/60 border border-white/[0.08]"
                  )}
                >
                  <Icon className={cn("h-4.5 w-4.5", iconColor)} style={{ width: 18, height: 18 }} />
                </div>

                {/* Text */}
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground group-hover:text-white transition-colors">
                    {label}
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
                </div>

                {/* Arrow */}
                <ArrowRight
                  className={cn(
                    "absolute bottom-4 right-4 h-4 w-4",
                    "text-muted-foreground/40 group-hover:text-foreground/60",
                    "translate-x-0 group-hover:translate-x-1",
                    "transition-all duration-200"
                  )}
                />
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* How It Works */}
      <div>
        <motion.h2
          initial={reducedMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4"
        >
          How it works
        </motion.h2>

        <div className="relative max-w-3xl">
          {/* Vertical connector line */}
          <motion.div
            className="absolute left-5 md:left-1/2 top-0 bottom-0 w-[2px] md:-translate-x-1/2"
            initial={reducedMotion ? undefined : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] }}
            style={{ transformOrigin: "top", background: "linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--accent-cyan)))" }}
          />

          <div className="relative space-y-8">
            {[
              { icon: Search, title: "Detect", description: "Scan messages for suspicious patterns, phishing signals, and known spam indicators." },
              { icon: Brain, title: "Classify", description: "An ensemble of ML models analyzes each message and assigns a spam probability score." },
              { icon: Zap, title: "Filter", description: "Instantly separate spam from legitimate messages so you only see what matters." },
            ].map((step, i) => (
              <motion.div
                key={step.title}
                initial={reducedMotion ? undefined : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: 0.1 * i, ease: [0.25, 0.1, 0.25, 1.0] }}
                className="relative flex items-start gap-6 md:flex-col md:items-center md:text-center"
              >
                {/* Node */}
                <div className="relative z-10 flex-shrink-0">
                  <div className="flex items-center justify-center h-3 w-3 rounded-full bg-primary shadow-glow-sm" />
                </div>

                {/* Card */}
                <GlassCard className="p-4 flex-1 md:w-full">
                  <div className="flex items-start gap-4 md:flex-col md:items-center">
                    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {step.title}
                      </h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div>
        <motion.h2
          initial={reducedMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4"
        >
          Built for accuracy
        </motion.h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0">
          {[
            { icon: Database, end: 50000, suffix: "+", label: "Emails Analyzed" },
            { icon: Target, end: 97.8, suffix: "%", decimals: 1, label: "Precision Score" },
            { icon: Timer, end: 100, prefix: "<", suffix: "ms", label: "Inference Time" },
            { icon: Layers, end: 4, label: "Signal Categories" },
          ].map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={reducedMotion ? undefined : { opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: 0.08 * (i + 1), ease: [0.25, 0.1, 0.25, 1.0] }}
              className="relative"
            >
              {/* Vertical divider on desktop */}
              {i > 0 && (
                <div className="hidden lg:block absolute left-0 top-1/4 bottom-1/4 w-[1px] bg-white/[0.06]" />
              )}
              <GlassCard className="flex flex-col items-center text-center p-6 lg:rounded-none lg:border-x-0 lg:first:rounded-l-xl lg:last:rounded-r-xl">
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary mb-4">
                  <metric.icon className="h-5 w-5" />
                </div>
                <CountUp
                  end={metric.end}
                  prefix={metric.prefix ?? ""}
                  suffix={metric.suffix ?? ""}
                  decimals={metric.decimals ?? 0}
                  className="text-2xl sm:text-3xl font-mono font-bold text-foreground tracking-tight"
                />
                <span className="mt-1 text-sm text-muted-foreground">
                  {metric.label}
                </span>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

    </div>
  );
}
