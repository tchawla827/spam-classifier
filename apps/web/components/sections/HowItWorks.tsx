"use client";

import { Search, Brain, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { getRevealProps, getScaleRevealProps } from "../../lib/motion";
import { GlassCard } from "../ui/GlassCard";

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
          className="text-center mb-16"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Three simple steps between you and a cleaner inbox.
          </p>
        </motion.div>

        {/* Centered vertical timeline */}
        <div className="relative max-w-xl mx-auto">
          {/* Vertical connector line */}
          <motion.div
            className="absolute left-5 md:left-1/2 top-0 bottom-0 w-[2px] md:-translate-x-1/2"
            initial={reducedMotion ? undefined : { scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1.0] }}
            style={{ transformOrigin: "top", background: "linear-gradient(to bottom, hsl(var(--primary)), hsl(var(--accent-cyan)))" }}
          />

          <div className="relative space-y-10">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                {...getScaleRevealProps(0.2 * i, reducedMotion)}
                className="relative flex items-start gap-6 md:flex-col md:items-center md:text-center"
              >
                {/* Node */}
                <div className="relative z-10 flex-shrink-0">
                  <div className="flex items-center justify-center h-3 w-3 rounded-full bg-primary shadow-glow-sm" />
                </div>

                {/* Card */}
                <GlassCard hoverGlow className="p-5 flex-1 md:w-full">
                  <div className="flex items-start gap-4 md:flex-col md:items-center">
                    <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary">
                      <step.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-foreground mb-2">
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
    </section>
  );
}
