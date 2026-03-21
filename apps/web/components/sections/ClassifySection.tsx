"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { getRevealProps } from "@/lib/motion";
import { ClassifyForm } from "@/components/classify/ClassifyForm";
import { VerdictCard } from "@/components/classify/VerdictCard";
import type { ClassifyResponse } from "@/lib/api/classify";

export function ClassifySection() {
  const reducedMotion = useReducedMotion();
  const [result, setResult] = useState<ClassifyResponse | null>(null);

  return (
    <section
      id="demo"
      aria-label="Classify an email"
      className="py-20 lg:py-28"
    >
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8">
        <motion.div
          {...getRevealProps(0, reducedMotion)}
          className="text-center mb-14"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Try It Yourself
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Paste an email below and get an instant spam verdict — no signup required.
          </p>
        </motion.div>

        <motion.div
          {...getRevealProps(0.1, reducedMotion)}
          className={cn(
            "mx-auto max-w-4xl grid gap-8",
            result ? "lg:grid-cols-2" : "lg:grid-cols-1 max-w-xl"
          )}
        >
          <div
            className={cn(
              "rounded-xl border border-border bg-card/80 backdrop-blur-sm p-6",
              "shadow-[0_0_40px_hsl(var(--primary-glow)/0.06)]"
            )}
          >
            <ClassifyForm onResult={setResult} />
          </div>

          {result && <VerdictCard result={result} />}
        </motion.div>
      </div>
    </section>
  );
}
