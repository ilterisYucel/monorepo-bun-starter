import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RedisLoginThrottle } from "./redis-login-throttle";
import type { RedisConnection } from "@gd-monorepo/core";

/**
 * RedisLoginThrottle (T6.6) sözleşmesi:
 * - recordFailure: sayaç artar; İLK artışta sayaç penceresi kurulur;
 *   eşik (maxFailures) aşılınca kilit anahtarı (lockSeconds TTL) kurulur.
 * - isLocked: kilit anahtarı varsa true.
 * - recordSuccess: sayaç + kilit temizlenir.
 * - Redis komut hatası fırlatılır (fail-open YOK — çağıran yakalar ve
 *   girişi reddeder).
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
  windowSeconds: 900,
  lockSeconds: 900,
};

describe("RedisLoginThrottle (T6.6) @nis2-security", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-26T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ilk başarısız giriş: sayaç penceresi kurulur, kilit YOK", async () => {
    const client = clientMock({ incr: vi.fn().mockResolvedValue(1) });
    const throttle = new RedisLoginThrottle(mockRedis(client), config);
    await throttle.recordFailure("admin");
    expect(client.expire).toHaveBeenCalledWith("login:fail:admin", 900);
    expect(await throttle.isLocked("admin")).toBe(false);
  });

  it("eşik aşılınca kilit kurulur (SET + EX — EXPIRE var olmayan anahtarı yaratmaz)", async () => {
    const client = clientMock({
      incr: vi.fn().mockResolvedValue(5),
      get: vi.fn().mockResolvedValue("1"),
    });
    const throttle = new RedisLoginThrottle(mockRedis(client), config);
    await throttle.recordFailure("admin");
    expect(client.set).toHaveBeenCalledWith("login:lock:admin", "1", {
      EX: 900,
    });
    expect(await throttle.isLocked("admin")).toBe(true);
  });

  it("recordSuccess sayaç ve kilidi temizler", async () => {
    const client = clientMock({ get: vi.fn().mockResolvedValue(null) });
    const throttle = new RedisLoginThrottle(mockRedis(client), config);
    await throttle.recordSuccess("admin");
    expect(client.del).toHaveBeenCalledWith(["login:fail:admin", "login:lock:admin"]);
    expect(await throttle.isLocked("admin")).toBe(false);
  });

  it("isLocked mevcut kilit anahtarını okur", async () => {
    const client = clientMock({ get: vi.fn().mockResolvedValue("1") });
    const throttle = new RedisLoginThrottle(mockRedis(client), config);
    expect(await throttle.isLocked("admin")).toBe(true);
  });

  it("Redis hatası fırlatılır (fail-open YOK)", async () => {
    const client = clientMock({
      get: vi.fn().mockRejectedValue(new Error("redis down")),
      incr: vi.fn().mockRejectedValue(new Error("redis down")),
    });
    const throttle = new RedisLoginThrottle(mockRedis(client), config);
    await expect(throttle.isLocked("admin")).rejects.toThrow();
    await expect(throttle.recordFailure("admin")).rejects.toThrow();
  });
});
