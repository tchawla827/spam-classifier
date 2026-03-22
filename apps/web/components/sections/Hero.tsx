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

const SpamHeroScene = dynamic(
  () => import("../hero/SpamHeroScene"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full aspect-[4/3] lg:aspect-[3/2] bg-card/30 rounded-xl animate-pulse flex items-center justify-center">
        <span className="text-sm text-muted-foreground">Loading scene...</span>
      </div>
    ),
  }
);

const ENTRANCE_EASE: [number, number, number, number] = [0.33, 0, 0.2, 1];

export function Hero() {
  const isComplete = useHeroStore((s) => s.isComplete);
  const reducedMotion = useReducedMotion();
  const { demoPhase } = useAutoDemo(reducedMotion);

  const entrance = (delay: number) =>
    reducedMotion
      ? {}
      : {
          initial: { opacity: 0, y: 20 } as const,
          animate: { opacity: 1, y: 0 } as const,
          transition: { duration: 0.6, delay, ease: ENTRANCE_EASE },
        };

  return (
    <section
      id="main-content"
      className="relative min-h-[90vh] flex items-center pt-16"
    >
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-12 lg:py-0">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 lg:gap-12 items-center">
          {/* Left: Copy */}
          <div className="space-y-6 text-center lg:text-left">
            <motion.h1
              {...entrance(0.2)}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]"
            >
              Turn spam into{" "}
              <span className="text-primary">trash.</span>
            </motion.h1>

            <motion.p
              {...entrance(0.35)}
              className="text-lg sm:text-xl text-muted-foreground max-w-lg mx-auto lg:mx-0"
            >
              AI-powered spam detection for cleaner inboxes, safer clicks, and
              faster message triage.
            </motion.p>

            {/* CTA Stack */}
            <motion.div
              {...entrance(0.5)}
              className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
            >
              <motion.a
                href="#demo"
                className={cn(
                  "inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold",
                  "bg-primary text-primary-foreground",
                  "hover:shadow-[0_0_24px_hsl(var(--primary-glow)/0.4)] transition-all duration-200",
                  "hover:brightness-110 active:scale-[0.97]",
                  "focus-ring"
                )}
                animate={
                  isComplete && !reducedMotion
                    ? {
                        boxShadow: [
                          "0 0 0px hsl(262 83% 68% / 0)",
                          "0 0 28px hsl(262 83% 68% / 0.45)",
                          "0 0 0px hsl(262 83% 68% / 0)",
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
                  "border border-border text-muted-foreground",
                  "hover:text-foreground hover:border-primary/50 transition-all duration-200",
                  "active:scale-[0.97]",
                  "focus-ring"
                )}
              >
                See How It Works
                <ArrowRight className="h-4 w-4" />
              </a>
            </motion.div>

            <motion.div {...entrance(0.6)} className="h-6">
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
            </motion.div>
          </div>

          {/* Right: 3D Scene */}
          <div className="relative">
            <SpamHeroScene />

            <div className="mt-4 flex flex-col items-center lg:items-start gap-3">
              <HeroStatus />
              <AccessibleControls />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
