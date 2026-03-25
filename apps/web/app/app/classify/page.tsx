"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { cn } from "../../../lib/utils";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { refetchDashboardStats } from "../../../hooks/useDashboardStats";
import { invalidateInsightsCache } from "../../../lib/api/insights";
import { ClassifyForm } from "../../../components/classify/ClassifyForm";
import { VerdictCard } from "../../../components/classify/VerdictCard";
import { FeedbackControls } from "../../../components/classify/FeedbackControls";
import type { ClassifyResponse } from "../../../lib/api/classify";

export default function ClassifyPage() {
  const reducedMotion = useReducedMotion();
  const [result, setResult] = useState<ClassifyResponse | null>(null);

  const handleResult = useCallback(
    (res: ClassifyResponse, _subject: string, _body: string) => {
      setResult(res);
      // Refetch dashboard stats to update counts
      invalidateInsightsCache();
      refetchDashboardStats();
    },
    []
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }}
        className="space-y-1"
      >
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <span className="text-xs font-mono text-primary/80 uppercase tracking-widest">
            Classify
          </span>
        </div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Email Classifier
        </h1>
        <p className="text-sm text-muted-foreground">
          Paste a subject and body to get an instant spam verdict.
        </p>
      </motion.div>

      {/* Classifier */}
      <motion.div
        initial={reducedMotion ? undefined : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className={cn(
          "grid gap-8",
          result ? "lg:grid-cols-2" : "lg:grid-cols-1 max-w-xl"
        )}
      >
        <div className="glass rounded-xl p-6 shadow-glow-sm">
          <ClassifyForm onResult={handleResult} />
        </div>

        {result && (
          <div className="space-y-4">
            <VerdictCard result={result} />
            {result.history_id && (
              <div className="glass rounded-xl p-4">
                <FeedbackControls
                  historyId={result.history_id}
                  predictedLabel={result.final_prediction}
                />
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
