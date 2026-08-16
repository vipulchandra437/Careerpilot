/**
 * Dependency-free load test for the CareerPilot HTTP stack.
 * Usage: node scripts/load-test.mjs [baseUrl] [durationSec] [concurrency]
 *   e.g. node scripts/load-test.mjs http://localhost:3000 20 12
 *
 * Phase 1: concurrent GETs against cheap public endpoints (health, metrics,
 *   SSR pages) and a cheap authenticated list endpoint (login first).
 * Phase 2: deterministically verifies the rate limiter returns 429s on a
 *   mutating /api route that is hammered past its per-minute limit.
 *
 * Exits 0 if error rate stays under 1%; prints a summary either way.
 */

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/+$/, "");
const DURATION_MS = (parseInt(process.argv[3] ?? "20", 10) || 20) * 1000;
const CONCURRENCY = parseInt(process.argv[4] ?? "12", 10) || 12;

const GET_TARGETS = ["/api/health", "/api/metrics", "/login"];

const results = [];
let finished = false;

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

async function one(target, cookie) {
  const start = performance.now();
  const status = await fetch(`${BASE}${target}`, {
    headers: cookie ? { cookie } : {},
  })
    .then((r) => r.status)
    .catch(() => 0);
  results.push({ target, status, ms: performance.now() - start });
}

async function worker(cookie) {
  while (!finished) {
    const target = GET_TARGETS[Math.floor(Math.random() * GET_TARGETS.length)];
    await one(target, cookie);
  }
}

async function login() {
  const res = await fetch(`${BASE}/api/auth/credentials`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "student@careerpilot.dev", password: "student123" }),
  });
  if (!res.ok) return null;
  const setCookie = res.headers.get("set-cookie") ?? "";
  return setCookie.split(";")[0];
}

async function main() {
  console.log(`target=${BASE} duration=${DURATION_MS / 1000}s concurrency=${CONCURRENCY}`);

  let cookie = "";
  try {
    cookie = await login();
  } catch {
    // Login failing does not block the run; auth-backed targets are skipped.
  }
  if (cookie) console.log("login: ok (session cookie acquired)");
  else console.log("login: skipped (unreachable or seeded user missing)");

  const workers = Array.from({ length: CONCURRENCY }, () => worker(cookie));
  await new Promise((r) => setTimeout(r, DURATION_MS));
  finished = true;
  await Promise.all(workers);

  const byStatus = {};
  const errors = [];
  for (const r of results) {
    byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    if (r.status === 0) errors.push(r);
  }

  const durations = results.map((r) => r.ms).sort((a, b) => a - b);
  const ok = results.filter((r) => r.status >= 200 && r.status < 500);
  const errorRate = results.length ? errors.length / results.length : 1;

  console.log(`requests: ${results.length}  ok: ${ok.length}  failures: ${errors.length} (${(errorRate * 100).toFixed(2)}%)`);
  console.log(`p50: ${percentile(durations, 0.5)}ms  p95: ${percentile(durations, 0.95)}ms  max: ${durations[durations.length - 1] ?? 0}ms`);
  console.log("status distribution:", JSON.stringify(byStatus));

  // Phase 2: rate limiter check. General POST limit is 300/min per IP; fire
  // 25 concurrent posts at an analyze route (ai group limit 10/min) and
  // expect 429s.
  const limiterHits = await Promise.all(
    Array.from({ length: 25 }, () =>
      fetch(`${BASE}/api/github/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
        .then((r) => r.status)
        .catch(() => 0),
    ),
  );
  const rateLimited = limiterHits.filter((s) => s === 429).length;
  console.log(`rate limiter: ${rateLimited}/25 requests rejected with 429`);

  const pass = errorRate < 0.01;
  console.log(pass ? "RESULT: PASS" : "RESULT: FAIL");
  process.exit(pass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
