import { describe, it, expect } from "vitest";
import { HubTtlCache } from "./hub-ttl-cache";

describe("HubTtlCache", () => {
  it("TTL içinde değeri döner; süre geçince get undefined", () => {
    let now = 1000;
    const cache = new HubTtlCache<number>({ ttlMs: 2000, now: () => now });
    cache.set("c-1", 42);
    expect(cache.get("c-1")).toBe(42);
    now = 2500;
    expect(cache.get("c-1")).toBe(42);
    now = 3000;
    expect(cache.get("c-1")).toBeUndefined();
    // Kayıt `peek` fallback'i için korunur.
    expect(cache.peek("c-1")).toBe(42);
  });

  it("peek TTL'e bakmaz (son değer fallback)", () => {
    let now = 0;
    const cache = new HubTtlCache<string>({ ttlMs: 100, now: () => now });
    cache.set("c-1", "stale");
    now = 10_000;
    expect(cache.get("c-1")).toBeUndefined();
    expect(cache.peek("c-1")).toBe("stale");
  });

  it("delete + clear", () => {
    const cache = new HubTtlCache<number>({ ttlMs: 0, now: () => 0 });
    cache.set("a", 1);
    cache.set("b", 2);
    cache.delete("a");
    expect(cache.get("a")).toBeUndefined();
    cache.clear();
    expect(cache.get("b")).toBeUndefined();
  });
});
