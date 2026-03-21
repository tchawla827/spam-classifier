"use client";

import { Clock, ShieldCheck, Mail, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const benefits = [
  {
    icon: Clock,
    title: "Save Time",
    description:
      "Stop manually sorting through junk. Let the classifier handle the noise so you can focus on real messages.",
  },
  {
    icon: ShieldCheck,
    title: "Reduce Phishing Risk",
    description:
      "Catch deceptive emails before they trick you into clicking malicious links or sharing sensitive data.",
  },
  {
    icon: Mail,
    title: "Prioritize Real Messages",
    description:
      "Surface the emails that actually matter. Important conversations stay visible, spam stays buried.",
  },
  {
    icon: Sparkles,
    title: "Keep Your Workflow Clean",
    description:
      "A clutter-free inbox means fewer distractions and a smoother daily workflow from start to finish.",
  },
];

export function WhyItMatters() {
  return (
    <section aria-label="Why it matters" className="py-20 lg:py-28">
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Why It Matters
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A smarter inbox isn&apos;t just convenient &mdash; it&apos;s safer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 lg:gap-8">
          {benefits.map((benefit, i) => (
            <motion.div
              key={benefit.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div
                className={cn(
                  "flex gap-5 p-6 rounded-xl",
                  "bg-card/80 backdrop-blur-sm border border-border",
                  "hover:border-primary/40 hover:shadow-[0_0_24px_hsl(var(--primary-glow)/0.15)] transition-all duration-300"
                )}
              >
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
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
