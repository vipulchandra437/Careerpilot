import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { proxy } from "@/proxy";

const BAD_UA = /(sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wfuzz|ffuf|whatweb|wpscan|joomla|drupal)/i;
const MAX_BODY_BYTES = 10 * 1024 * 1024;

const WEBHOOK_PATHS = ["/api/webhook"];

function isWebhook(pathname: string): boolean {
  return WEBHOOK_PATHS.some((p) => pathname.startsWith(p));
}

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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  const userAgent = request.headers.get("user-agent") ?? "";

  const response = NextResponse.next();

  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Cross-Origin-Embedder-Policy", "require-corp");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");

  if (!pathname.startsWith("/api")) {
    return response;
  }

  if (BAD_UA.test(userAgent)) {
    const { logSecurityEvent } = await import("@/lib/security-logger");
    logSecurityEvent("bot_detected", getClientIp(request), userAgent, pathname, {
      reason: "bad_user_agent",
    });
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const mutating = method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH";

  if (mutating) {
    const contentLength = parseInt(request.headers.get("content-length") ?? "0", 10);
    if (contentLength > MAX_BODY_BYTES) {
      const { logSecurityEvent } = await import("@/lib/security-logger");
      logSecurityEvent("request_size_exceeded", getClientIp(request), userAgent, pathname, {
        contentLength,
        maxBytes: MAX_BODY_BYTES,
      });
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }

    const contentType = request.headers.get("content-type") ?? "";
    const isJsonOrText = contentType.includes("application/json") || contentType.includes("text/");
    const bodySnippet = isJsonOrText ? await readBodySnippet(request) : null;

    // CSRF: skip for auth routes and webhooks, check header first, then body _csrf field
    if (!pathname.startsWith("/api/auth") && !isWebhook(pathname)) {
      if (!hasValidCsrfHeader(request)) {
        const cookieToken = request.cookies.get("csrf_token")?.value;
        const csrfBodyValid = bodySnippet ? hasCsrfBodyToken(bodySnippet, cookieToken) : false;
        if (!csrfBodyValid) {
          const { logSecurityEvent } = await import("@/lib/security-logger");
          logSecurityEvent("csrf_violation", getClientIp(request), userAgent, pathname, {
            reason: "missing_or_invalid_token",
          });
          return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
        }
      }
    }

    // Honeypot: non-empty "website" field is likely a bot
    if (bodySnippet && /"website"\s*:\s*"[^"]+"/.test(bodySnippet) && !/"website"\s*:\s*""/.test(bodySnippet)) {
      const { logSecurityEvent } = await import("@/lib/security-logger");
      logSecurityEvent("bot_detected", getClientIp(request), userAgent, pathname, {
        reason: "honeypot_field",
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return proxy(request);
}

function getClientIp(request: NextRequest): string {
  const trustProxy = (process.env.TRUST_PROXY ?? "false") === "true";
  if (trustProxy) {
    const realIp = request.headers.get("x-real-ip");
    if (realIp) return realIp;
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) {
      const parts = forwarded.split(",").map((s) => s.trim()).filter(Boolean);
      if (parts.length > 0) return parts[parts.length - 1] ?? "unknown";
    }
    return "unknown";
  }
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
