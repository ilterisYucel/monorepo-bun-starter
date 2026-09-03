import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RedisTotpThrottle } from "./redis-totp-throttle";
import type { RedisConnection } from "@gd-monorepo/core";

/**
 * RedisTotpThrottle (2026-08-30 T1.6) sözleşmesi — ASVS V3.5.2:
 * - recordFailure: sayaç artar; İLK artışta sayaç penceresi kurulur;
 *   eşik (maxFailures) aşılınca kilit anahtarı (lockSeconds TTL) kurulur.
 * - isLocked: kilit anahtarı varsa true.
 * - recordSuccess: sayaç + kilit temizlenir.
 * - Redis komut hatası fırlatılır (fail-open YOK — çağıran yakalar ve
 *   doğrulamayı reddeder).
 */

type RedisLike = {
  get: ReturnType<typeof vi.fn>;
  incr: ReturnType<typeof vi.fn>;
  expire: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
};

function mockRedis(client: RedisLike): RedisConnection {
  return { client: () => client } as never;
}

function clientMock(overrides?: Partial<RedisLike>): RedisLike {
  return {
    get: vi.fn().mockResolvedValue(null),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(true),
    del: vi.fn().mockResolvedValue(1),
    set: vi.fn().mockResolvedValue("OK"),
    ...overrides,
  };
}

const config = {
  maxFailures: 5,
  windowSeconds: 300,
  lockSeconds: 300,
};

describe("RedisTotpThrottle (T1.6) @nis2-security", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-30T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ilk başarısız deneme: sayaç penceresi kurulur, kilit YOK", async () => {
    const client = clientMock({ incr: vi.fn().mockResolvedValue(1) });
    const throttle = new RedisTotpThrottle(mockRedis(client), config);
    await throttle.recordFailure("u-1");
    expect(client.expire).toHaveBeenCalledWith("totp:fail:u-1", 300);
    expect(await throttle.isLocked("u-1")).toBe(false);
  });

  it("eşik aşılınca kilit kurulur (SET + EX)", async () => {
    const client = clientMock({
      incr: vi.fn().mockResolvedValue(5),
      get: vi.fn().mockResolvedValue("1"),
    });
    const throttle = new RedisTotpThrottle(mockRedis(client), config);
    await throttle.recordFailure("u-1");
    expect(client.set).toHaveBeenCalledWith("totp:lock:u-1", "1", {
      EX: 300,
    });
    expect(await throttle.isLocked("u-1")).toBe(true);
  });

  it("recordSuccess sayaç ve kilidi temizler", async () => {
    const client = clientMock({ get: vi.fn().mockResolvedValue(null) });
    const throttle = new RedisTotpThrottle(mockRedis(client), config);
    await throttle.recordSuccess("u-1");
    expect(client.del).toHaveBeenCalledWith(["totp:fail:u-1", "totp:lock:u-1"]);
    expect(await throttle.isLocked("u-1")).toBe(false);
  });

  it("isLocked mevcut kilit anahtarını okur", async () => {
    const client = clientMock({ get: vi.fn().mockResolvedValue("1") });
    const throttle = new RedisTotpThrottle(mockRedis(client), config);
    expect(await throttle.isLocked("u-1")).toBe(true);
  });

  it("Redis hatası fırlatılır (fail-open YOK)", async () => {
    const client = clientMock({
      get: vi.fn().mockRejectedValue(new Error("redis down")),
      incr: vi.fn().mockRejectedValue(new Error("redis down")),
    });
    const throttle = new RedisTotpThrottle(mockRedis(client), config);
    await expect(throttle.isLocked("u-1")).rejects.toThrow();
    await expect(throttle.recordFailure("u-1")).rejects.toThrow();
  });
});
