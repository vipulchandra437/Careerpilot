import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * In-memory sliding-window rate limiter. State is per-process, which is
 * sufficient for a single instance (or per-isolate on serverless edge). For
 * multi-instance deployments behind a load balancer, move limits to Redis.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;

const enabled = (process.env.RATE_LIMIT_ENABLED ?? "true") !== "false";
const limits = {
  auth: parseInt(process.env.RATE_LIMIT_AUTH ?? "20", 10),
  ai: parseInt(process.env.RATE_LIMIT_AI ?? "10", 10),
  coding: parseInt(process.env.RATE_LIMIT_CODING ?? "30", 10),
  general: parseInt(process.env.RATE_LIMIT_GENERAL ?? "300", 10),
};

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
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

function take(key: string, limit: number, now: number): { allowed: boolean; retryAfter: number } {
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { allowed: true, retryAfter: 0 };
}

export function proxy(request: NextRequest) {
  const start = Date.now();
  const { pathname } = request.nextUrl;
  const method = request.method;
  const ip = clientIp(request);

  let response: NextResponse;
  const mutating = method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH";

  if (enabled && mutating && pathname.startsWith("/api")) {
    const group = groupFor(pathname);
    const { allowed, retryAfter } = take(`${group}:${ip}`, limits[group], start);
    if (!allowed) {
      console.warn(
        JSON.stringify({
          event: "rate_limited",
          method,
          path: pathname,
          group,
          ip,
        }),
      );
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

  response.headers.set("X-Request-Id", `${start.toString(36)}-${Math.random().toString(36).slice(2, 10)}`);

  console.log(
    JSON.stringify({
      event: "request",
      method,
      path: pathname,
      status: response.status,
      durationMs: Date.now() - start,
      ip,
    }),
  );

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
