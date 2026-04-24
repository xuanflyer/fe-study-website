import type { ChoicePayload, GradeResult } from "@/lib/types";

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const s = new Set(a);
  for (const x of b) if (!s.has(x)) return false;
  return true;
}

export function gradeChoice(
  payload: ChoicePayload,
  userAnswer: string[],
  fullScore: number
): GradeResult {
  const correct = sameSet(payload.answer, userAnswer ?? []);
  return {
    correct,
    score: correct ? fullScore : 0,
    details: { expected: payload.answer, actual: userAnswer ?? [] },
  };
}
