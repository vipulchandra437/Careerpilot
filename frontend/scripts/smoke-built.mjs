import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const target = process.argv[2] || "http://127.0.0.1:8081/";
const tag = (process.argv[3] || "preview").replace(/[^a-z0-9-]/gi, "-");
const outDir = process.argv[4] || process.cwd();

const browser = await chromium.launch({
  headless: true,
  channel: "chrome",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const report = { target, routes: [] };
try {
  for (const [path, expect] of [
    ["/", "Career Readiness"],
    ["/coding", "Two Sum"],
    ["/mentor", "AI Mentor"],
  ]) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    const errors = { consoleErrors: [], pageErrors: [] };
    page.on("console", (m) => {
      if (m.type() === "error") errors.consoleErrors.push(m.text());
    });
    page.on("pageerror", (e) => errors.pageErrors.push(String(e?.message || e)));
    const resp = await page.goto(`${target.replace(/\/$/, "")}${path}`, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(1500);
    const text = (await page.locator("body").innerText().catch(() => "")).trim();
    const file = `built-${tag}-${path === "/" ? "home" : path.slice(1)}.png`;
    await page.screenshot({ path: `${outDir}/${file}` }).catch(() => {});
    await page.close();
    report.routes.push({
      path,
      status: resp?.status() ?? 0,
      bodyLen: text.length,
      hasExpectedCopy: text.toLowerCase().includes(expect.toLowerCase()),
      consoleErrors: errors.consoleErrors.slice(0, 3),
      pageErrors: errors.pageErrors.slice(0, 3),
      screenshot: file,
    });
    console.log(`${resp?.status()} ${path} (${text.length} chars) expected="${expect}" found=${text.toLowerCase().includes(expect.toLowerCase())}`);
  }
} finally {
  await browser.close();
}
writeFileSync(`${outDir}/built-${tag}-verdict.json`, JSON.stringify(report, null, 2));
console.log(`verdict: ${outDir}/built-${tag}-verdict.json`);
