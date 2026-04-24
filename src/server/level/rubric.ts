// Level assessment v1 — maps attempt history to Ali P / Tencent T / Baidu T /
// internal 2-1~4-2 via a 6-dimension weighted score. Thresholds are constants
// so they are easy to tune later without touching call sites.

export interface AttemptInput {
  questionId: string;
  correct: boolean;
}

export interface QuestionInput {
  id: string;
  type: string;       // SINGLE | MULTI | FILL | CODING | PRINT | QA
  difficulty: string; // EASY | MEDIUM | HARD
  tags: string[];
}

export interface ReviewStateInput {
  questionId: string;
  stage: number;
}

export interface LevelInput {
  attempts: AttemptInput[];
  questions: QuestionInput[];
  reviewStates: ReviewStateInput[];
  totalTagCount: number; // distinct tags across entire question bank
}

export interface Breakdown {
  volume: number;
  accuracy: number;
  hardRate: number;
  coverage: number;
  retention: number;
  codingDepth: number;
}

export interface Levels {
  ali: string;
  tencent: string;
  baidu: string;
  internal: string;
}

export interface LevelResult {
  totalScore: number;
  breakdown: Breakdown;
  level: Levels;
  weakest: Array<{ key: keyof Breakdown; score: number; advice: string }>;
}

export const WEIGHTS: Record<keyof Breakdown, number> = {
  volume: 0.15,
  accuracy: 0.25,
  hardRate: 0.25,
  coverage: 0.15,
  retention: 0.10,
  codingDepth: 0.10,
};

const VOLUME_FULL = 200;

const LEVEL_TIERS: Array<{ min: number; level: Levels }> = [
  { min: 95, level: { ali: "P7+", tencent: "T3.3", baidu: "T6", internal: "4-2" } },
  { min: 85, level: { ali: "P7", tencent: "T3.2", baidu: "T5+", internal: "4-1" } },
  { min: 70, level: { ali: "P6+", tencent: "T3.1", baidu: "T5", internal: "3-2" } },
  { min: 50, level: { ali: "P6", tencent: "T2.3", baidu: "T4+", internal: "3-1" } },
  { min: 30, level: { ali: "P5+", tencent: "T2.2", baidu: "T4", internal: "2-2" } },
  { min: 0, level: { ali: "P5", tencent: "T2.1", baidu: "T3", internal: "2-1" } },
];

const ADVICE: Record<keyof Breakdown, string> = {
  volume: "做题总量偏少，建议每天固定时间刷 5-10 题以积累手感。",
  accuracy: "整体正确率偏低，建议复盘错题并重刷相同标签下的同类题。",
  hardRate: "HARD 题通过率偏低，建议按标签挑选一批 HARD 题集中突破。",
  coverage: "涉及标签较少，建议拓宽题型，尝试不常见的分类。",
  retention: "复习记忆阶段偏低，建议按计划 /plan 按时回顾过期题目。",
  codingDepth: "CODING / PRINT 题型通过率偏低，建议加练代码题与输出推理。",
};

function clamp100(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(100, x));
}

export function assessLevel(input: LevelInput): LevelResult {
  const { attempts, questions, reviewStates, totalTagCount } = input;
  const qById = new Map(questions.map((q) => [q.id, q]));

  const total = attempts.length;
  const correct = attempts.filter((a) => a.correct).length;

  // volume: linear to VOLUME_FULL
  const volume = clamp100((total / VOLUME_FULL) * 100);

  // accuracy
  const accuracy = total ? clamp100((correct / total) * 100) : 0;

  // hardRate: HARD accuracy; if no HARD attempts, fall back to MEDIUM * 0.7
  const hardAttempts = attempts.filter((a) => qById.get(a.questionId)?.difficulty === "HARD");
  let hardRate: number;
  if (hardAttempts.length > 0) {
    hardRate = clamp100((hardAttempts.filter((a) => a.correct).length / hardAttempts.length) * 100);
  } else {
    const med = attempts.filter((a) => qById.get(a.questionId)?.difficulty === "MEDIUM");
    hardRate = med.length ? clamp100((med.filter((a) => a.correct).length / med.length) * 100 * 0.7) : 0;
  }

  // coverage: unique tags touched / total tags in bank
  const touched = new Set<string>();
  for (const a of attempts) {
    const q = qById.get(a.questionId);
    if (!q) continue;
    for (const t of q.tags) touched.add(t);
  }
  const coverage = totalTagCount > 0 ? clamp100((touched.size / totalTagCount) * 100) : 0;

  // retention: average stage 0..6 → 0..100
  const retention = reviewStates.length
    ? clamp100((reviewStates.reduce((s, r) => s + r.stage, 0) / reviewStates.length / 6) * 100)
    : 0;

  // codingDepth: CODING + PRINT correct rate
  const codingAttempts = attempts.filter((a) => {
    const t = qById.get(a.questionId)?.type;
    return t === "CODING" || t === "PRINT";
  });
  const codingDepth = codingAttempts.length
    ? clamp100((codingAttempts.filter((a) => a.correct).length / codingAttempts.length) * 100)
    : 0;

  const breakdown: Breakdown = { volume, accuracy, hardRate, coverage, retention, codingDepth };

  const totalScore = clamp100(
    (Object.keys(WEIGHTS) as Array<keyof Breakdown>).reduce(
      (s, k) => s + breakdown[k] * WEIGHTS[k],
      0
    )
  );

  const level = LEVEL_TIERS.find((t) => totalScore >= t.min)!.level;

  const weakest = (Object.keys(breakdown) as Array<keyof Breakdown>)
    .map((key) => ({ key, score: breakdown[key], advice: ADVICE[key] }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 2);

  return { totalScore, breakdown, level, weakest };
}
