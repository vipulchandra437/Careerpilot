import { describe, it, expect } from "vitest";
import { deterministicAnalyzeResume } from "@/server/services/resume-content";

describe("deterministicAnalyzeResume", () => {
  it("always returns finite scores within 0-100 and populated arrays", () => {
    const result = deterministicAnalyzeResume(
      "SUMMARY\nBuilt a React dashboard that improved load time by 40%.\n\nEXPERIENCE\nFrontend Developer — built APIs with Python, used SQL and Docker.",
    );
    for (const key of [
      "overallScore",
      "atsScore",
      "contentScore",
      "keywordScore",
      "companyMatchScore",
    ] as const) {
      expect(Number.isFinite(result[key])).toBe(true);
      expect(result[key]).toBeGreaterThanOrEqual(0);
      expect(result[key]).toBeLessThanOrEqual(100);
    }
    expect(result.strengths.length).toBeGreaterThan(0);
    expect(result.weaknesses.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("handles empty and garbage input without crashing", () => {
    const result = deterministicAnalyzeResume("", "Acme", "Software Engineer");
    expect(Number.isFinite(result.overallScore)).toBe(true);
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
  });

  it("rewards target-role keyword overlap", () => {
    const matching = deterministicAnalyzeResume(
      "Experience with React, TypeScript and AWS. Built REST APIs.",
      "Acme",
      "Frontend Engineer",
    );
    const generic = deterministicAnalyzeResume(
      "Did things. Did more things. Then some things.",
      "Acme",
      "Frontend Engineer",
    );
    expect(matching.overallScore).toBeGreaterThanOrEqual(generic.overallScore);
  });
});
