import { prisma } from "@/server/prisma";

import { LOCKOUT_PREFIX } from "@/lib/auth-errors";

// WHY DB-backed (not an in-memory Map): the app runs on Vercel serverless, where
// every function instance has separate memory — two requests often land on two
// instances, so local counters never add up. One Postgres row per email is the
// shared truth every instance agrees on.

// Tunable via env so tests can set tiny windows without code changes.
const MAX_FAILURES = Number(process.env.LOGIN_MAX_FAILURES ?? 5);
const WINDOW_MS = Number(process.env.LOGIN_WINDOW_SECONDS ?? 15 * 60) * 1000;
const LOCK_MS = Number(process.env.LOGIN_LOCK_SECONDS ?? 15 * 60) * 1000;

// WHY throw (not return a boolean): Auth.js v4 forwards a thrown authorize()
// error to the client as ?error=<message>; the login form strips LOCKOUT_PREFIX
// and shows the rest. A boolean would collapse "locked" into the same generic
// wrong-password banner and leave the student stuck with no explanation.
export async function assertLoginAllowed(email: string): Promise<void> {
  const row = await prisma.loginThrottle.findUnique({ where: { email } });
  if (!row?.lockedUntil) return;
  const remainingMs = row.lockedUntil.getTime() - Date.now();
  if (remainingMs <= 0) return;
  const minutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  throw new Error(
    `${LOCKOUT_PREFIX}Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
  );
}

export async function recordLoginFailure(email: string): Promise<void> {
  const now = new Date();
  const row = await prisma.loginThrottle.findUnique({ where: { email } });
  // WHY a sliding check instead of a fixed counter reset: the window must survive
  // instance restarts and idle periods — windowStart moves only when the streak
  // is still alive, so 3 tries today + 3 tomorrow never reach the threshold.
  const withinWindow = Boolean(
    row && now.getTime() - row.windowStart.getTime() < WINDOW_MS
  );
  const failedCount = withinWindow ? (row?.failedCount ?? 0) + 1 : 1;
  const windowStart = withinWindow && row ? row.windowStart : now;
  const lockedUntil =
    failedCount >= MAX_FAILURES ? new Date(now.getTime() + LOCK_MS) : null;

  // WHY upsert (not transaction): the read-modify-write race between two
  // concurrent failures can lose one increment at worst — an attacker gains one
  // extra attempt, not a bypass. Simpler than a transaction for that trade.
  await prisma.loginThrottle.upsert({
    where: { email },
    create: { email, failedCount, windowStart, lockedUntil },
    update: { failedCount, windowStart, lockedUntil },
  });
}

// WHY deleteMany (not delete): a successful login is rare enough to race with
// nothing, but the row may simply not exist — delete must not throw on that.
export async function clearLoginFailures(email: string): Promise<void> {
  await prisma.loginThrottle.deleteMany({ where: { email } });
}
