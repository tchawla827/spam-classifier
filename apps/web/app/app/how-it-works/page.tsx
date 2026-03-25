"use client";

import { motion } from "framer-motion";
import {
  BookOpen,
  Brain,
  Layers,
  Sliders,
  Shield,
  ShieldCheck,
  Ban,
  AlertTriangle,
  Info,
  ChevronRight,
  BarChart3,
  GitMerge,
  Fingerprint,
  MessageSquare,
} from "lucide-react";
import { cn } from "../../../lib/utils";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { GlassCard } from "../../../components/ui/GlassCard";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 14 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-40px" },
  transition: { duration: 0.4, delay, ease: [0.25, 0.1, 0.25, 1.0] as const },
});

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-mono text-primary/80 uppercase tracking-widest mb-1">
      {children}
    </p>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-display font-bold text-foreground mb-1">
      {children}
    </h2>
  );
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground leading-relaxed mb-6">
      {children}
    </p>
  );
}

// ── Pipeline step ─────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  {
    step: "01",
    title: "Input",
    description:
      "You supply a subject and body — either by pasting text manually or connecting Gmail. The raw text is the only input the classifier needs.",
    color: "text-primary",
    dot: "bg-primary",
  },
  {
    step: "02",
    title: "Feature Extraction",
    description:
      "Two parallel pipelines run on the text. TF-IDF vectorisation captures vocabulary patterns. A handcrafted feature set captures structural signals: URL count, uppercase ratio, keyword hits, punctuation density, and 9 more.",
    color: "text-cyan-400",
    dot: "bg-cyan-400",
  },
  {
    step: "03",
    title: "Base Models",
    description:
      "Five calibrated classifiers each output an independent spam probability: Logistic Regression, Linear SVM, Complement Naïve Bayes, XGBoost, and LightGBM. Each uses its own optimised threshold.",
    color: "text-violet-400",
    dot: "bg-violet-400",
  },
  {
    step: "04",
    title: "Stacked Ensemble",
    description:
      "A meta-learner (stacker) takes the five raw probabilities as inputs and outputs a single final probability. This reduces variance and outperforms any individual model.",
    color: "text-amber-400",
    dot: "bg-amber-400",
  },
  {
    step: "05",
    title: "Personalization",
    description:
      "Your sensitivity threshold, sender/domain rules, and feedback history are applied on top of the ensemble score to produce your personalised verdict.",
    color: "text-emerald-400",
    dot: "bg-emerald-400",
  },
];

// ── Models ────────────────────────────────────────────────────────────────────

const MODELS = [
  {
    name: "Logistic Regression",
    tag: "LR",
    color: "bg-primary/10 text-primary border-primary/20",
    description:
      "Fast, linear baseline. Excels at high-frequency vocabulary patterns. Highly interpretable and acts as a sanity check for the ensemble.",
  },
  {
    name: "Linear SVM",
    tag: "SVM",
    color: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    description:
      "Maximises the margin between spam and non-spam in feature space. Robust to noisy text and effective on sparse TF-IDF inputs.",
  },
  {
    name: "Complement Naïve Bayes",
    tag: "CNB",
    color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    description:
      "Variant of Naïve Bayes designed for imbalanced classes. Trains on the complement of each class, improving precision on skewed email datasets.",
  },
  {
    name: "XGBoost",
    tag: "XGB",
    color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    description:
      "Gradient-boosted trees. Captures non-linear interactions between features — catches patterns that linear models miss.",
  },
  {
    name: "LightGBM",
    tag: "LGB",
    color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    description:
      "Leaf-wise tree boosting. Faster training than XGBoost and often more accurate on larger feature sets. Complements XGB in the ensemble.",
  },
];

// ── Signal categories ─────────────────────────────────────────────────────────

const SIGNAL_GROUPS = [
  {
    title: "Vocabulary signals",
    icon: Brain,
    color: "text-primary",
    bg: "bg-primary/10",
    signals: [
      "TF-IDF bag-of-words over subject + body",
      "Suspicious keyword count (50+ patterns: lottery, urgent, verify…)",
    ],
  },
  {
    title: "Structural signals",
    icon: Layers,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    signals: [
      "Subject & body length / word count",
      "URL count",
      "Uppercase ratio",
      "Digit ratio",
      "Punctuation density (!, ?, $, %, &…)",
      "Exclamation and question mark counts",
      "Dollar sign count",
    ],
  },
  {
    title: "Structural flags",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    signals: [
      "Subject is ALL CAPS",
      "Subject starts with Re: or Fwd:",
      "Body is very short (< 10 words)",
      "Contains 'click here' call-to-action",
    ],
  },
];

// ── Risk bands ────────────────────────────────────────────────────────────────

const RISK_BANDS = [
  {
    band: "Low",
    range: "0 – 33%",
    label: "Safe",
    color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    bar: "bg-emerald-500",
    barW: "w-1/3",
  },
  {
    band: "Medium",
    range: "33 – 67%",
    label: "Review",
    color: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    bar: "bg-amber-400",
    barW: "w-2/3",
  },
  {
    band: "High",
    range: "67 – 100%",
    label: "Spam",
    color: "bg-destructive/15 text-destructive border-destructive/25",
    bar: "bg-destructive",
    barW: "w-full",
  },
];

// ── Personalization layers ────────────────────────────────────────────────────

const PERS_LAYERS = [
  {
    n: "1",
    title: "Global ensemble score",
    desc: "The stacked model outputs a raw probability (0–100%). This is the starting point for every classification.",
    icon: GitMerge,
    color: "text-primary",
  },
  {
    n: "2",
    title: "Sensitivity threshold",
    desc: "Your chosen sensitivity (Relaxed / Balanced / Strict) shifts the spam threshold. Strict = more emails flagged as spam; Relaxed = fewer false positives.",
    icon: Sliders,
    color: "text-violet-400",
  },
  {
    n: "3",
    title: "Sender & domain rules",
    desc: "Hard overrides. A trusted sender is always marked safe regardless of score. A blocked domain is always marked spam.",
    icon: Shield,
    color: "text-emerald-400",
  },
  {
    n: "4",
    title: "Feedback-informed adjustment",
    desc: "Each time you mark a result as a false positive or false negative, your profile is updated. The personalization layer uses your feedback history to nudge borderline scores.",
    icon: MessageSquare,
    color: "text-amber-400",
  },
  {
    n: "5",
    title: "Final verdict",
    desc: "The result after all layers. If personalization changed the outcome, the badge shows 'Personalized' with the reason.",
    icon: Fingerprint,
    color: "text-cyan-400",
  },
];

// ── Settings reference ────────────────────────────────────────────────────────

const SETTINGS_DOCS = [
  {
    name: "Sensitivity",
    icon: Sliders,
    color: "text-primary",
    bg: "bg-primary/10",
    options: [
      {
        label: "Relaxed",
        desc: "Raises the spam threshold. Fewer emails are flagged, so you see less noise. Ideal if you trust your senders and want minimal interruption.",
      },
      {
        label: "Balanced",
        desc: "The default. Uses the model's optimised threshold. Best for most users.",
      },
      {
        label: "Strict",
        desc: "Lowers the spam threshold. More emails are flagged. Prefer this if you receive a high volume of phishing or promotional email.",
      },
    ],
    note: null,
  },
  {
    name: "Personalization",
    icon: Fingerprint,
    color: "text-violet-400",
    bg: "bg-violet-500/10",
    options: [
      {
        label: "On",
        desc: "Your feedback history and feedback-informed score adjustments are applied. Borderline emails can be nudged by past corrections.",
      },
      {
        label: "Off",
        desc: "Only the global ensemble + your rules and sensitivity threshold are used. Feedback is still recorded but doesn't influence scores.",
      },
    ],
    note: "Sender and domain rules always apply regardless of this toggle.",
  },
  {
    name: "Review band",
    icon: BarChart3,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    options: [
      {
        label: "On",
        desc: "Emails in the medium risk band (33–67%) are placed into a 'Review' state instead of being immediately labelled spam. Useful for auditing borderline cases.",
      },
      {
        label: "Off",
        desc: "All emails are classified as spam or not_spam directly. No separate review queue.",
      },
    ],
    note: null,
  },
  {
    name: "Trusted senders",
    icon: ShieldCheck,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    options: [
      {
        label: "How it works",
        desc: "Add a full email address (e.g. someone@company.com). Any email from that exact address is always marked safe, regardless of content or model score.",
      },
    ],
    note: "This is a hard override — even 99% spam confidence is overridden. Use it for senders you trust completely.",
  },
  {
    name: "Blocked domains",
    icon: Ban,
    color: "text-destructive",
    bg: "bg-destructive/10",
    options: [
      {
        label: "How it works",
        desc: "Add a domain (e.g. spam-domain.com). Every email from that domain is always marked spam, regardless of content or model score.",
      },
    ],
    note: "This is also a hard override. Useful for known spam domains that the model might occasionally miss.",
  },
];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function HowItWorksPage() {
  const reducedMotion = useReducedMotion();

  const mv = reducedMotion ? undefined : fadeUp;

  return (
    <div className="max-w-3xl mx-auto space-y-16 pb-12">

      {/* Page header */}
      <motion.div
        {...(reducedMotion ? {} : fadeUp(0))}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <span className="text-xs font-mono text-primary/80 uppercase tracking-widest">
            How It Works
          </span>
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Under the hood
        </h1>
        <p className="text-sm text-muted-foreground">
          How SpamShield classifies email, what the models do, and how your settings shape every verdict.
        </p>
      </motion.div>

      {/* ── 1. Pipeline ───────────────────────────────────────────────────── */}
      <section>
        <motion.div {...(reducedMotion ? {} : fadeUp(0))}>
          <SectionLabel>Classification pipeline</SectionLabel>
          <SectionTitle>From raw text to verdict</SectionTitle>
          <SectionDesc>
            Every email — whether pasted manually or fetched from Gmail — goes through the same five-stage pipeline.
          </SectionDesc>
        </motion.div>

        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-[18px] top-4 bottom-4 w-[2px] bg-gradient-to-b from-primary via-violet-500 to-emerald-500 opacity-30" />

          <div className="space-y-4">
            {PIPELINE_STEPS.map((s, i) => (
              <motion.div
                key={s.step}
                {...(reducedMotion ? {} : fadeUp(0.06 * i))}
                className="relative flex gap-4 items-start"
              >
                {/* Node */}
                <div className={cn("mt-1 h-9 w-9 rounded-full flex items-center justify-center shrink-0 z-10 bg-background border border-white/[0.1] text-xs font-mono font-bold", s.color)}>
                  {s.step}
                </div>

                <GlassCard className="flex-1 p-4">
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
      </section>

      {/* ── 2. Models ─────────────────────────────────────────────────────── */}
      <section>
        <motion.div {...(reducedMotion ? {} : fadeUp(0))}>
          <SectionLabel>The models</SectionLabel>
          <SectionTitle>Five classifiers, one stacker</SectionTitle>
          <SectionDesc>
            Each base model is independently calibrated so its output is a true probability. The stacker learns how to combine them optimally.
          </SectionDesc>
        </motion.div>

        <div className="space-y-3">
          {MODELS.map((m, i) => (
            <motion.div key={m.name} {...(reducedMotion ? {} : fadeUp(0.05 * i))}>
              <GlassCard className="p-4 flex gap-4 items-start">
                <span className={cn("inline-flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-mono font-bold border shrink-0 mt-0.5", m.color)}>
                  {m.tag}
                </span>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{m.name}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{m.description}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div {...(reducedMotion ? {} : fadeUp(0.3))} className="mt-4">
          <GlassCard className="p-4 border-amber-500/20 bg-amber-500/5">
            <div className="flex gap-3 items-start">
              <GitMerge className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground mb-0.5">Stacked ensemble</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A meta-learner is trained on the five base-model probabilities. It learns that some models are more reliable than others on certain patterns, producing a final score that is more accurate than any single model.
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      </section>

      {/* ── 3. Signal categories ──────────────────────────────────────────── */}
      <section>
        <motion.div {...(reducedMotion ? {} : fadeUp(0))}>
          <SectionLabel>Features</SectionLabel>
          <SectionTitle>What signals are extracted</SectionTitle>
          <SectionDesc>
            14 handcrafted structural features plus TF-IDF vocabulary features are computed for every email before any model sees it.
          </SectionDesc>
        </motion.div>

        <div className="grid sm:grid-cols-3 gap-4">
          {SIGNAL_GROUPS.map((g, i) => (
            <motion.div key={g.title} {...(reducedMotion ? {} : fadeUp(0.07 * i))}>
              <GlassCard className="p-4 h-full">
                <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center mb-3", g.bg)}>
                  <g.icon className={cn("h-4 w-4", g.color)} />
                </div>
                <p className="text-sm font-semibold text-foreground mb-2">{g.title}</p>
                <ul className="space-y-1.5">
                  {g.signals.map((s) => (
                    <li key={s} className="flex items-start gap-1.5">
                      <ChevronRight className="h-3 w-3 text-muted-foreground/50 mt-0.5 shrink-0" />
                      <span className="text-xs text-muted-foreground">{s}</span>
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 4. Risk bands ─────────────────────────────────────────────────── */}
      <section>
        <motion.div {...(reducedMotion ? {} : fadeUp(0))}>
          <SectionLabel>Risk score</SectionLabel>
          <SectionTitle>How scores map to verdicts</SectionTitle>
          <SectionDesc>
            The ensemble outputs a probability from 0 to 100%. That number is bucketed into three bands.
          </SectionDesc>
        </motion.div>

        <div className="space-y-3">
          {RISK_BANDS.map((b, i) => (
            <motion.div key={b.band} {...(reducedMotion ? {} : fadeUp(0.07 * i))}>
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", b.color)}>
                    {b.label}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{b.range}</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                  <div className={cn("h-full rounded-full", b.bar, b.barW)} />
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div {...(reducedMotion ? {} : fadeUp(0.25))} className="mt-3">
          <div className="flex items-start gap-2 px-1">
            <Info className="h-3.5 w-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              When the Review band is enabled in Settings, medium-risk emails (33–67%) go into a separate review queue instead of being immediately labelled spam.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── 5. Personalization layers ─────────────────────────────────────── */}
      <section>
        <motion.div {...(reducedMotion ? {} : fadeUp(0))}>
          <SectionLabel>Personalization</SectionLabel>
          <SectionTitle>Five layers applied to every result</SectionTitle>
          <SectionDesc>
            SpamShield never retrains the global model for individual users. Instead, five layers are applied on top of the ensemble output to adapt results to your inbox.
          </SectionDesc>
        </motion.div>

        <div className="space-y-3">
          {PERS_LAYERS.map((l, i) => (
            <motion.div key={l.n} {...(reducedMotion ? {} : fadeUp(0.06 * i))}>
              <GlassCard className="p-4 flex gap-4 items-start">
                <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
                  <span className={cn("text-[11px] font-mono font-bold", l.color)}>{l.n}</span>
                  <l.icon className={cn("h-4 w-4", l.color)} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-0.5">{l.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{l.desc}</p>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div {...(reducedMotion ? {} : fadeUp(0.4))} className="mt-4">
          <div className="flex items-start gap-2 px-1">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400/80 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Feedback adjustments influence <strong className="text-foreground/70">borderline scores</strong> (roughly 40–70%). A high-confidence result like 95% spam will not be flipped by feedback alone — add a Trusted Sender rule instead.
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── 6. Settings reference ─────────────────────────────────────────── */}
      <section>
        <motion.div {...(reducedMotion ? {} : fadeUp(0))}>
          <SectionLabel>Settings reference</SectionLabel>
          <SectionTitle>What each setting does</SectionTitle>
          <SectionDesc>
            Every setting in SpamShield maps directly to one of the personalization layers above.
          </SectionDesc>
        </motion.div>

        <div className="space-y-4">
          {SETTINGS_DOCS.map((s, i) => (
            <motion.div key={s.name} {...(reducedMotion ? {} : fadeUp(0.06 * i))}>
              <GlassCard className="p-5">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("h-8 w-8 rounded-lg flex items-center justify-center shrink-0", s.bg)}>
                    <s.icon className={cn("h-4 w-4", s.color)} />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{s.name}</p>
                </div>

                {/* Options */}
                <div className="space-y-3">
                  {s.options.map((o) => (
                    <div key={o.label} className="flex gap-2.5 items-start">
                      <span className={cn("mt-0.5 text-[11px] font-semibold font-mono shrink-0 rounded px-1.5 py-0.5 border", s.bg, s.color, "border-white/[0.08]")}>
                        {o.label}
                      </span>
                      <p className="text-xs text-muted-foreground leading-relaxed">{o.desc}</p>
                    </div>
                  ))}
                </div>

                {/* Note */}
                {s.note && (
                  <div className="mt-3 flex items-start gap-2 pt-3 border-t border-white/[0.05]">
                    <Info className="h-3.5 w-3.5 text-muted-foreground/60 mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">{s.note}</p>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

    </div>
  );
}
