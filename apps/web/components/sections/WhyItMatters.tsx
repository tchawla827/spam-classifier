"use client";

import { Clock, ShieldCheck, Mail, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { getScaleRevealProps, getRevealProps } from "../../lib/motion";
import { GlassCard } from "../ui/GlassCard";

const benefits = [
  {
    icon: Clock,
    title: "Save Time",
    description:
      "Stop manually sorting through junk. Let the classifier handle the noise so you can focus on real messages.",
    featured: true,
  },
  {
    icon: ShieldCheck,
    title: "Reduce Phishing Risk",
    description:
      "Catch deceptive emails before they trick you into clicking malicious links or sharing sensitive data.",
    featured: false,
  },
  {
    icon: Mail,
    title: "Prioritize Real Messages",
    description:
      "Surface the emails that actually matter. Important conversations stay visible, spam stays buried.",
    featured: false,
  },
  {
    icon: Sparkles,
    title: "Keep Your Workflow Clean",
    description:
      "A clutter-free inbox means fewer distractions and a smoother daily workflow from start to finish.",
    featured: false,
  },
];

export function WhyItMatters() {
  const reducedMotion = useReducedMotion();

  return (
    <section aria-label="Why it matters" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <motion.div
          {...getRevealProps(0, reducedMotion)}
          className="text-center mb-14"
        >
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
            Why It Matters
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A smarter inbox isn&apos;t just convenient &mdash; it&apos;s safer.
          </p>
        </motion.div>

        {/* Bento grid: featured left, two stacked right, full-width bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5">
          {/* Featured card — spans full left column height */}
          <motion.div
            {...getScaleRevealProps(0.08, reducedMotion)}
            className="lg:row-span-2"
          >
            <GlassCard
              hoverGlow
              className={cn(
                "h-full p-8 flex flex-col justify-center",
                "bg-gradient-to-br from-surface-1/80 to-surface-2/40"
              )}
            >
              <div className="flex items-center justify-center h-14 w-14 rounded-xl bg-cyan/10 text-cyan mb-5">
                <Clock className="h-7 w-7" />
              </div>
              <h3 className="text-2xl font-display font-bold text-foreground mb-3">
                {benefits[0].title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {benefits[0].description}
              </p>
              {/* Mini stat */}
              <div className="mt-6 pt-5 border-t border-white/[0.06]">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-mono font-bold text-primary">
                    73%
                  </span>
                  <span className="text-sm text-muted-foreground">
                    less time on email triage
                  </span>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Top-right card */}
          <motion.div {...getScaleRevealProps(0.16, reducedMotion)}>
            <BenefitCard benefit={benefits[1]} />
          </motion.div>

          {/* Bottom-right card */}
          <motion.div {...getScaleRevealProps(0.24, reducedMotion)}>
            <BenefitCard benefit={benefits[2]} />
          </motion.div>

          {/* Full-width bottom card */}
          <motion.div
            {...getScaleRevealProps(0.32, reducedMotion)}
            className="lg:col-span-2"
          >
            <GlassCard hoverGlow className="p-6">
              <div className="flex gap-5 items-start">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {benefits[3].title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {benefits[3].description}
                  </p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function BenefitCard({ benefit }: { benefit: (typeof benefits)[number] }) {
  return (
    <GlassCard hoverGlow className="p-6 h-full">
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 text-primary">
          <benefit.icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {benefit.title}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {benefit.description}
          </p>
        </div>
      </div>
    </GlassCard>
  );
}
