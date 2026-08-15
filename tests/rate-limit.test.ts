import { describe, it, expect, vi } from "vitest";
import { createRateLimiter } from "@/lib/rate-limit";

describe("rate limiter (in-memory backend)", () => {
  it("allows requests up to the limit", async () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < 10; i++) {
      const r = await limiter.take("auth:127.0.0.1", 10, Date.now());
      expect(r.allowed).toBe(true);
    }
  });

  it("blocks over-limit requests with a retry-after", async () => {
    const limiter = createRateLimiter();
    const now = 1_000_000;
    for (let i = 0; i < 10; i++) {
      await limiter.take("ai:ip", 10, now);
    }
    const blocked = await limiter.take("ai:ip", 10, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it("does not block different keys", async () => {
    const limiter = createRateLimiter();
    for (let i = 0; i < 10; i++) {
      await limiter.take("a", 10, Date.now());
    }
    const r = await limiter.take("b", 10, Date.now());
    expect(r.allowed).toBe(true);
  });

  it("resets after the window elapses", async () => {
    vi.useFakeTimers();
    try {
      const limiter = createRateLimiter();
      const start = Date.now();
      for (let i = 0; i < 5; i++) {
        await limiter.take("c", 5, start);
      }
      expect((await limiter.take("c", 5, start)).allowed).toBe(false);
      const later = start + 61_000;
      expect((await limiter.take("c", 5, later)).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
