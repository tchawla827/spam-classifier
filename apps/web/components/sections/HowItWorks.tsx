"use client";

import {
  Brain,
  Layers,
  AlertTriangle,
  ChevronRight,
  GitMerge,
  Sliders,
  Shield,
  MessageSquare,
  Fingerprint,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { getRevealProps } from "../../lib/motion";
import { GlassCard } from "../ui/GlassCard";

// ── Pipeline steps ──────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "Input",
    description:
      "You supply a subject and body — either by pasting text manually or connecting Gmail. The raw text is the only input the classifier needs.",
    color: "text-primary",
    dot: "bg-primary",
    border: "border-primary/20",
  },
  {
    step: "02",
    title: "Feature Extraction",
    description:
      "Two parallel pipelines run on the text. TF-IDF vectorisation captures vocabulary patterns. A handcrafted feature set captures structural signals: URL count, uppercase ratio, keyword hits, punctuation density, and more.",
    color: "text-cyan-400",
    dot: "bg-cyan-400",
    border: "border-cyan-400/20",
  },
  {
    step: "03",
    title: "Base Models",
    description:
      "Five calibrated classifiers each output an independent spam probability: Logistic Regression, Linear SVM, Complement Naïve Bayes, XGBoost, and LightGBM. Each uses its own optimised threshold.",
    color: "text-violet-400",
    dot: "bg-violet-400",
    border: "border-violet-400/20",
  },
  {
    step: "04",
    title: "Stacked Ensemble",
    description:
      "A meta-learner takes the five raw probabilities as inputs and outputs a single final probability. This reduces variance and outperforms any individual model.",
    color: "text-amber-400",
    dot: "bg-amber-400",
    border: "border-amber-400/20",
  },
  {
    step: "05",
    title: "Personalization",
    description:
      "Your sensitivity threshold, sender/domain rules, and feedback history are applied on top of the ensemble score to produce your personalised verdict.",
    color: "text-emerald-400",
    dot: "bg-emerald-400",
    border: "border-emerald-400/20",
  },
];

// ── Models ──────────────────────────────────────────────────────────────────

const MODELS = [
  { name: "Logistic Regression", tag: "LR", color: "bg-primary/10 text-primary border-primary/20" },
  { name: "Linear SVM", tag: "SVM", color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  { name: "Complement Naïve Bayes", tag: "CNB", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" },
  { name: "XGBoost", tag: "XGB", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  { name: "LightGBM", tag: "LGB", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
];

// ── Signal groups ────────────────────────────────────────────────────────────

const SIGNAL_GROUPS = [
  {
    title: "Vocabulary signals",
    icon: Brain,
    color: "text-primary",
    bg: "bg-primary/10",
    signals: ["TF-IDF bag-of-words over subject + body", "Suspicious keyword count (50+ patterns)"],
  },
  {
    title: "Structural signals",
    icon: Layers,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    signals: ["URL count", "Uppercase & digit ratios", "Punctuation density (!, ?, $, %)"],
  },
  {
    title: "Structural flags",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    signals: ["Subject is ALL CAPS", "Body is very short (< 10 words)", "Contains 'click here'"],
  },
];

// ── Personalization layers ───────────────────────────────────────────────────

const PERS_LAYERS = [
  { n: "1", title: "Global ensemble score", icon: GitMerge, color: "text-primary" },
  { n: "2", title: "Sensitivity threshold", icon: Sliders, color: "text-violet-400" },
  { n: "3", title: "Sender & domain rules", icon: Shield, color: "text-emerald-400" },
  { n: "4", title: "Feedback-informed adjustment", icon: MessageSquare, color: "text-amber-400" },
  { n: "5", title: "Final personalised verdict", icon: Fingerprint, color: "text-cyan-400" },
];

const fadeUp = (delay = 0, reducedMotion: boolean) =>
  reducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: "-40px" },
        transition: { duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1.0] as const },
      };

export function HowItWorks() {
  const reducedMotion = useReducedMotion();

  return (
    <section id="how-it-works" aria-label="How it works" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <motion.div {...getRevealProps(0, reducedMotion)} className="text-center mb-16">
          <p className="text-xs font-mono text-primary/80 uppercase tracking-widest mb-2">
            Under the hood
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Every email goes through a five-stage pipeline — from raw text to a personalised verdict in under 100 ms.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16 items-start">

          {/* LEFT: Pipeline */}
          <div>
            <motion.p
              {...fadeUp(0, reducedMotion)}
              className="text-xs font-mono text-primary/70 uppercase tracking-widest mb-5"
            >
              Classification pipeline
            </motion.p>

            <div className="relative">
              {/* Connector line */}
              <div className="absolute left-[18px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-primary via-violet-500 to-emerald-500 opacity-25" />

              <div className="space-y-4">
                {PIPELINE_STEPS.map((s, i) => (
                  <motion.div
                    key={s.step}
                    {...fadeUp(0.07 * i, reducedMotion)}
                    className="relative flex gap-4 items-start"
                  >
                    {/* Node */}
                    <div
                      className={cn(
                        "mt-1 h-9 w-9 rounded-full flex items-center justify-center shrink-0 z-10",
                        "bg-background border border-white/[0.1] text-xs font-mono font-bold",
                        s.color
                      )}
                    >
                      {s.step}
                    </div>

                    <GlassCard className={cn("flex-1 p-4 border", s.border)}>
                      <p className={cn("text-xs font-semibold uppercase tracking-wide mb-1", s.color)}>
                        {s.title}
                      </p>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {s.description}
                      </p>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT: Models + Signals + Personalization */}
          <div className="space-y-10">

            {/* Models */}
            <div>
              <motion.p
                {...fadeUp(0, reducedMotion)}
                className="text-xs font-mono text-primary/70 uppercase tracking-widest mb-4"
              >
                Five classifiers, one stacker
              </motion.p>

              <div className="flex flex-wrap gap-2 mb-3">
                {MODELS.map((m, i) => (
                  <motion.span
                    key={m.tag}
                    {...fadeUp(0.05 * i, reducedMotion)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-semibold border",
                      m.color
                    )}
                  >
                    <span className="font-bold">{m.tag}</span>
                    <span className="font-normal opacity-70">{m.name}</span>
                  </motion.span>
                ))}
              </div>

              <motion.div {...fadeUp(0.3, reducedMotion)}>
                <GlassCard className="p-3 border-amber-500/20 bg-amber-500/5">
                  <div className="flex gap-2.5 items-center">
                    <GitMerge className="h-4 w-4 text-amber-400 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      A <strong className="text-foreground/80">meta-learner stacker</strong> combines all five probabilities into a single final score that outperforms any individual model.
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            </div>

            {/* Signal groups */}
            <div>
              <motion.p
                {...fadeUp(0, reducedMotion)}
                className="text-xs font-mono text-primary/70 uppercase tracking-widest mb-4"
              >
                What signals are extracted
              </motion.p>

              <div className="grid sm:grid-cols-3 gap-3">
                {SIGNAL_GROUPS.map((g, i) => (
                  <motion.div key={g.title} {...fadeUp(0.07 * i, reducedMotion)}>
                    <GlassCard className="p-4 h-full">
                      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center mb-3", g.bg)}>
                        <g.icon className={cn("h-3.5 w-3.5", g.color)} />
                      </div>
                      <p className="text-xs font-semibold text-foreground mb-2">{g.title}</p>
                      <ul className="space-y-1">
                        {g.signals.map((s) => (
                          <li key={s} className="flex items-start gap-1.5">
                            <ChevronRight className="h-2.5 w-2.5 text-muted-foreground/50 mt-0.5 shrink-0" />
                            <span className="text-[11px] text-muted-foreground leading-relaxed">{s}</span>
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Personalization layers */}
            <div>
              <motion.p
                {...fadeUp(0, reducedMotion)}
                className="text-xs font-mono text-primary/70 uppercase tracking-widest mb-4"
              >
                Personalization layers
              </motion.p>

              <div className="flex flex-col gap-2">
                {PERS_LAYERS.map((l, i) => (
                  <motion.div
                    key={l.n}
                    {...fadeUp(0.05 * i, reducedMotion)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-2/40 border border-white/[0.05]"
                  >
                    <span className={cn("text-[11px] font-mono font-bold w-4 shrink-0", l.color)}>
                      {l.n}
                    </span>
                    <l.icon className={cn("h-3.5 w-3.5 shrink-0", l.color)} />
                    <span className="text-xs text-muted-foreground">{l.title}</span>
                  </motion.div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
