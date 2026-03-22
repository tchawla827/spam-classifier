"use client";

import { Database, Target, Timer, Layers } from "lucide-react";
import { motion } from "framer-motion";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { getScaleRevealProps, getRevealProps } from "../../lib/motion";
import { GlassCard } from "../ui/GlassCard";
import { CountUp } from "../ui/CountUp";

const metrics = [
  {
    icon: Database,
    end: 50000,
    prefix: "",
    suffix: "+",
    decimals: 0,
    label: "Emails Analyzed",
  },
  {
    icon: Target,
    end: 97.8,
    prefix: "",
    suffix: "%",
    decimals: 1,
    label: "Precision Score",
  },
  {
    icon: Timer,
    end: 100,
    prefix: "<",
    suffix: "ms",
    decimals: 0,
    label: "Inference Time",
  },
  {
    icon: Layers,
    end: 4,
    prefix: "",
    suffix: "",
    decimals: 0,
    label: "Signal Categories",
  },
];

export function MetricsStrip() {
  const reducedMotion = useReducedMotion();

  return (
    <section
      id="metrics"
      aria-label="Key metrics"
      className="py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <motion.div
          {...getRevealProps(0, reducedMotion)}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Built for Accuracy
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Trained on real-world data with production-grade performance.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-0">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              {...getScaleRevealProps(0.08 * (i + 1), reducedMotion)}
              className="relative"
            >
              {/* Vertical divider on desktop */}
              {i > 0 && (
                <div className="hidden lg:block absolute left-0 top-1/4 bottom-1/4 w-[1px] bg-white/[0.06]" />
              )}
              <GlassCard
                hoverGlow
                className="flex flex-col items-center text-center p-6 lg:rounded-none lg:border-x-0 lg:first:rounded-l-xl lg:last:rounded-r-xl"
              >
                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 text-primary mb-4">
                  <metric.icon className="h-5 w-5" />
                </div>
                <CountUp
                  end={metric.end}
                  prefix={metric.prefix}
                  suffix={metric.suffix}
                  decimals={metric.decimals}
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
    </section>
  );
}
