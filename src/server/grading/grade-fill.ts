import type { FillPayload, GradeResult } from "@/lib/types";

export function gradeFill(
  payload: FillPayload,
  userAnswer: string,
  fullScore: number
): GradeResult {
  const user = (userAnswer ?? "").trim();
  const ok = payload.answers.some((a) =>
    payload.caseSensitive ? a === user : a.toLowerCase() === user.toLowerCase()
  );
  return {
    correct: ok,
    score: ok ? fullScore : 0,
    details: { expected: payload.answers, actual: user },
  };
}
