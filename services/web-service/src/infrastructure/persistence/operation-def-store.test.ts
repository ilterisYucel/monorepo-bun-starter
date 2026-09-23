import { describe, it, expect, vi } from "vitest";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { OperationDefStore } from "./operation-def-store";

/**
 * OperationDefStore sözleşmesi (KOMUT §11.1-§11.2, B5):
 * - initialize: operation_defs DDL (idempotent).
 * - findByKindAndName/listByKind: okuma eşlemesi.
 * - create: (kind, name) varsa THROW ("already_exists").
 * - update: upsert (INSERT ... ON CONFLICT DO UPDATE).
 * - setEnabled: yumuşak silme; yoksa THROW ("not_found").
 */

function makeDb(overrides: Partial<ISqlDatabase> = {}): ISqlDatabase {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(undefined),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

const definition = {
  name: "admin_arbitraj",
  label: "Arbitraj",
  mode: "parallel",
  steps: [{ deviceTypes: ["pcs"], command: "charge" }],
};

describe("OperationDefStore", () => {
  it("initialize DDL oluşturur (operation_defs)", async () => {
    const db = makeDb();
    await new OperationDefStore(db).initialize();
    const calls = (db.execute as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => s.includes("CREATE TABLE IF NOT EXISTS operation_defs"))).toBe(true);
  });

  it("create: (kind, name) varsa THROW — rota 409 üretir", async () => {
    const db = makeDb({
      queryOne: vi.fn().mockResolvedValue({
        name: "admin_arbitraj",
        kind: "maneuver",
        definition,
        enabled: true,
        updated_by: "admin",
        updated_at: "2026-09-22T10:00:00.000Z",
        created_at: "2026-09-22T10:00:00.000Z",
      }),
    });
    await expect(
      new OperationDefStore(db).create("maneuver", definition, "admin"),
    ).rejects.toThrow("already_exists");
  });

  it("create: yoksa INSERT eder (enabled TRUE)", async () => {
    const db = makeDb();
    await new OperationDefStore(db).create("maneuver", definition, "admin");
    const [sql, params] = (db.execute as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain("INSERT INTO operation_defs");
    expect(params[0]).toBe("admin_arbitraj");
    expect(params[1]).toBe("maneuver");
    expect(params[2]).toBe(JSON.stringify(definition));
    expect(params[3]).toBe("admin");
  });

  it("update: upsert (ON CONFLICT DO UPDATE)", async () => {
    const db = makeDb();
    await new OperationDefStore(db).update("operation", "field_charge", definition, "admin");
    const [sql] = (db.execute as ReturnType<typeof vi.fn>).mock.calls[0] as [string];
    expect(sql).toContain("ON CONFLICT (kind, name) DO UPDATE");
  });

  it("setEnabled: yoksa THROW; varsa UPDATE (soft)", async () => {
    const missing = makeDb({ queryOne: vi.fn().mockResolvedValue(undefined) });
    await expect(
      new OperationDefStore(missing).setEnabled("maneuver", "yok", false, "admin"),
    ).rejects.toThrow("not_found");

    const db = makeDb({
      queryOne: vi.fn().mockResolvedValue({
        name: "x",
        kind: "maneuver",
        definition,
        enabled: true,
        updated_by: "admin",
        updated_at: "2026-09-22T10:00:00.000Z",
        created_at: "2026-09-22T10:00:00.000Z",
      }),
    });
    await new OperationDefStore(db).setEnabled("maneuver", "x", false, "admin");
    const [sql, params] = (db.execute as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain("UPDATE operation_defs");
    expect(params).toEqual(["maneuver", "x", false, "admin", expect.any(String)]);
  });

  it("findByKindAndName: satır eşlenir; yoksa undefined", async () => {
    const db = makeDb({
      queryOne: vi.fn().mockResolvedValue({
        name: "x",
        kind: "operation",
        definition: { name: "x" },
        enabled: false,
        updated_by: "admin",
        updated_at: "2026-09-22T10:00:00.000Z",
        created_at: "2026-09-22T10:00:00.000Z",
      }),
    });
    const record = await new OperationDefStore(db).findByKindAndName("operation", "x");
    expect(record).toEqual({
      name: "x",
      kind: "operation",
      definition: { name: "x" },
      enabled: false,
      updatedBy: "admin",
      updatedAt: "2026-09-22T10:00:00.000Z",
      createdAt: "2026-09-22T10:00:00.000Z",
    });
  });
});
