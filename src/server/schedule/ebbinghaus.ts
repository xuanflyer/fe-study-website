// Classic Ebbinghaus intervals — literal, not approximated.
// Stage 0 maps to the first interval applied to a new / freshly-failed item.
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const INTERVALS_MS = [
  20 * MIN,
  1 * HOUR,
  9 * HOUR,
  1 * DAY,
  2 * DAY,
  6 * DAY,
  31 * DAY,
] as const;

export const MAX_STAGE = INTERVALS_MS.length - 1;

export function nextStage(prev: number, correct: boolean): number {
  if (!correct) return 0;
  return Math.min(prev + 1, MAX_STAGE);
}

export function nextReviewAt(prev: number, correct: boolean, now: Date): Date {
  const stage = nextStage(prev, correct);
  return new Date(now.getTime() + INTERVALS_MS[stage]);
}
