import { describe, it, expect } from "vitest";
import { nextStage, nextReviewAt, INTERVALS_MS, MAX_STAGE } from "@/server/schedule/ebbinghaus";

describe("ebbinghaus", () => {
  it("advances on correct", () => {
    expect(nextStage(0, true)).toBe(1);
    expect(nextStage(3, true)).toBe(4);
  });
  it("resets to 0 on wrong", () => {
    expect(nextStage(5, false)).toBe(0);
    expect(nextStage(0, false)).toBe(0);
  });
  it("caps at MAX_STAGE", () => {
    expect(nextStage(MAX_STAGE, true)).toBe(MAX_STAGE);
  });
  it("next review uses interval[nextStage]", () => {
    const now = new Date("2025-01-01T00:00:00Z");
    const r = nextReviewAt(0, true, now);
    expect(r.getTime() - now.getTime()).toBe(INTERVALS_MS[1]);
    const w = nextReviewAt(4, false, now);
    expect(w.getTime() - now.getTime()).toBe(INTERVALS_MS[0]);
  });
});
