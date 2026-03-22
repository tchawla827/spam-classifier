"use client";

import { useEffect, useRef, useState } from "react";
import { useHeroStore } from "../lib/hero/heroState";
import { THROW_DURATION, LANDED_DISPLAY_TIME } from "../lib/hero/throwConfig";

export type DemoPhase = "idle" | "playing" | "done";

const INITIAL_DELAY = 1200;
const TOSS_GAP = THROW_DURATION + LANDED_DISPLAY_TIME + 200;

export function useAutoDemo(reducedMotion: boolean): { demoPhase: DemoPhase } {
  const [demoPhase, setDemoPhase] = useState<DemoPhase>("idle");
  const hasRunRef = useRef(false);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (reducedMotion) {
      setDemoPhase("done");
      return;
    }

    if (hasRunRef.current) return;
    hasRunRef.current = true;

    const schedule = (fn: () => void, delay: number) => {
      const id = setTimeout(fn, delay);
      timeoutRefs.current.push(id);
      return id;
    };

    const getIdlePaperIds = () =>
      useHeroStore.getState().papers
        .filter((p) => p.status === "idle")
        .map((p) => p.id);

    const selectPaper = () => useHeroStore.getState().selectPaper;

    // T+1200ms: toss first paper
    schedule(() => {
      setDemoPhase("playing");
      const ids = getIdlePaperIds();
      if (ids[0]) selectPaper()(ids[0]);
    }, INITIAL_DELAY);

    // T+2700ms: toss second paper
    schedule(() => {
      const ids = getIdlePaperIds();
      if (ids[0]) selectPaper()(ids[0]);
    }, INITIAL_DELAY + TOSS_GAP);

    // T+4200ms: demo complete
    schedule(() => {
      setDemoPhase("done");
    }, INITIAL_DELAY + TOSS_GAP * 2);

    return () => {
      timeoutRefs.current.forEach(clearTimeout);
      timeoutRefs.current = [];
    };
  }, [reducedMotion]);

  return { demoPhase };
}
