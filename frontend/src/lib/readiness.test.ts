import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildFeatureScores,
  computeReadiness,
  lowestContributor,
  computeTargetCompaniesScore,
  FEATURE_WEIGHTS,
  STRONG_THRESHOLD,
  type FeatureKey,
  type FeatureScore,
} from "./readiness.ts";

/** Convenience: build the 5-feature input with any subset filled in, the rest null. */
function scoresFor(
  partial: Partial<Record<FeatureKey, number | null>>,
): FeatureScore[] {
  return buildFeatureScores({
    resume: partial.resume ?? null,
    mock_interview: partial.mock_interview ?? null,
    coding_test: partial.coding_test ?? null,
    roadmap: partial.roadmap ?? null,
    target_companies: partial.target_companies ?? null,
  });
}

const WEIGHTS_SUM = Object.values(FEATURE_WEIGHTS).reduce((a, b) => a + b, 0);

describe("computeReadiness — all-null baseline", () => {
  it("overall is 0, every contribution is 0, every feature is not_started", () => {
    const res = computeReadiness(scoresFor({}));

    assert.equal(res.overall, 0);
    assert.equal(res.breakdown.length, 5);
    for (const b of res.breakdown) {
      assert.equal(b.score, null);
      assert.equal(b.contribution, 0);
      assert.equal(b.status, "not_started");
    }
  });

  it("weights total exactly 100 so an all-100 headline can't overshoot", () => {
    assert.equal(WEIGHTS_SUM, 100);
  });
});

describe("computeReadiness — all-100", () => {
  it("headline is 100 and each contribution equals its weight", () => {
    const res = computeReadiness(
      scoresFor({
        resume: 100,
        mock_interview: 100,
        coding_test: 100,
        roadmap: 100,
        target_companies: 100,
      }),
    );

    assert.equal(res.overall, 100);
    for (const b of res.breakdown) {
      assert.equal(b.score, 100);
      assert.equal(b.contribution, FEATURE_WEIGHTS[b.key]);
      assert.equal(b.status, "strong");
    }
  });
});

describe("computeReadiness — mixed", () => {
  it("blends partial scores and treats null as 0 contribution", () => {
    // 30/30/20/15/5 weights, contributions: 30 + 24 + 12 + 6 + 0 = 72
    const res = computeReadiness(
      scoresFor({
        resume: 100, // 30
        mock_interview: 80, // round(30*80/100) = 24
        coding_test: 60, // round(20*60/100) = 12
        roadmap: 40, // round(15*40/100) = 6
        target_companies: null, // 0
      }),
    );

    assert.equal(res.overall, 72);

    const byKey = Object.fromEntries(res.breakdown.map((b) => [b.key, b]));
    assert.equal(byKey.resume.contribution, 30);
    assert.equal(byKey.mock_interview.contribution, 24);
    assert.equal(byKey.coding_test.contribution, 12);
    assert.equal(byKey.roadmap.contribution, 6);
    assert.equal(byKey.target_companies.contribution, 0);

    assert.equal(byKey.resume.status, "strong");
    assert.equal(byKey.mock_interview.status, "strong");
    assert.equal(byKey.coding_test.status, "weak");
    assert.equal(byKey.roadmap.status, "weak");
    assert.equal(byKey.target_companies.status, "not_started");
  });
});

describe("computeReadiness — status thresholds", () => {
  it("null score is not_started; exactly STRONG_THRESHOLD is strong; below is weak", () => {
    const notStarted = computeReadiness(scoresFor({}));
    assert.equal(notStarted.breakdown[0].score, null);
    assert.equal(notStarted.breakdown[0].status, "not_started");

    const strong = computeReadiness(scoresFor({ resume: STRONG_THRESHOLD }));
    assert.equal(strong.breakdown[0].score, STRONG_THRESHOLD);
    assert.equal(strong.breakdown[0].status, "strong");

    const weak = computeReadiness(scoresFor({ resume: STRONG_THRESHOLD - 1 }));
    assert.equal(weak.breakdown[0].score, STRONG_THRESHOLD - 1);
    assert.equal(weak.breakdown[0].status, "weak");
  });
});

describe("lowestContributor — not_started suppression", () => {
  it("ignores not_started features unless every feature is not_started", () => {
    // resume is null → not_started (0 contribution) and must be skipped.
    // Among the scored features, coding_test (2 pts) is the strict minimum,
    // below target_companies (5 pts), so focus points there — not at resume.
    const res = computeReadiness(
      scoresFor({
        resume: null,
        mock_interview: 100, // 30 pts
        coding_test: 10, // 2 pts  ← lowest scored contributor
        roadmap: 100, // 15 pts
        target_companies: 100, // 5 pts
      }),
    );
    const lowest = lowestContributor(res.breakdown);
    assert.equal(lowest.key, "coding_test");
    assert.equal(lowest.status, "weak");
  });

  it("falls back to the first feature (resume) when every feature is not_started", () => {
    const res = computeReadiness(scoresFor({}));
    const lowest = lowestContributor(res.breakdown);
    assert.equal(lowest.key, "resume");
    assert.equal(lowest.status, "not_started");
  });
});

describe("computeTargetCompaniesScore", () => {
  it("returns null for 0 active companies", () => {
    assert.equal(computeTargetCompaniesScore(0), null);
  });

  it("returns 50 for exactly 1 active company", () => {
    assert.equal(computeTargetCompaniesScore(1), 50);
  });

  it("returns 100 for 2 or more active companies", () => {
    assert.equal(computeTargetCompaniesScore(2), 100);
    assert.equal(computeTargetCompaniesScore(5), 100);
  });

  it("treats negative counts as 0", () => {
    assert.equal(computeTargetCompaniesScore(-1), null);
  });
});

describe("computeReadiness — rounding", () => {
  it("rounds contributions to the nearest integer (not floors)", () => {
    const res = computeReadiness([{ key: "resume", score: 66, weight: 15 }]);
    // 66 * 15 / 100 = 9.9 → 10
    assert.equal(res.breakdown[0].contribution, 10);
    assert.equal(res.overall, 10);
  });
});

describe("computeReadiness — cap at 100", () => {
  it("caps overall at 100 even when rounding could overshoot", () => {
    // Two features each weighted 60 (Σ=120) at 100/100 → 120 contribution → cap.
    const res = computeReadiness([
      { key: "resume", score: 100, weight: 60 },
      { key: "mock_interview", score: 100, weight: 60 },
    ]);
    assert.equal(res.overall, 100);
  });
});

describe("computeReadiness — clamping", () => {
  it("clamps scores outside 0–100 before weighting", () => {
    const clampedHigh = computeReadiness([{ key: "resume", score: 150, weight: 30 }]);
    assert.equal(clampedHigh.breakdown[0].score, 100);
    assert.equal(clampedHigh.overall, 30);

    const clampedLow = computeReadiness([{ key: "resume", score: -5, weight: 30 }]);
    assert.equal(clampedLow.breakdown[0].score, 0);
    assert.equal(clampedLow.overall, 0);
  });
});
