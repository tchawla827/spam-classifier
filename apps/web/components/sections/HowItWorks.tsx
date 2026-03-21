"use client";

import { Search, Brain, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getRevealProps, REVEAL_STAGGER } from "@/lib/motion";

const steps = [
  {
    icon: Search,
    title: "Detect",
    description:
      "Scan messages for suspicious patterns, phishing signals, and known spam indicators.",
  },
  {
    icon: Brain,
    title: "Classify",
    description:
      "An ensemble of ML models analyzes each message and assigns a spam probability score.",
  },
  {
    icon: Zap,
    title: "Filter",
    description:
      "Instantly separate spam from legitimate messages so you only see what matters.",
  },
];

export function HowItWorks() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="how-it-works"
      aria-label="How it works"
      className="py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <motion.div
          {...getRevealProps(0, reducedMotion)}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps between you and a cleaner inbox.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              {...getRevealProps(REVEAL_STAGGER * (i + 1), reducedMotion)}
            >
              <div
                className={cn(
                  "relative flex flex-col items-center text-center p-8 rounded-xl",
                  "bg-card/80 backdrop-blur-sm border border-border",
                  "hover:border-primary/40 hover:shadow-[0_0_24px_hsl(var(--primary-glow)/0.15)] transition-all duration-300"
                )}
              >
                <div className="flex items-center justify-center h-14 w-14 rounded-lg bg-primary/10 text-primary mb-5">
                  <step.icon className="h-7 w-7" />
                </div>

                <span className="absolute top-4 right-4 text-xs font-mono text-muted-foreground/40">
                  {String(i + 1).padStart(2, "0")}
                </span>

                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
