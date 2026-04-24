import { describe, it, expect } from "vitest";
import { gradeChoice } from "@/server/grading/grade-choice";
import { gradeFill } from "@/server/grading/grade-fill";
import { gradePrint } from "@/server/grading/grade-print";
import { gradeQA } from "@/server/grading/grade-qa";
import { gradeCoding } from "@/server/grading/grade-coding";

describe("gradeChoice", () => {
  const p = { options: [{ id: "A", label: "" }, { id: "B", label: "" }], answer: ["A"] };
  it("correct", () => {
    expect(gradeChoice(p, ["A"], 10)).toEqual({
      correct: true,
      score: 10,
      details: { expected: ["A"], actual: ["A"] },
    });
  });
  it("wrong", () => {
    expect(gradeChoice(p, ["B"], 10).correct).toBe(false);
  });
  it("multi unordered", () => {
    const m = { options: [], answer: ["A", "B"] };
    expect(gradeChoice(m, ["B", "A"], 10).correct).toBe(true);
  });
  it("empty answer is wrong", () => {
    expect(gradeChoice(p, [], 10).correct).toBe(false);
  });
});

describe("gradeFill", () => {
  const p = { answers: ["border-box"] };
  it("matches case-insensitive by default", () => {
    expect(gradeFill(p, "Border-Box", 10).correct).toBe(true);
  });
  it("trims whitespace", () => {
    expect(gradeFill(p, "  border-box  ", 10).correct).toBe(true);
  });
  it("rejects wrong", () => {
    expect(gradeFill(p, "content-box", 10).correct).toBe(false);
  });
  it("respects caseSensitive", () => {
    expect(gradeFill({ answers: ["X"], caseSensitive: true }, "x", 10).correct).toBe(false);
  });
});

describe("gradePrint", () => {
  it("matches after trim/normalize", () => {
    expect(
      gradePrint({ language: "js", starterCode: "", expectedOutput: "1\n2\n3" }, "1\r\n2\r\n3\n", 10).correct
    ).toBe(true);
  });
  it("rejects different output", () => {
    expect(gradePrint({ language: "js", starterCode: "", expectedOutput: "a" }, "b", 10).correct).toBe(false);
  });
});

describe("gradeQA", () => {
  const p = { referenceAnswer: "", keywords: ["函数", "作用域", "变量", "词法", "返回"] };
  it("scores by keyword ratio", () => {
    const r = gradeQA(p, "闭包是函数能访问外部作用域的变量", 20);
    expect(r.score).toBe(Math.round(20 * (3 / 5)));
    expect(r.correct).toBe(false);
  });
  it("correct when ratio >= 0.7", () => {
    const r = gradeQA(p, "函数 作用域 变量 词法 返回", 20);
    expect(r.correct).toBe(true);
    expect(r.score).toBe(20);
  });
  it("zero on no keywords", () => {
    expect(gradeQA({ referenceAnswer: "", keywords: [] }, "anything", 10)).toMatchObject({
      score: 0,
      correct: false,
    });
  });
});

describe("gradeCoding", () => {
  it("partial credit", () => {
    const r = gradeCoding(
      [
        { name: "a", passed: true, expected: 1, actual: 1 },
        { name: "b", passed: false, expected: 2, actual: 3 },
      ],
      20
    );
    expect(r.score).toBe(10);
    expect(r.correct).toBe(false);
  });
  it("all pass", () => {
    const r = gradeCoding([{ name: "a", passed: true, expected: 1 }], 20);
    expect(r.correct).toBe(true);
    expect(r.score).toBe(20);
  });
  it("empty results", () => {
    const r = gradeCoding([], 20);
    expect(r.correct).toBe(false);
    expect(r.score).toBe(0);
  });
});
