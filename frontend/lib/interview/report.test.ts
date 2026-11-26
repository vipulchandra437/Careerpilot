import { describe, expect, it } from "vitest";
import { analyzeAnswer } from "./analyze";
import { applyLlmReport, buildRuleReport, type SavedAnswer } from "./report";

const answers: SavedAnswer[] = [
  {
    index: 0,
    question: "Tell me about yourself.",
    text: "At my last project I reduced latency by 40 percent. I added a cache and measured the result.",
    score: 8,
    metrics: analyzeAnswer({
      text: "At my last project I reduced latency by 40 percent. I added a cache and measured the result.",
      kind: "hr",
      durationSeconds: 10,
      eyeContactPercent: 90,
    }),
  },
];

describe("buildRuleReport", () => {
  it("produces a complete report without an LLM", () => {
    const report = buildRuleReport(answers);
    expect(report.generatedBy).toBe("rules");
    expect(report.verdict).toBe("Strong");
    expect(report.overallScore).toBe(8);
    expect(Object.keys(report.metrics)).toHaveLength(6);
    expect(report.answers).toHaveLength(1);
  });

  it("uses a low verdict for weak answers", () => {
    expect(buildRuleReport([{ ...answers[0], score: 2 }]).verdict).toBe("Needs practice");
  });
});

describe("applyLlmReport", () => {
  it("merges a validated LLM pass and its per-answer scores", () => {
    const report = applyLlmReport(
      {
        verdict: "Good",
        overall_score: 7,
        per_answer_score: [7],
        strengths: ["Clear example"],
        mistakes: ["No metric"],
        better_version: ["Add a number"],
        top_fixes: ["Be specific"],
      },
      answers,
      "groq"
    );
    expect(report?.generatedBy).toBe("llm:groq");
    expect(report?.answers[0].score).toBe(7);
    expect(report?.overallScore).toBe(7);
    expect(report?.metrics.eyeContact).toBe(buildRuleReport(answers).metrics.eyeContact);
  });

  it("rejects invalid LLM JSON so the caller can fall back", () => {
    expect(applyLlmReport({ verdict: "Great", overall_score: 99 }, answers, "groq")).toBeNull();
  });
});
