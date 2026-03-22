import type { SpamPaperData } from "./types";

export const SPAM_LABELS = [
  "Phishing",
  "Promo Spam",
  "Scam",
  "Fake OTP",
  "Malware Link",
  "Suspicious Invoice",
  "Lottery Scam",
  "Fake Delivery",
  "Account Alert",
  "Crypto Pump",
  "Survey Bait",
  "Impersonation",
  "SEO Spam",
  "Romance Scam",
] as const;

const PAPER_COLORS = [
  "#c4b5fd",
  "#a78bfa",
  "#8b5cf6",
  "#7c3aed",
  "#6d28d9",
  "#ddd6fe",
  "#b4a0f4",
  "#9775e6",
];

// Position bounds for random placement
const BOUNDS = {
  x: [-2.8, 2.5] as const,
  y: [0.2, 2.4] as const,
  z: [-0.5, 1.0] as const,
};

const MIN_SPACING = 1.0;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function distance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2);
}

export function generateRandomPapers(count: number): SpamPaperData[] {
  const labels = shuffle([...SPAM_LABELS]).slice(0, count);
  const colors = shuffle([...PAPER_COLORS]);
  const positions: [number, number, number][] = [];

  for (let i = 0; i < count; i++) {
    let pos: [number, number, number];
    let attempts = 0;
    do {
      pos = [
        randomInRange(BOUNDS.x[0], BOUNDS.x[1]),
        randomInRange(BOUNDS.y[0], BOUNDS.y[1]),
        randomInRange(BOUNDS.z[0], BOUNDS.z[1]),
      ];
      attempts++;
    } while (
      attempts < 50 &&
      positions.some((p) => distance(p, pos) < MIN_SPACING)
    );
    positions.push(pos);
  }

  return labels.map((label, i) => ({
    id: `paper-${i}`,
    label,
    status: "idle" as const,
    position: positions[i],
    color: colors[i % colors.length],
  }));
}
