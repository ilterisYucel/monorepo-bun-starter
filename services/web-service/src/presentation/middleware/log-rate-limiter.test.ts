import { describe, it, expect, vi } from "vitest";
import { LogRateLimiter } from "./log-rate-limiter";

/**
 * T0.8 — LogRateLimiter kontratı:
 * - Anahtar başına (ör. IP) dakikada en fazla `maxPerMinute` istek (varsayılan 60).
 * - Limit aşılınca `allow()` false döner.
 * - Pencere dolunca sayaç sıfırlanır.
 */

describe("LogRateLimiter (T0.8)", () => {
  it("limit altında izin verir", () => {
    const limiter = new LogRateLimiter({ maxPerMinute: 3 });
    expect(limiter.allow("ip-1")).toBe(true);
    expect(limiter.allow("ip-1")).toBe(true);
    expect(limiter.allow("ip-1")).toBe(true);
  });

  it("limit aşılınca reddeder", () => {
    const limiter = new LogRateLimiter({ maxPerMinute: 2 });
    limiter.allow("ip-1");
    limiter.allow("ip-1");
    expect(limiter.allow("ip-1")).toBe(false);
  });

  it("farklı anahtarlar birbirini etkilemez", () => {
    const limiter = new LogRateLimiter({ maxPerMinute: 1 });
    expect(limiter.allow("ip-1")).toBe(true);
    expect(limiter.allow("ip-2")).toBe(true);
    expect(limiter.allow("ip-1")).toBe(false);
  });

  it("pencere dolunca sıfırlanır", () => {
    let now = 0;
    const limiter = new LogRateLimiter({
      maxPerMinute: 2,
      now: () => now,
    });
    expect(limiter.allow("ip-1")).toBe(true);
    expect(limiter.allow("ip-1")).toBe(true);
    expect(limiter.allow("ip-1")).toBe(false);
    now = 60_001;
    expect(limiter.allow("ip-1")).toBe(true);
  });
});
