"use client";

import dynamic from "next/dynamic";
import { ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "../../lib/utils";
import { useHeroStore } from "../../lib/hero/heroState";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useAutoDemo } from "../../hooks/useAutoDemo";
import { HeroStatus } from "../hero/HeroStatus";
import { AccessibleControls } from "../hero/AccessibleControls";
import { HERO_ENTRANCE } from "../../lib/motion";

const SpamHeroScene = dynamic(
  () => import("../hero/SpamHeroScene"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[4/3] lg:aspect-[3/2] glass rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading scene...</span>
      </div>
    ),
  }
);

const HEADLINE_WORDS = [
  { text: "Turn", className: "text-foreground" },
  { text: "spam", className: "text-foreground" },
  { text: "into", className: "text-foreground" },
  { text: "trash.", className: "text-primary" },
];

export function Hero() {
  const isComplete = useHeroStore((s) => s.isComplete);
  const reducedMotion = useReducedMotion();
  const { demoPhase } = useAutoDemo(reducedMotion);

  return (
    <section
      id="main-content"
      className="relative min-h-[90vh] flex items-center pt-16"
    >
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-12 items-center">
          {/* Left: Copy */}
          <div className="space-y-6 text-center lg:text-left">
            <h1
              className="font-display text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.05]"
              style={{ fontSize: "clamp(2.5rem, 5vw + 1rem, 4.5rem)" }}
            >
              {reducedMotion ? (
                <>
                  Turn spam into{" "}
                  <span className="text-primary">trash.</span>
                </>
              ) : (
                HEADLINE_WORDS.map((word, i) => (
                  <motion.span
                    key={word.text}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.5,
                      delay: HERO_ENTRANCE.headline + i * HERO_ENTRANCE.headlineStagger,
                      ease: [0.25, 0.1, 0.25, 1.0],
                    }}
                    className={cn("inline-block mr-[0.25em]", word.className)}
                  >
                    {word.text}
                  </motion.span>
                ))
              )}
            </h1>

            <motion.p
              initial={reducedMotion ? undefined : { opacity: 0, clipPath: "inset(100% 0 0 0)" }}
              animate={{ opacity: 1, clipPath: "inset(0 0 0 0)" }}
              transition={{ duration: 0.6, delay: HERO_ENTRANCE.subheadline, ease: [0.25, 0.1, 0.25, 1.0] }}
              className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0"
            >
              AI-powered spam detection for cleaner inboxes, safer clicks, and
              faster message triage.
            </motion.p>

            {/* CTA Stack */}
            <motion.div
              initial={reducedMotion ? undefined : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: HERO_ENTRANCE.ctas, ease: [0.25, 0.1, 0.25, 1.0] }}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <motion.a
                href="#demo"
                className={cn(
                  "inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold",
                  "bg-gradient-to-r from-primary to-cyan text-primary-foreground",
                  "hover:shadow-glow-lg transition-all duration-200",
                  "hover:brightness-110 active:scale-[0.97]",
                  "focus-ring"
                )}
                animate={
                  isComplete && !reducedMotion
                    ? {
                        boxShadow: [
                          "0 0 0px hsl(263 84% 58% / 0)",
                          "0 0 28px hsl(263 84% 58% / 0.45)",
                          "0 0 0px hsl(263 84% 58% / 0)",
                        ],
                      }
                    : undefined
                }
                transition={
                  isComplete
                    ? { duration: 2, repeat: Infinity, ease: "easeInOut" }
                    : undefined
                }
              >
                Try Demo
              </motion.a>
              <a
                href="#how-it-works"
                className={cn(
                  "inline-flex items-center justify-center gap-2 rounded-lg px-6 py-3 text-sm font-medium",
                  "border border-white/[0.08] text-muted-foreground",
                  "hover:text-foreground hover:border-primary/40 hover:shadow-glow-sm transition-all duration-200",
                  "active:scale-[0.97]",
                  "focus-ring"
                )}
              >
                See How It Works
                <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>

            <motion.div
              initial={reducedMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: HERO_ENTRANCE.helper }}
              className="space-y-3"
            >
              <AnimatePresence mode="wait">
                {isComplete ? null : demoPhase === "playing" ? null : (
                  <motion.p
                    key={demoPhase}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm text-muted-foreground/80"
                  >
                    {demoPhase === "done"
                      ? "Your turn \u2014 click to toss the rest"
                      : "Click a spam item to toss it away."}
                    </motion.p>
                )}
              </AnimatePresence>
              <div className="mx-auto max-w-xl rounded-xl border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-left lg:mx-0">
                <p className="text-xs leading-6 text-amber-100/90">
                  Gmail access is currently limited to approved test users. To
                  experience the full website and Gmail workflow, email{" "}
                  <a
                    href="mailto:tavish.chawla.13@gmail.com"
                    className="font-medium text-amber-200 underline decoration-amber-300/40 underline-offset-2 hover:text-white"
                  >
                    tavish.chawla.13@gmail.com
                  </a>{" "}
                  so you can be added.
                </p>
              </div>
            </motion.div>
          </div>

          {/* Right: 3D Scene */}
          <motion.div
            className="relative"
            initial={reducedMotion ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: HERO_ENTRANCE.scene }}
          >
            <SpamHeroScene />

            <div className="mt-4 flex flex-col items-center lg:items-start gap-3">
              <HeroStatus />
              <AccessibleControls />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
