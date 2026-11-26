import { describe, expect, it } from "vitest";
import { computeDashboardReadiness, computeReadiness } from "./readiness";

describe("computeReadiness", () => {
  it("weights the interview at 60% and the resume at 40%", () => {
    const result = computeReadiness({ interviewScore: 8, resumeScore: 70 });
    expect(result.score).toBe(76);
    expect(result.interviewComponent).toBe(48);
    expect(result.resumeComponent).toBe(28);
    expect(result.coverage).toBe("both");
    expect(result.interviewWeight).toBe(0.6);
    expect(result.resumeWeight).toBe(0.4);
  });

  it("uses only the interview when no resume score exists", () => {
    const result = computeReadiness({ interviewScore: 8 });
    expect(result.score).toBe(80);
    expect(result.interviewComponent).toBe(80);
    expect(result.resumeComponent).toBe(0);
    expect(result.coverage).toBe("interview");
  });

  it("uses only the resume when no interview is complete", () => {
    const result = computeReadiness({ resumeScore: 70 });
    expect(result.score).toBe(70);
    expect(result.coverage).toBe("resume");
  });

  it("returns zero with neither component", () => {
    expect(computeReadiness({}).coverage).toBe("none");
    expect(computeReadiness({}).score).toBe(0);
  });

  it("clamps out-of-range scores", () => {
    expect(computeReadiness({ interviewScore: 12 }).score).toBe(100);
    expect(computeReadiness({ resumeScore: 200 }).score).toBe(100);
  });
});

describe("computeDashboardReadiness", () => {
  it("returns zero when both groups are missing", () => {
    expect(computeDashboardReadiness({})).toBe(0);
    expect(computeDashboardReadiness({ resumeScore: 0, interviewScore: 0 })).toBe(0);
  });

  it("weights interview 60% and resume 40% on 0-100 scores", () => {
    expect(computeDashboardReadiness({ resumeScore: 70, interviewScore: 80 })).toBe(76);
    expect(computeDashboardReadiness({ resumeScore: 35, interviewScore: 90 })).toBe(68);
  });

  it("treats a missing group as zero", () => {
    expect(computeDashboardReadiness({ resumeScore: 70 })).toBe(28);
    expect(computeDashboardReadiness({ interviewScore: 80 })).toBe(48);
  });

  it("clamps scores to 0-100", () => {
    expect(computeDashboardReadiness({ resumeScore: 200, interviewScore: -5 })).toBe(40);
  });
});
