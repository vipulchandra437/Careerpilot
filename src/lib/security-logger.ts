import { createLogger } from "@/lib/logger";

type SecurityEvent =
  | "login_failed"
  | "rate_limit_exceeded"
  | "csrf_violation"
  | "bot_detected"
  | "suspicious_input"
  | "suspicious_activity"
  | "request_size_exceeded";

interface SecurityEventDetails {
  timestamp: string;
  ip: string;
  userAgent: string;
  path: string;
  details: Record<string, unknown>;
}

const log = createLogger("security");

const recentRateLimits = new Map<string, number[]>();
const SUSPICIOUS_THRESHOLD = 3;
const SUSPICIOUS_WINDOW_MS = 3600_000;

let lastSecurityEventTimestamp: string | null = null;

export function getLastSecurityEventTimestamp(): string | null {
  return lastSecurityEventTimestamp;
}

export function logSecurityEvent(
  event: SecurityEvent,
  ip: string,
  userAgent: string,
  path: string,
  details: Record<string, unknown> = {},
): void {
  const timestamp = new Date().toISOString();
  lastSecurityEventTimestamp = timestamp;

  const entry: SecurityEventDetails = {
    timestamp,
    ip,
    userAgent,
    path,
    details,
  };

  log.warn(`security:${event}`, entry as unknown as Record<string, unknown>);

  if (event === "rate_limit_exceeded") {
    const now = Date.now();
    const timestamps = recentRateLimits.get(ip) ?? [];
    const recent = timestamps.filter((t) => now - t < SUSPICIOUS_WINDOW_MS);
    recent.push(now);
    recentRateLimits.set(ip, recent);

    if (recent.length >= SUSPICIOUS_THRESHOLD) {
      const susEntry: SecurityEventDetails = {
        timestamp: new Date().toISOString(),
        ip,
        userAgent,
        path,
        details: { rateLimitHits: recent.length, windowMs: SUSPICIOUS_WINDOW_MS },
      };
      log.warn("security:suspicious_activity", susEntry as unknown as Record<string, unknown>);
    }
  }
}

export function getSecurityEventsInWindow(): number {
  const now = Date.now();
  let count = 0;
  for (const timestamps of recentRateLimits.values()) {
    count += timestamps.filter((t) => now - t < SUSPICIOUS_WINDOW_MS).length;
  }
  return count;
}
