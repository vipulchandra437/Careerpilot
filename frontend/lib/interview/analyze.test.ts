import { describe, expect, it } from "vitest";
import { analyzeAnswer, summarizeMetrics } from "./analyze";
import { fallbackQuestion, questionBank } from "./questions";

describe("question banks", () => {
  it("keeps HR and technical openers distinct", () => {
    expect(questionBank("hr")).toHaveLength(6);
    expect(questionBank("technical")).toHaveLength(5);
    expect(questionBank("hr")[0].text).toMatch(/tell me about yourself/i);
    expect(questionBank("technical")[1].text).toMatch(/cycle/i);
  });

  it("alternates HR and technical in five mixed questions", () => {
    const mixed = questionBank("mixed");
    expect(mixed).toHaveLength(5);
    expect(mixed.map((q) => q.kind)).toEqual(["hr", "technical", "hr", "technical", "hr"]);
    expect(fallbackQuestion("technical", 99).id).toBe("tech-5");
  });
});

describe("analyzeAnswer", () => {
  it("rewards a specific technical answer", () => {
    const metrics = analyzeAnswer({
      text: "I used a hash set to track visited nodes while walking the linked list in two passes, so the algorithm runs in O(n) time and uses O(n) memory. The trade-off is extra memory for a constant-time lookup.",
      kind: "technical",
      durationSeconds: 20,
      eyeContactPercent: 80,
    });
    expect(metrics.checks.hasTechnicalTerms).toBe(true);
    expect(metrics.checks.hasMetric).toBe(true);
    expect(metrics.checks.usesI).toBe(true);
    expect(metrics.checks.steadyPace).toBe(true);
    expect(metrics.score).toBeGreaterThan(8);
  });

  it("flags a vague HR answer", () => {
    const metrics = analyzeAnswer({
      text: "Um, we basically did a lot of things and it was, you know, fine. Actually I think we did well.",
      kind: "hr",
      durationSeconds: 20,
      eyeContactPercent: 20,
      longPauses: 3,
    });
    expect(metrics.checks.hasOutcome).toBe(false);
    expect(metrics.checks.hasMetric).toBe(false);
    expect(metrics.checks.hasSituation).toBe(false);
    expect(metrics.checks.usesI).toBe(false);
    expect(metrics.checks.goodEyeContact).toBe(false);
    expect(metrics.tips.length).toBeGreaterThan(4);
    expect(metrics.score).toBeLessThan(3);
  });

  it("counts fillers and judges speaking pace", () => {
    const slow = analyzeAnswer({
      text: "I improved latency by 30 percent. ".repeat(6),
      kind: "technical",
      durationSeconds: 120,
    });
    expect(slow.wordsPerMinute).toBeLessThan(90);
    expect(slow.checks.steadyPace).toBe(false);
    expect(slow.checks.fewFillers).toBe(true);

    const rushed = analyzeAnswer({
      text: "I improved latency by 30 percent by adding a cache. ".repeat(8),
      kind: "technical",
      durationSeconds: 10,
    });
    expect(rushed.wordsPerMinute).toBeGreaterThan(180);
    expect(rushed.checks.steadyPace).toBe(false);
  });

  it("handles an empty answer without dividing by zero", () => {
    const metrics = analyzeAnswer({ text: "", kind: "hr" });
    expect(metrics.wordCount).toBe(0);
    expect(metrics.wordsPerMinute).toBe(0);
    expect(metrics.score).toBe(0);
  });
});

describe("summarizeMetrics", () => {
  it("averages the six report dimensions", () => {
    const strong = analyzeAnswer({
      text: "At my last project I reduced page latency by 40 percent. I added a cache and measured the result.",
      kind: "hr",
      durationSeconds: 10,
      eyeContactPercent: 90,
    });
    const summary = summarizeMetrics([strong, strong]);
    expect(Object.keys(summary)).toEqual([
      "clarity",
      "structure",
      "conciseness",
      "confidence",
      "eyeContact",
      "pace",
    ]);
    expect(summary.eyeContact).toBe(10);
    expect(summary.pace).toBe(10);
    expect(summary.clarity).toBe(10);
  });

  it("returns zeroes for an empty report", () => {
    expect(summarizeMetrics([])).toEqual({
      clarity: 0,
      structure: 0,
      conciseness: 0,
      confidence: 0,
      eyeContact: 0,
      pace: 0,
    });
  });
});
