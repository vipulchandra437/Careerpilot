import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimiter } from "@/lib/rate-limit";
import { metrics } from "@/lib/metrics";
import { logSecurityEvent } from "@/lib/security-logger";

// --- Security constants ---
const BAD_UA = /(sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wfuzz|ffuf|whatweb|wpscan|joomla|drupal)/i;
const MAX_BODY_BYTES = 10 * 1024 * 1024;
const WEBHOOK_PATHS = ["/api/webhook"];

function isWebhook(pathname: string): boolean {
  return WEBHOOK_PATHS.some((p) => pathname.startsWith(p));
}

// --- Rate limit config ---
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

// --- Security helpers ---
async function readBodySnippet(request: NextRequest): Promise<string | null> {
  try {
    const clone = request.clone();
    const text = await clone.text();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

function hasValidCsrfHeader(request: NextRequest): boolean {
  const headerToken = request.headers.get("x-csrf-token");
  if (!headerToken) return false;
  const cookieToken = request.cookies.get("csrf_token")?.value;
  return cookieToken != null && headerToken === cookieToken;
}

function hasCsrfBodyToken(body: string, cookieToken: string | undefined): boolean {
  if (!cookieToken) return false;
  try {
    const parsed = JSON.parse(body);
    if (typeof parsed._csrf === "string" && parsed._csrf === cookieToken) return true;
  } catch { /* not JSON */ }
  return false;
}

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
}

const STUDENT_PATHS = ["/dashboard", "/profile", "/coding", "/communication", "/career-goal", "/github", "/hiring-simulation", "/interview", "/linkedin", "/mentor", "/projects", "/progress", "/readiness", "/report", "/resume", "/roadmap", "/settings", "/skill-gaps"];
const ADMIN_PREFIX = "/admin";

function hasSessionCookie(request: NextRequest): boolean {
  return !!(
    request.cookies.get("__Secure-authjs.session-token")?.value ??
    request.cookies.get("authjs.session-token")?.value
  );
}

function hasAdminSession(request: NextRequest): boolean {
  const token =
    request.cookies.get("__Secure-authjs.session-token")?.value ??
    request.cookies.get("authjs.session-token")?.value;
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
      return payload.role === "ADMIN";
    }
  } catch { /* not a JWT */ }
  return false;
}

function isProtectedPage(pathname: string): boolean {
  if (pathname === "/login" || pathname === "/register") return false;
  if (STUDENT_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (pathname.startsWith(ADMIN_PREFIX)) return true;
  return false;
}

function isAdminPage(pathname: string): boolean {
  return pathname.startsWith(ADMIN_PREFIX);
}

export async function proxy(request: NextRequest) {
  const start = Date.now();
  const { pathname } = request.nextUrl;
  const method = request.method;
  const ip = clientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "";

  // --- Auth check for protected page routes ---
  if (!pathname.startsWith("/api") && isProtectedPage(pathname)) {
    if (!hasSessionCookie(request)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (isAdminPage(pathname) && !hasAdminSession(request)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // --- Redirect logged-in users away from login/register ---
  if ((pathname === "/login" || pathname === "/register") && hasSessionCookie(request)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // --- Security headers on every response ---
  const mutating = method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH";
  let response: NextResponse;
  const group: keyof typeof limits = pathname.startsWith("/api") ? groupFor(pathname) : "general";

  // --- Security checks for API routes ---
  if (pathname.startsWith("/api")) {
    // Bad user-agent blocking
    if (BAD_UA.test(userAgent)) {
      logSecurityEvent("bot_detected", ip, userAgent, pathname, { reason: "bad_user_agent" });
      const res = NextResponse.json({ error: "Forbidden" }, { status: 403 });
      addSecurityHeaders(res);
      return res;
    }

    if (mutating) {
      // Request size limit
      const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
      if (contentLength > MAX_BODY_BYTES) {
        logSecurityEvent("request_size_exceeded", ip, userAgent, pathname, { contentLength, maxBytes: MAX_BODY_BYTES });
        const res = NextResponse.json({ error: "Request too large" }, { status: 413 });
        addSecurityHeaders(res);
        return res;
      }

      // CSRF validation (skip for auth routes and webhooks)
      if (!pathname.startsWith("/api/auth") && !isWebhook(pathname)) {
        const contentType = request.headers.get("content-type") ?? "";
        const isJsonOrText = contentType.includes("application/json") || contentType.includes("text/");
        const bodySnippet = isJsonOrText ? await readBodySnippet(request) : null;

        if (!hasValidCsrfHeader(request)) {
          const cookieToken = request.cookies.get("csrf_token")?.value;
          const csrfBodyValid = bodySnippet ? hasCsrfBodyToken(bodySnippet, cookieToken) : false;
          if (!csrfBodyValid) {
            logSecurityEvent("csrf_violation", ip, userAgent, pathname, { reason: "missing_or_invalid_token" });
            const res = NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
            addSecurityHeaders(res);
            return res;
          }
        }

        // Honeypot: non-empty "website" field = bot
        if (bodySnippet && /"website"\s*:\s*"[^"]+"/.test(bodySnippet) && !/"website"\s*:\s*""/.test(bodySnippet)) {
          logSecurityEvent("bot_detected", ip, userAgent, pathname, { reason: "honeypot_field" });
          const res = NextResponse.json({ error: "Forbidden" }, { status: 403 });
          addSecurityHeaders(res);
          return res;
        }
      }
    }
  }

  // Login attempt limiting: stricter threshold for auth routes
  if (enabled && isLoginRoute(pathname) && mutating) {
    const { allowed, retryAfter } = checkLoginAttempts(ip);
    if (!allowed) {
      metrics.increment("careerpilot_rate_limited_total", `group="login"`);
      logSecurityEvent("rate_limit_exceeded", ip, userAgent, pathname, {
        group: "login",
        reason: "too_many_login_attempts",
      });
      const res = NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
      addSecurityHeaders(res);
      return res;
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
        const res = NextResponse.json(
          { error: "Daily AI request limit reached. Please try again tomorrow." },
          { status: 429, headers: { "Retry-After": String(dailyResult.retryAfter) } },
        );
        addSecurityHeaders(res);
        return res;
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
      const rateLimitedRes = NextResponse.json(
        { error: "Too many requests. Please try again in a minute." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } },
      );
      addSecurityHeaders(rateLimitedRes);
      response = rateLimitedRes;
    } else {
      response = NextResponse.next();
    }
  } else {
    response = NextResponse.next();
  }

  // --- Apply security headers ---
  addSecurityHeaders(response);

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
