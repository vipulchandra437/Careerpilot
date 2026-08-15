import { describe, it, expect } from "vitest";
import {
  normalizeWeights,
  computeOverall,
  emptyCategoryScores,
  readinessBand,
  topScores,
  weakestScores,
  DEFAULT_WEIGHTS,
  type CategoryScores,
} from "@/server/scoring/score-engine";

describe("normalizeWeights", () => {
  it("defaults to DEFAULT_WEIGHTS when null", () => {
    const w = normalizeWeights(null);
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(100, 5);
    expect(w.RESUME).toBe(DEFAULT_WEIGHTS.RESUME);
  });

  it("normalizes partial weights so they sum to 100", () => {
    const w = normalizeWeights({ CODING: 50, RESUME: 50 });
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(100, 5);
  });

  it("handles zero-total weights gracefully", () => {
    const w = normalizeWeights({ CODING: 0, RESUME: 0 });
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
  });
});

describe("computeOverall", () => {
  it("returns the weighted average rounded (unspecified weights keep defaults)", () => {
    const scores: CategoryScores = { ...emptyCategoryScores(), RESUME: 100, CODING: 50 };
    const overall = computeOverall(scores, { RESUME: 50, CODING: 50 });
    // Merged weights: RESUME 50, CODING 50, rest defaults (sum 160) → each 31.25.
    // (100*31.25 + 50*31.25) / 100 ≈ 46.875 → 47
    expect(overall).toBe(47);
  });

  it("clamps to 0-100", () => {
    const scores: CategoryScores = { ...emptyCategoryScores(), RESUME: 1000 };
    expect(computeOverall(scores, { RESUME: 100 })).toBe(100);
    expect(computeOverall(emptyCategoryScores(), null)).toBe(0);
  });
});

describe("readinessBand", () => {
  it("maps scores to bands", () => {
    expect(readinessBand(90).tone).toBe("excellent");
    expect(readinessBand(85).tone).toBe("excellent");
    expect(readinessBand(70).tone).toBe("good");
    expect(readinessBand(50).tone).toBe("warning");
    expect(readinessBand(10).tone).toBe("critical");
  });
});

describe("topScores / weakestScores", () => {
  const scores: CategoryScores = {
    RESUME: 90,
    CODING: 30,
    INTERVIEW: 70,
    COMMUNICATION: 50,
    PROJECTS: 60,
    GITHUB: 40,
    LINKEDIN: 80,
    SKILL_COVERAGE: 20,
  };

  it("returns strongest categories first", () => {
    const top = topScores(scores, 3);
    expect(top.map((t) => t.score)).toEqual([90, 80, 70]);
  });

  it("returns weakest categories first", () => {
    const weak = weakestScores(scores, 3);
    expect(weak.map((w) => w.score)).toEqual([20, 30, 40]);
  });
});
