import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { DeviceRegistry } from "./device-registry";
import type { ISqlDatabase } from "@gd-monorepo/core";

function fakeDb(): ISqlDatabase & { queryCount: number } {
  const db = {
    queryCount: 0,
    query: vi.fn(async () => {
      db.queryCount += 1;
      return [{ id: "BSC-1", protocol: "MODBUS", status: "online", name: "BSC", type: "bsc", manufacturer: null, model: null }];
    }),
    execute: vi.fn(async () => undefined),
    connect: vi.fn(async () => undefined),
    disconnect: vi.fn(async () => undefined),
  };
  return db as unknown as ISqlDatabase & { queryCount: number };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("DeviceRegistry — refresh TTL cache", () => {
  it("ttl içindeki ardışık refresh tek sorgu yapar", async () => {
    const db = fakeDb();
    const registry = new DeviceRegistry(db, 2000);

    await registry.refresh();
    await registry.refresh();
    expect(db.queryCount).toBe(1);

    await vi.advanceTimersByTimeAsync(2001);
    await registry.refresh();
    expect(db.queryCount).toBe(2);
  });

  it("force=true ttl'i atlar", async () => {
    const db = fakeDb();
    const registry = new DeviceRegistry(db, 2000);

    await registry.refresh();
    await registry.refresh(true);
    expect(db.queryCount).toBe(2);
  });

  it("online() önbellekten döner", async () => {
    const db = fakeDb();
    const registry = new DeviceRegistry(db, 2000);
    await registry.refresh();
    expect(registry.online().map((d) => d.id)).toEqual(["BSC-1"]);
  });
});
