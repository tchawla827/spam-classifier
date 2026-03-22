"use client";

import { useState, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "../../lib/utils";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { getRevealProps } from "../../lib/motion";
import { useClassifyHistory } from "../../hooks/useClassifyHistory";
import { ClassifyForm } from "../classify/ClassifyForm";
import { VerdictCard } from "../classify/VerdictCard";
import { HistoryPanel } from "../history/HistoryPanel";
import { HistoryToggleButton } from "../history/HistoryToggleButton";
import type { ClassifyResponse, HistoryItem } from "../../lib/api/classify";

export function ClassifySection() {
  const reducedMotion = useReducedMotion();
  const [result, setResult] = useState<ClassifyResponse | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [restoredSubject, setRestoredSubject] = useState("");
  const [restoredBody, setRestoredBody] = useState("");

  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const { items, isHydrated, addItem, removeItem, clearAll } = useClassifyHistory();

  const handleResult = useCallback(
    (res: ClassifyResponse, subject: string, body: string) => {
      setResult(res);
      setActiveHistoryId(null);
      addItem(subject, body, res);
    },
    [addItem]
  );

  const handleSelectHistory = useCallback((item: HistoryItem) => {
    setRestoredSubject(item.subject);
    setRestoredBody(item.body);
    setResult(item.result);
    setActiveHistoryId(item.id);
    setIsPanelOpen(false);
    document.getElementById("demo")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <>
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
            <div className="flex items-center justify-center gap-3 mb-4">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-foreground">
                Try It Yourself
              </h2>
            </div>
            <div className="flex items-center justify-center gap-3">
              <p className="text-lg text-muted-foreground max-w-2xl">
                Paste an email below and get an instant spam verdict — no signup required.
              </p>
              <HistoryToggleButton
                onClick={() => setIsPanelOpen(true)}
                count={items.length}
                isHydrated={isHydrated}
                ref={toggleButtonRef}
              />
            </div>
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
                "glass rounded-xl p-6",
                "shadow-glow-sm"
              )}
            >
              <ClassifyForm
                onResult={handleResult}
                initialSubject={restoredSubject}
                initialBody={restoredBody}
              />
            </div>

            {result && <VerdictCard result={result} />}
          </motion.div>
        </div>
      </section>

      <HistoryPanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        items={items}
        activeId={activeHistoryId}
        onSelect={handleSelectHistory}
        onDelete={removeItem}
        onClearAll={clearAll}
        toggleButtonRef={toggleButtonRef}
      />
    </>
  );
}
