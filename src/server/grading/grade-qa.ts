import type { QAPayload, GradeResult } from "@/lib/types";

export function gradeQA(
  payload: QAPayload,
  userAnswer: string,
  fullScore: number
): GradeResult {
  const text = (userAnswer ?? "").toLowerCase();
  const kws = payload.keywords ?? [];
  if (kws.length === 0) {
    return { correct: false, score: 0, details: { hits: [], total: 0 } };
  }
  const hits = kws.filter((k) => text.includes(k.toLowerCase()));
  const ratio = hits.length / kws.length;
  const score = Math.round(fullScore * ratio);
  return {
    correct: ratio >= 0.7,
    score,
    details: { hits, total: kws.length, ratio },
  };
}
