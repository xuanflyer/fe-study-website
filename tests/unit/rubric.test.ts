import { describe, it, expect } from "vitest";
import { assessLevel, WEIGHTS } from "@/server/level/rubric";

const Q = (id: string, type: string, difficulty: string, tags: string[] = []) => ({
  id,
  type,
  difficulty,
  tags,
});

describe("assessLevel", () => {
  it("returns zeros and lowest tier for empty input", () => {
    const r = assessLevel({ attempts: [], questions: [], reviewStates: [], totalTagCount: 0 });
    expect(r.totalScore).toBe(0);
    expect(r.breakdown.volume).toBe(0);
    expect(r.breakdown.accuracy).toBe(0);
    expect(r.level.ali).toBe("P5");
    expect(r.level.internal).toBe("2-1");
  });

  it("perfect history maps to top tier", () => {
    const questions = Array.from({ length: 200 }, (_, i) =>
      Q(String(i), i % 5 === 0 ? "CODING" : "SINGLE", "HARD", [`t${i % 10}`])
    );
    const attempts = questions.map((q) => ({ questionId: q.id, correct: true }));
    const reviewStates = questions.map((q) => ({ questionId: q.id, stage: 6 }));
    const r = assessLevel({ attempts, questions, reviewStates, totalTagCount: 10 });
    expect(r.totalScore).toBe(100);
    expect(r.level.ali).toBe("P7+");
    expect(r.level.internal).toBe("4-2");
  });

  it("falls back to MEDIUM*0.7 for hardRate when no HARD attempts", () => {
    const questions = [Q("a", "SINGLE", "MEDIUM"), Q("b", "SINGLE", "MEDIUM")];
    const attempts = [
      { questionId: "a", correct: true },
      { questionId: "b", correct: true },
    ];
    const r = assessLevel({ attempts, questions, reviewStates: [], totalTagCount: 1 });
    expect(r.breakdown.hardRate).toBeCloseTo(70, 5);
  });

  it("weights sum to 1", () => {
    const total = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1, 5);
  });

  it("identifies weakest two dimensions", () => {
    const questions = [Q("a", "SINGLE", "EASY", ["t"])];
    const attempts = [{ questionId: "a", correct: false }];
    const r = assessLevel({ attempts, questions, reviewStates: [], totalTagCount: 1 });
    expect(r.weakest).toHaveLength(2);
    expect(r.weakest[0].score).toBeLessThanOrEqual(r.weakest[1].score);
  });
});
