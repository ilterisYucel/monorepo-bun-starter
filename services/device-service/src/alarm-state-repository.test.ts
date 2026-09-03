import { describe, it, expect, vi } from "vitest";
import { AlarmStateRepository } from "./alarm-state-repository";
import type { ISqlDatabase } from "@gd-monorepo/core";

/**
 * AlarmStateRepository sözleşmesi (Faz 0 eki):
 * - `initialize()`: device_alarms tablosu + indeks DDL'i.
 * - `activate()`: UPSERT — satır yoksa aktif başlatır; satır aktifse
 *   started_at/resolved KORUNUR; satır pasifse yeni oluşum başlatır
 *   (resolved sıfırlanır).
 * - `deactivate()`: yalnızca aktif satırı kapatır (ended_at).
 * - `resolve()`: aktif satırı çözüldü işaretler — etkilenen satır yoksa false.
 * - `resetAll()`: restart sonrası bayat aktifleri kapatır.
 */

function makeSql(overrides: Partial<ISqlDatabase> = {}): ISqlDatabase {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue({ alarm_name: "BSC Fault" }),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("AlarmStateRepository (Faz 0 eki)", () => {
  it("initialize DDL'i oluşturur", async () => {
    const sql = makeSql();
    const repo = new AlarmStateRepository(sql);
    await repo.initialize();
    const calls = (sql.execute as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => s.includes("CREATE TABLE IF NOT EXISTS device_alarms"))).toBe(true);
  });

  it("activate UPSERT üretir — yeni oluşumda resolved sıfırlanır", async () => {
    const sql = makeSql();
    const repo = new AlarmStateRepository(sql);
    await repo.activate("bsc-1", {
      name: "BSC Fault",
      severity: "error",
      description: "Arıza",
    });
    const [ddl] = (sql.execute as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(ddl).toContain("INSERT INTO device_alarms");
    expect(ddl).toContain("ON CONFLICT (device_id, alarm_name)");
    expect(ddl).toContain("resolved = CASE WHEN device_alarms.active");
    expect(ddl).toContain("ELSE FALSE");
    expect(ddl).toContain("started_at = CASE WHEN device_alarms.active");
  });

  it("deactivate yalnızca aktif satırı kapatır", async () => {
    const sql = makeSql();
    const repo = new AlarmStateRepository(sql);
    await repo.deactivate("bsc-1", "BSC Fault");
    const [ddl, params] = (sql.execute as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
    expect(ddl).toContain("SET active = FALSE");
    expect(ddl).toContain("AND active = TRUE");
    expect(params).toEqual(["bsc-1", "BSC Fault"]);
  });

  it("resolve — aktif satır bulunursa true", async () => {
    const sql = makeSql();
    const repo = new AlarmStateRepository(sql);
    const result = await repo.resolve("bsc-1", "BSC Fault", "teknikci");
    expect(result).toBe(true);
    const [ddl, params] = (sql.queryOne as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
    expect(ddl).toContain("resolved = TRUE");
    expect(params).toEqual(["bsc-1", "BSC Fault", "teknikci"]);
  });

  it("resolve — aktif satır yoksa false (409 kaynağı)", async () => {
    const sql = makeSql({ queryOne: vi.fn().mockResolvedValue(undefined) });
    const repo = new AlarmStateRepository(sql);
    expect(await repo.resolve("bsc-1", "Yok", "teknikci")).toBe(false);
  });

  it("resetAll cihazların bayat aktiflerini kapatır", async () => {
    const sql = makeSql();
    const repo = new AlarmStateRepository(sql);
    await repo.resetAll(["bsc-1", "bsc-2"]);
    const [ddl, params] = (sql.execute as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
    expect(ddl).toContain("WHERE device_id = ANY");
    expect(params).toEqual([["bsc-1", "bsc-2"]]);
  });

  it("listActive / recentEnded sorguları tabloyu okur", async () => {
    const sql = makeSql();
    const repo = new AlarmStateRepository(sql);
    await repo.listActive();
    await repo.recentEnded(20);
    const calls = (sql.query as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => s.includes("active = TRUE"))).toBe(true);
    expect(calls.some((s) => s.includes("ended_at DESC"))).toBe(true);
  });
});
