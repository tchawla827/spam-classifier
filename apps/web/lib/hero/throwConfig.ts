export const THROW_DURATION = 900; // ms
export const ARC_HEIGHT = 1.2; // world units above highest point
export const PEAK_BIAS = 0.35; // peak at 35% of trajectory (natural toss)
export const ROTATION_SPEED = 3.0; // radians/s during flight
export const SQUASH_AMOUNT = 0.15;
export const LANDED_DISPLAY_TIME = 0; // ms to show label after landing

// Trash can opening in world coords (group at y=-0.8, rim at relative y=+1.0)
export const TRASH_TARGET: [number, number, number] = [0, 0.2, 0];

/**
 * Quadratic bezier interpolation for parabolic arc.
 * Control point is at the midpoint XZ with elevated Y.
 */
export function computeArcPosition(
  start: [number, number, number],
  end: [number, number, number],
  t: number
): [number, number, number] {
  // Control point: biased toward start for natural throw arc
  const cpX = start[0] + (end[0] - start[0]) * PEAK_BIAS;
  const cpY = Math.max(start[1], end[1]) + ARC_HEIGHT;
  const cpZ = start[2] + (end[2] - start[2]) * PEAK_BIAS;

  const u = 1 - t;
  return [
    u * u * start[0] + 2 * u * t * cpX + t * t * end[0],
    u * u * start[1] + 2 * u * t * cpY + t * t * end[1],
    u * u * start[2] + 2 * u * t * cpZ + t * t * end[2],
  ];
}
