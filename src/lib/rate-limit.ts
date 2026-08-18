import { Redis } from "ioredis";
import { logger } from "@/lib/logger";

/**
 * Fixed-window rate limiter (per minute).
 *
 * Backends:
 * - Redis (`REDIS_URL` set): shared across instances behind a load balancer.
 * - In-memory: per-process only; used when Redis is unconfigured/unreachable.
 */

export interface TakeResult {
  allowed: boolean;
  retryAfter: number;
}

export interface RateLimiter {
  take(key: string, limit: number, now: number): Promise<TakeResult>;
}

const WINDOW_MS = 60_000;

class MemoryRateLimiter implements RateLimiter {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  private ops = 0;

  /** Delete expired buckets and cap the map so it cannot grow unboundedly. */
  private sweep(now: number): void {
    this.ops += 1;
    if (this.ops % 32 !== 0 && this.buckets.size < 4096) return;
    for (const [key, bucket] of this.buckets) {
      if (now >= bucket.resetAt) this.buckets.delete(key);
    }
    let over = this.buckets.size - 4096;
    if (over > 0) {
      for (const key of this.buckets.keys()) {
        if (over-- <= 0) break;
        this.buckets.delete(key);
      }
    }
  }

  async take(key: string, limit: number, now: number): Promise<TakeResult> {
    this.sweep(now);
    const bucket = this.buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return { allowed: true, retryAfter: 0 };
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      return { allowed: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
    }
    return { allowed: true, retryAfter: 0 };
  }
}

/** Atomic INCR + EXPIRE so concurrent requests cannot race the window reset. */
const INCR_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
local ttl = redis.call('PTTL', KEYS[1])
return {count, ttl}
`;

class RedisRateLimiter implements RateLimiter {
  private client: Redis;

  constructor(url: string) {
    this.client = new Redis(url, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      connectTimeout: 2000,
    });
  }

  async take(key: string, limit: number, now: number): Promise<TakeResult> {
    const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
    const ttlMs = WINDOW_MS - (now - windowStart) + 1;
    const result = (await this.client.eval(INCR_SCRIPT, 1, `rl:${key}:${windowStart}`, String(ttlMs))) as [
      number,
      number,
    ];
    const count = Number(result[0]);
    const ttl = Number(result[1]);
    if (count > limit) {
      return { allowed: false, retryAfter: Math.ceil(ttl / 1000) };
    }
    return { allowed: true, retryAfter: 0 };
  }
}

/**
 * Creates the app-wide limiter. If `REDIS_URL` is set the Redis backend is
 * used; the first error (e.g. Redis unreachable at boot) permanently degrades
 * to in-memory so a broken cache never takes the site down.
 */
export function createRateLimiter(): RateLimiter {
  const memory = new MemoryRateLimiter();
  const url = process.env.REDIS_URL;
  if (!url) return memory;

  const redis = new RedisRateLimiter(url);
  let degraded = false;

  return {
    async take(key, limit, now) {
      if (degraded) return memory.take(key, limit, now);
      try {
        return await redis.take(key, limit, now);
      } catch (err) {
        degraded = true;
        logger.warn("Rate limiter degraded, falling back to memory", {
          reason: err instanceof Error ? err.message : String(err),
        });
        return memory.take(key, limit, now);
      }
    },
  };
}

export function rateLimiterBackend(): "redis" | "memory" {
  return process.env.REDIS_URL ? "redis" : "memory";
}

export const rateLimiter = createRateLimiter();
