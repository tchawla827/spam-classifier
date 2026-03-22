import { create } from "zustand";
import type { SpamPaperData, HeroState, HeroActions } from "./types";
import { generateRandomPapers } from "./paperConfig";

function computeDerived(papers: SpamPaperData[]) {
  const total = papers.length;
  const removed = papers.filter((p) => p.status === "removed").length;
  const isComplete = removed === total;
  return {
    removedCount: removed,
    totalPapers: total,
    binFillLevel: total > 0 ? removed / total : 0,
    isComplete,
    statusLabel: isComplete
      ? "Inbox cleared"
      : `${removed}/${total} Spam cleared`,
  };
}

const initialPapers = generateRandomPapers(5);

export const useHeroStore = create<HeroState & HeroActions>()((set) => ({
  papers: initialPapers.map((p) => ({ ...p })),
  ...computeDerived(initialPapers),

  hoverPaper: (id) =>
    set((state) => {
      const papers = state.papers.map((p) =>
        p.id === id && p.status === "idle" ? { ...p, status: "hovered" as const } : p
      );
      return { papers };
    }),

  unhoverPaper: (id) =>
    set((state) => {
      const papers = state.papers.map((p) =>
        p.id === id && p.status === "hovered" ? { ...p, status: "idle" as const } : p
      );
      return { papers };
    }),

  selectPaper: (id, startPosition) =>
    set((state) => {
      const papers = state.papers.map((p) =>
        p.id === id && (p.status === "idle" || p.status === "hovered")
          ? {
              ...p,
              status: "flying" as const,
              flyStartTime: performance.now(),
              flyStartPosition: startPosition ?? p.position,
            }
          : p
      );
      return { papers };
    }),

  landPaper: (id) =>
    set((state) => {
      const papers = state.papers.map((p) =>
        p.id === id && p.status === "flying"
          ? { ...p, status: "landed" as const }
          : p
      );
      return { papers };
    }),

  removePaper: (id) =>
    set((state) => {
      const papers = state.papers.map((p) =>
        p.id === id ? { ...p, status: "removed" as const } : p
      );
      return { papers, ...computeDerived(papers) };
    }),

  resetHero: () =>
    set(() => {
      const papers = generateRandomPapers(5).map((p) => ({ ...p }));
      return { papers, ...computeDerived(papers) };
    }),
}));
