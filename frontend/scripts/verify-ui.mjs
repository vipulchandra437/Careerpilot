#!/usr/bin/env node
/**
 * Multi-route UI verification harness for the CareerPilot frontend.
 *
 * `browser-smoke.mjs` checks exactly one URL and its output guard is pinned to
 * the Linux sandbox roots (`/workspace`, `/tmp`), so on a Windows host it exits
 * before it ever launches a browser. This script is the host-agnostic
 * equivalent: it sweeps every route at desktop AND mobile widths, asserts the
 * things a screenshot alone cannot (real copy rendered, no layout overflow, a
 * clean console), and exercises sidebar navigation.
 *
 * Usage:
 *   node scripts/verify-ui.mjs [baseUrl] [outDir]
 *
 * Defaults: http://127.0.0.1:8080 and ./screenshots. Writes one PNG per
 * route/viewport plus `ui-verdict.json`, and exits non-zero on any failure.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

/** Each route carries copy that must be on screen — a blank shell fails it. */
const ROUTES = [
  { path: "/", name: "dashboard", expect: ["Career Readiness", "Today", "Recent Activity"] },
  { path: "/interview", name: "interview", expect: ["Mock Interview", "Interview Setup", "Start Interview"] },
  { path: "/coding", name: "coding", expect: ["Two Sum", "Description", "Submit"] },
  { path: "/resume", name: "resume", expect: ["Resume Analyzer", "Resume Score", "Priority Actions"] },
  { path: "/builder", name: "builder", expect: ["Resume Builder", "Live preview"] },
  { path: "/roadmap", name: "roadmap", expect: ["Career Roadmap", "milestones complete"] },
  { path: "/mentor", name: "mentor", expect: ["AI Mentor", "Send"] },
  { path: "/companies", name: "companies", expect: ["Target Companies", "match"] },
  { path: "/profile", name: "profile", expect: ["Profile", "Target role", "Skills"] },
];

/** Every sidebar destination, in order. Desktop navigation must expose all. */
const NAV_LABELS = [
  "Dashboard",
  "Mock Interview",
  "Coding Test",
  "Resume Analyzer",
  "Resume Builder",
  "Career Roadmap",
  "AI Mentor",
  "Target Companies",
  "Profile",
];

const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "mobile", width: 390, height: 844 },
];

const baseUrl = (process.argv[2] || "http://127.0.0.1:8080").replace(/\/$/, "");
const outDir = resolve(process.argv[3] || join(process.cwd(), "screenshots"));
mkdirSync(outDir, { recursive: true });

const TIMEOUT_MS = Number(process.env.UI_VERIFY_TIMEOUT_MS || 45000);
/**
 * Coarse blank-page net. The AUTHORITATIVE content assertion is the per-route
 * `expect` copy above; this only catches a page that painted nothing at all.
 * It is deliberately low because chrome alone (the 9 sidebar labels on desktop)
 * is over 200 characters, so a higher floor would not actually detect a blank
 * desktop shell — and a legitimately compact page (mobile `/profile` hides the
 * decorative score ring with `hidden sm:block`) renders ~173 characters while
 * being completely correct.
 */
const MIN_BODY_TEXT = 100;

const failures = [];
const results = [];

function check(scope, condition, detail) {
  if (!condition) failures.push(`${scope}: ${detail}`);
  return condition;
}

/**
 * Launch Chromium, tolerating a host where Playwright's pinned browser build
 * was never downloaded. The bundled binary is preferred (it is the version the
 * harness is written against); a system Chrome/Edge install is the fallback so
 * verification does not depend on a ~150 MB download.
 */
async function launchBrowser() {
  const baseArgs = ["--no-sandbox", "--disable-dev-shm-usage"];
  const attempts = [
    { label: "bundled chromium", options: { headless: true, args: baseArgs } },
    { label: "system chrome", options: { headless: true, channel: "chrome", args: baseArgs } },
    { label: "system msedge", options: { headless: true, channel: "msedge", args: baseArgs } },
  ];
  const errors = [];
  for (const attempt of attempts) {
    try {
      const instance = await chromium.launch(attempt.options);
      console.log(`browser: ${attempt.label}`);
      return instance;
    } catch (err) {
      errors.push(`${attempt.label}: ${String(err?.message || err).split("\n")[0]}`);
    }
  }
  throw new Error(`no usable browser:\n  ${errors.join("\n  ")}`);
}

let browser = await launchBrowser();

/**
 * System Chrome wedges after roughly eight sequential pages ("Failed to open a
 * new tab"), which would cut a sweep short and look like a wall of app
 * failures. Recycle the browser on a fixed cadence and after any crash so the
 * verdict reflects the app, not the harness's browser lifetime.
 */
async function recycleBrowser() {
  try {
    await browser?.close();
  } catch {
    /* already gone */
  }
  browser = await launchBrowser();
}

/**
 * Open a tab whose console/page errors accumulate into `holder.current`. The
 * sweep replaces `holder.current` before each navigation, so every route gets a
 * clean error bucket without re-registering listeners.
 */
async function openPage(viewport, holder) {
  const page = await browser.newPage({ viewport });
  page.on("console", (msg) => {
    if (msg.type() === "error") holder.current.consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => holder.current.pageErrors.push(String(err?.message || err)));
  return page;
}

function emptyBucket() {
  return { consoleErrors: [], pageErrors: [] };
}

/** Text of Vite's dev error overlay, or "" when the app compiled cleanly. */
async function overlayText(page) {
  const overlay = page.locator("vite-error-overlay");
  if ((await overlay.count()) === 0) return "";
  const text = await overlay.first().innerText().catch(() => "");
  return text.replace(/\s+/g, " ").trim().slice(0, 500);
}

try {
  // ── Navigation: every sidebar destination is present and routable ──────────
  {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    try {
      await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
      await page.waitForTimeout(1200);
      const overlay = await overlayText(page);
      check("nav", overlay === "", `Vite error overlay is showing: ${overlay}`);
      const navText = await page.locator("nav").first().innerText().catch(() => "");
      for (const label of NAV_LABELS) {
        check("nav", navText.includes(label), `sidebar is missing link: "${label}"`);
      }
      const linkCount = await page.locator("aside nav a").count();
      check("nav", linkCount === NAV_LABELS.length, `expected ${NAV_LABELS.length} sidebar links, found ${linkCount}`);
      // Client-side routing: click "Coding Test" and expect the URL + view to
      // swap without a full page load.
      await page.locator("aside nav a", { hasText: "Coding Test" }).first().click({ timeout: 10000 });
      await page.waitForTimeout(900);
      const afterClick = page.url();
      check("nav", afterClick.endsWith("/coding"), `clicking "Coding Test" landed on ${afterClick}`);
      const codingText = await page.locator("body").innerText().catch(() => "");
      check("nav", codingText.includes("Two Sum"), "clicking a nav link did not render the Coding Test view");
      await page.screenshot({ path: join(outDir, "ui-nav-coding-desktop.png") });
    } catch (err) {
      check("nav", false, `navigation check threw: ${String(err?.message || err).split("\n")[0]}`);
      await page.screenshot({ path: join(outDir, "ui-nav-desktop-failure.png") }).catch(() => {});
    } finally {
      await page.close();
    }
  }

  // ── Every route, at both viewport widths ──────────────────────────────────
  // One tab per viewport, REUSED across routes. A newPage/close pair per route
  // is what wedges system Chrome mid-sweep ("Failed to open a new tab"); real
  // navigation also exercises the app the way a user does.
  for (const vp of VIEWPORTS) {
    const viewport = { width: vp.width, height: vp.height };
    /** `current` is swapped per route so each one gets a clean error bucket. */
    const holder = { current: emptyBucket() };
    let page = await openPage(viewport, holder);

    for (const route of ROUTES) {
      const scope = `${vp.name} ${route.path}`;
      // A closed/broken browser is not an app failure, so retry the route once
      // on a fresh tab (and browser, if needed) before recording anything.
      let outcome = null;
      let lastError = "";
      for (let attempt = 1; attempt <= 2 && outcome === null; attempt += 1) {
        holder.current = emptyBucket();
        const errors = holder.current;
        try {
          // `domcontentloaded`, not `networkidle`: Vite holds an HMR websocket
          // open so networkidle never settles and would burn the whole timeout.
          const resp = await page.goto(`${baseUrl}${route.path}`, {
            waitUntil: "domcontentloaded",
            timeout: TIMEOUT_MS,
          });
          const status = resp?.status() ?? 0;
          await page.waitForTimeout(1200); // let client-side hydration paint

          const title = await page.title();
          const overlay = await overlayText(page);
          const bodyText = await page.locator("body").innerText().catch(() => "");
          const trimmed = bodyText.trim();
          const overflow = await page.evaluate(() => {
            const el = document.documentElement;
            return el.scrollWidth > el.clientWidth + 1;
          });
          const screenshot = join(outDir, `ui-${route.name}-${vp.name}.png`);
          await page.screenshot({ path: screenshot, fullPage: false });

          // Compare case-insensitively: several headings are lower-cased in
          // source and upper-cased by CSS (`text-transform: uppercase`), and
          // `innerText` reports the RENDERED casing — so a literal match would
          // fail on correct markup.
          const haystack = trimmed.toLowerCase();
          const missing = route.expect.filter((n) => !haystack.includes(n.toLowerCase()));

          outcome = {
            viewport: vp.name,
            route: route.path,
            status,
            title,
            overlayError: overlay,
            bodyTextLen: trimmed.length,
            horizontalOverflow: overflow,
            consoleErrors: errors.consoleErrors,
            pageErrors: errors.pageErrors,
            missingCopy: missing,
            screenshot,
            attempts: attempt,
          };
        } catch (err) {
          lastError = String(err?.message || err).split("\n")[0];
          // Recover for the retry: fresh browser, then a fresh tab on it.
          await recycleBrowser().catch(() => {});
          page = await openPage(viewport, holder).catch(() => page);
        }
      }

      if (outcome === null) {
        check(scope, false, `route could not be driven after 2 attempts: ${lastError}`);
        console.log(`FAIL ${scope}  (harness error)`);
        continue;
      }

      check(scope, outcome.status > 0 && outcome.status < 400, `HTTP ${outcome.status}`);
      check(scope, outcome.overlayError === "", `Vite error overlay is showing: ${outcome.overlayError}`);
      check(scope, outcome.bodyTextLen >= MIN_BODY_TEXT, `body text too short (${outcome.bodyTextLen} chars) — page looks blank`);
      for (const needle of outcome.missingCopy) {
        check(scope, false, `missing expected copy: "${needle}"`);
      }
      check(scope, !outcome.horizontalOverflow, "horizontal overflow (content wider than viewport)");
      check(scope, outcome.consoleErrors.length === 0, `console errors: ${outcome.consoleErrors.slice(0, 3).join(" | ")}`);
      check(scope, outcome.pageErrors.length === 0, `runtime errors: ${outcome.pageErrors.slice(0, 3).join(" | ")}`);

      const ok =
        outcome.status > 0 && outcome.status < 400 &&
        outcome.overlayError === "" &&
        outcome.bodyTextLen >= MIN_BODY_TEXT &&
        outcome.missingCopy.length === 0 &&
        !outcome.horizontalOverflow &&
        outcome.consoleErrors.length === 0 &&
        outcome.pageErrors.length === 0;
      outcome.ok = ok;
      results.push(outcome);
      console.log(`${ok ? "ok  " : "FAIL"} ${scope}  (${outcome.bodyTextLen} chars${outcome.attempts > 1 ? ", retried" : ""})`);
    }

    await page.close().catch(() => {});
  }
} finally {
  await browser.close();
}

const verdict = {
  baseUrl,
  viewports: VIEWPORTS.map((v) => v.name),
  routes: ROUTES.map((r) => r.path),
  navLabels: NAV_LABELS,
  checkedAt: new Date().toISOString(),
  passed: failures.length === 0,
  failureCount: failures.length,
  failures,
  results,
};
writeFileSync(join(outDir, "ui-verdict.json"), JSON.stringify(verdict, null, 2));
console.log(
  `\n${verdict.passed ? "PASS" : "FAIL"} — ${ROUTES.length} routes x ${VIEWPORTS.length} viewports + nav, ${failures.length} failure(s)`,
);
if (!verdict.passed) {
  for (const f of failures) console.error(`  - ${f}`);
  process.exitCode = 1;
}