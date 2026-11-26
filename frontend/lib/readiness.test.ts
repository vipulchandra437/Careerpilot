import { describe, expect, it } from "vitest";
import { computeReadiness } from "./readiness";

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
