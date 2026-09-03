import { describe, it, expect, vi } from "vitest";
import { LogRepository } from "./log-repository";
import type { ISqlDatabase } from "@gd-monorepo/core";

/**
 * LogRepository sözleşmesi (Faz 0 kalanı A1 — log_events migrasyonu):
 * - `initialize()`: system_logs DDL'i (geçiş) + log_events DDL'i oluşturur.
 * - `query()`: system_logs ∪ log_events UNION okuması — filtreler iki tarafa
 *   da uygulanır; LogEntry şekli korunur (LogTerminal değişmez).
 * - `insert()`: client olayları system_logs'a yazılır (geçiş).
 */

function makeDb(overrides: Partial<ISqlDatabase> = {}): ISqlDatabase {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue({ id: "l-1" }),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

describe("LogRepository (A1)", () => {
  it("initialize hem system_logs hem log_events DDL'ini oluşturur", async () => {
    const db = makeDb();
    const repo = new LogRepository(db);
    await repo.initialize();
    const calls = (db.execute as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => s.includes("system_logs"))).toBe(true);
    expect(calls.some((s) => s.includes("log_events"))).toBe(true);
  });

  it("query UNION üretir — iki kaynağı birleştirir", async () => {
    const db = makeDb();
    const repo = new LogRepository(db);
    await repo.query({ limit: 50 });
    const [sql] = (db.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(sql).toContain("UNION ALL");
    expect(sql).toContain("system_logs");
    expect(sql).toContain("log_events");
  });

  it("query filtreleri UNION dışına uygulanır", async () => {
    const db = makeDb();
    const repo = new LogRepository(db);
    await repo.query({ types: ["error"], sources: ["system"] });
    const [sql, params] = (db.query as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("type = ANY");
    expect(sql).toContain("source = ANY");
    expect(params.length).toBeGreaterThan(0);
  });

  it("insert system_logs'a yazar (client olayları — geçiş)", async () => {
    const db = makeDb();
    const repo = new LogRepository(db);
    await repo.insert({ type: "error", source: "user", message: "x" });
    const [sql] = (db.queryOne as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(sql).toContain("INSERT INTO system_logs");
  });
});
