"use client";

import { Database, Target, Timer, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { getRevealProps, REVEAL_STAGGER } from "../../lib/motion";

const metrics = [
  {
    icon: Database,
    value: "50K+",
    label: "Emails Analyzed",
  },
  {
    icon: Target,
    value: "97.8%",
    label: "Precision Score",
  },
  {
    icon: Timer,
    value: "<100ms",
    label: "Inference Time",
  },
  {
    icon: Layers,
    value: "4",
    label: "Signal Categories",
  },
];

export function MetricsStrip() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="metrics"
      aria-label="Key metrics"
      className="py-20 lg:py-28 border-t border-border/50"
    >
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <motion.div
          {...getRevealProps(0, reducedMotion)}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Built for Accuracy
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Trained on real-world data with production-grade performance.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              {...getRevealProps(REVEAL_STAGGER * (i + 1), reducedMotion)}
            >
              <div
                className={cn(
                  "flex flex-col items-center text-center p-6 rounded-xl",
                  "bg-card/80 backdrop-blur-sm border border-border",
                  "hover:border-primary/40 hover:shadow-[0_0_24px_hsl(var(--primary-glow)/0.15)] transition-all duration-300"
                )}
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary mb-4">
                  <metric.icon className="h-5 w-5" />
                </div>
                <span className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">
                  {metric.value}
                </span>
                <span className="mt-1 text-sm text-muted-foreground">
                  {metric.label}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
