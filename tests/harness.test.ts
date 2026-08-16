import { describe, it, expect } from "vitest";
import {
  buildPythonWrapper,
  buildJsWrapper,
  parseHarnessOutput,
  outcomeErrorText,
  type TestCase,
} from "@/server/coding/harness";

const cases: TestCase[] = [
  { args: [1, 2], expected: 3 },
  { args: [5, 5], expected: 10 },
];

describe("parseHarnessOutput", () => {
  it("parses a valid result marker", () => {
    const stdout = 'printed junk\n__RESULTS__[{"ok":true,"got":3,"expected":3},{"ok":false,"got":9,"expected":10}]';
    const { parsed, markerFound } = parseHarnessOutput(stdout);
    expect(markerFound).toBe(true);
    expect(parsed).toEqual([
      { ok: true, got: 3, expected: 3 },
      { ok: false, got: 9, expected: 10 },
    ]);
  });

  it("reports marker missing", () => {
    const { parsed, markerFound } = parseHarnessOutput("no marker here");
    expect(markerFound).toBe(false);
    expect(parsed).toBeNull();
  });

  it("returns null parsed when marker content is invalid JSON", () => {
    const { parsed, markerFound } = parseHarnessOutput("__RESULTS__not-json");
    expect(markerFound).toBe(true);
    expect(parsed).toBeNull();
  });
});

describe("outcomeErrorText", () => {
  it("reports timeouts explicitly", () => {
    expect(outcomeErrorText("", "", true)).toBe("Code execution timed out.");
  });

  it("prefers stderr over stdout", () => {
    const text = outcomeErrorText("stdout-line", "stderr-line", false);
    expect(text).toContain("stderr-line");
  });

  it("falls back when there is no output", () => {
    expect(outcomeErrorText("", "", false)).toBe("No test output produced.");
  });

  it("caps output at 2000 characters", () => {
    const text = outcomeErrorText("x".repeat(5000), "", false);
    expect(text.length).toBeLessThanOrEqual(2000);
  });
});

describe("buildPythonWrapper", () => {
  it("embeds the user code before the harness", () => {
    const wrapper = buildPythonWrapper("def solution(a, b):\n    return a + b", cases);
    expect(wrapper.startsWith("def solution(a, b):")).toBe(true);
    expect(wrapper).toContain("__RESULTS__");
    expect(wrapper).toContain('"args"');
  });
});

describe("buildJsWrapper", () => {
  it("includes deep equality helper and user code", () => {
    const wrapper = buildJsWrapper("function solution(a, b) { return a + b; }", cases);
    expect(wrapper).toContain("__cpDeepEqual");
    expect(wrapper).toContain("function solution(a, b)");
    expect(wrapper).toContain("__RESULTS__");
  });

  it("awaits async solutions so promises are evaluated", () => {
    const wrapper = buildJsWrapper("async function solution(a, b) { return a + b; }", cases);
    expect(wrapper).toContain("(async () => {");
    expect(wrapper).toContain("await solution(...__cp_c.args)");
  });

  it("writes the marker synchronously and hard-exits to defeat deferred output", () => {
    const wrapper = buildJsWrapper("function solution(a, b) { return a + b; }", cases);
    expect(wrapper).toContain('fs.writeSync(1, "__RESULTS__" + __cp_out)');
    expect(wrapper).toContain("process.exit(0)");
  });
});

describe("buildPythonWrapper", () => {
  it("flushes output and hard-exits to defeat deferred output", () => {
    const wrapper = buildPythonWrapper("def solution(a, b):\n    return a + b", cases);
    expect(wrapper).toContain("sys.stdout.flush()");
    expect(wrapper).toContain("os._exit(0)");
  });
});
