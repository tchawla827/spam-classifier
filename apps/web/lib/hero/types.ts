export type PaperStatus =
  | "idle"
  | "hovered"
  | "selected"
  | "flying"
  | "landed"
  | "removed";

export interface SpamPaperData {
  id: string;
  label: string;
  status: PaperStatus;
  position: [number, number, number];
  color: string;
  flyStartTime?: number;
  flyStartPosition?: [number, number, number];
}

export interface HeroState {
  papers: SpamPaperData[];
  removedCount: number;
  totalPapers: number;
  binFillLevel: number;
  statusLabel: string;
  isComplete: boolean;
}

export interface HeroActions {
  hoverPaper: (id: string) => void;
  unhoverPaper: (id: string) => void;
  selectPaper: (id: string, startPosition?: [number, number, number]) => void;
  landPaper: (id: string) => void;
  removePaper: (id: string) => void;
  resetHero: () => void;
}
