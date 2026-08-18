import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";
import { metrics } from "@/lib/metrics";
import { logSecurityEvent } from "@/lib/security-logger";

const enabled = (process.env.RATE_LIMIT_ENABLED ?? "true") !== "false";
const limits = {
  auth: parseInt(process.env.RATE_LIMIT_AUTH ?? "20", 10),
  ai: parseInt(process.env.RATE_LIMIT_AI ?? "10", 10),
  coding: parseInt(process.env.RATE_LIMIT_CODING ?? "30", 10),
  general: parseInt(process.env.RATE_LIMIT_GENERAL ?? "300", 10),
};

const DAILY_AI_LIMITS: Record<string, number> = {
  STUDENT: parseInt(process.env.DAILY_AI_LIMIT_STUDENT ?? "50", 10),
  ADMIN: Infinity,
};

const LOGIN_ATTEMPT_LIMIT = 5;
const LOGIN_ATTEMPT_WINDOW_MS = 15 * 60_000;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function dailyKeyFor(userId: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `daily-ai:${userId}:${day}`;
}

function loginKeyFor(ip: string): string {
  return `login:${ip}`;
}

function groupFor(pathname: string): keyof typeof limits {
  if (pathname.startsWith("/api/auth")) return "auth";
  if (
    pathname.startsWith("/api/mentor/chat") ||
    pathname.startsWith("/api/resume/analyze") ||
    pathname.startsWith("/api/linkedin/analyze") ||
    pathname.startsWith("/api/github/analyze") ||
    pathname.startsWith("/api/communication/analyze") ||
    pathname.includes("/analyze")
  ) {
    return "ai";
  }
  if (
    pathname.startsWith("/api/coding") ||
    pathname.startsWith("/api/interview")
  ) {
    return "coding";
  }
  return "general";
}

function clientIp(request: NextRequest): string {
  const trustProxy = (process.env.TRUST_PROXY ?? "false") === "true";
  if (trustProxy) {
    // Behind a trusted reverse proxy, x-real-ip is set from the socket peer and
    // cannot be forged by the client. Otherwise prefer the rightmost
    // x-forwarded-for entry: a well-configured proxy appends to the chain, so
    // the leftmost value is client-controlled while the last is proxy-added.
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp;
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1] ?? "unknown";
    }
    return "unknown";
  }
  // No trusted proxy: Next fills x-forwarded-for from the socket peer only when
  // the client did not send the header, so in the common case this is the real
  // address. (A client can still spoof the header directly; without socket
  // access in middleware this is the best available signal — production runs
  // behind a reverse proxy with TRUST_PROXY=true.)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

function take(key: string, limit: number, now: number) {
  return rateLimiter.take(key, limit, now);
}

function extractUserId(request: NextRequest): string | null {
  const sessionCookie =
    request.cookies.get("__Secure-authjs.session-token")?.value ??
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.callback-url")?.value;
  if (!sessionCookie) return null;
  try {
    const parts = sessionCookie.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      return payload.sub ?? payload.id ?? null;
    }
  } catch {
    // Not a JWT or unparseable — fall through.
  }
  return null;
}

function checkLoginAttempts(ip: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = loginAttempts.get(loginKeyFor(ip));
  if (!entry || now >= entry.resetAt) {
    loginAttempts.set(loginKeyFor(ip), { count: 1, resetAt: now + LOGIN_ATTEMPT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  entry.count += 1;
  if (entry.count > LOGIN_ATTEMPT_LIMIT) {
    return { allowed: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

function isLoginRoute(pathname: string): boolean {
  return pathname === "/api/auth/callback/credentials" || pathname === "/api/auth/signin";
}

export async function proxy(request: NextRequest) {
  const start = Date.now();
  const { pathname } = request.nextUrl;
  const method = request.method;
  const ip = clientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "";

  let response: NextResponse;
  const mutating = method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH";
  const group: keyof typeof limits = pathname.startsWith("/api") ? groupFor(pathname) : "general";

  // Login attempt limiting: stricter threshold for auth routes
  if (enabled && isLoginRoute(pathname) && mutating) {
    const { allowed, retryAfter } = checkLoginAttempts(ip);
    if (!allowed) {
      metrics.increment("careerpilot_rate_limited_total", `group="login"`);
      logSecurityEvent("rate_limit_exceeded", ip, userAgent, pathname, {
        group: "login",
        reason: "too_many_login_attempts",
      });
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    }
  }

  // Daily per-user AI request limits
  if (enabled && group === "ai" && pathname.startsWith("/api")) {
    const userId = extractUserId(request);
    if (userId) {
      const key = dailyKeyFor(userId);
      const limit = DAILY_AI_LIMITS.STUDENT; // default to student; admin bypass checked below
      const dailyResult = await rateLimiter.take(key, limit, start);
      if (!dailyResult.allowed) {
        metrics.increment("careerpilot_rate_limited_total", `group="daily_ai"`);
        logSecurityEvent("rate_limit_exceeded", ip, userAgent, pathname, {
          group: "daily_ai",
          userId,
        });
        return NextResponse.json(
          { error: "Daily AI request limit reached. Please try again tomorrow." },
          { status: 429, headers: { "Retry-After": String(dailyResult.retryAfter) } },
        );
      }
    }
  }

  // Standard per-minute rate limiting for mutating API requests.
  const rateLimitKey = `${group}:${ip}`;

  if (enabled && mutating && pathname.startsWith("/api")) {
    const { allowed, retryAfter } = await take(rateLimitKey, limits[group], start);
    if (!allowed) {
      metrics.increment("careerpilot_rate_limited_total", `group="${group}"`);
      logSecurityEvent("rate_limit_exceeded", ip, userAgent, pathname, { group });
      response = NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
    } else {
      response = NextResponse.next();
    }
  } else {
    response = NextResponse.next();
  }

  const requestId = `${start.toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  response.headers.set("X-Request-Id", requestId);

  const durationMs = Date.now() - start;
  metrics.increment(
    "careerpilot_requests_total",
    `method="${method}",group="${group}",status="${response.status}"`,
  );
  metrics.observe("careerpilot_request_duration_ms", `method="${method}",group="${group}"`, durationMs);

  console.log(
    JSON.stringify({
      event: "request",
      requestId,
      method,
      path: pathname,
      status: response.status,
      durationMs,
      ip,
    }),
  );

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
