import { describe, it, expect } from "vitest";
import { shapeBatch, type CardCandidate } from "@/server/cards/selectBatch";

const mk = (id: string, type: string, difficulty = "EASY"): CardCandidate => ({ id, type, difficulty });

describe("shapeBatch", () => {
  it("returns at most `size` items", () => {
    const pool = [mk("a", "SINGLE"), mk("b", "SINGLE"), mk("c", "SINGLE")];
    expect(shapeBatch(pool, 2)).toHaveLength(2);
  });

  it("returns all items when pool < size", () => {
    const pool = [mk("a", "SINGLE"), mk("b", "MULTI")];
    expect(shapeBatch(pool, 8)).toHaveLength(2);
  });

  it("interleaves types via round-robin", () => {
    const pool = [
      mk("s1", "SINGLE"), mk("s2", "SINGLE"), mk("s3", "SINGLE"),
      mk("c1", "CODING"),
      mk("p1", "PRINT"),
    ];
    const out = shapeBatch(pool, 5).map((q) => q.type);
    // First three should not all be SINGLE
    expect(out.slice(0, 3).every((t) => t === "SINGLE")).toBe(false);
  });

  it("avoids 3 consecutive same difficulty when alternative exists", () => {
    const pool = [
      mk("a", "SINGLE", "EASY"),
      mk("b", "SINGLE", "EASY"),
      mk("c", "SINGLE", "EASY"),
      mk("d", "MULTI", "HARD"),
      mk("e", "MULTI", "HARD"),
    ];
    const out = shapeBatch(pool, 5);
    let run = 1;
    for (let i = 1; i < out.length; i++) {
      if (out[i].difficulty === out[i - 1].difficulty) run++;
      else run = 1;
      expect(run).toBeLessThanOrEqual(2);
    }
  });

  it("handles empty pool", () => {
    expect(shapeBatch([], 8)).toEqual([]);
  });
});
