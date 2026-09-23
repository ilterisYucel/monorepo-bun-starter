import { describe, it, expect, vi } from "vitest";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { OperationRunStore } from "./operation-run-store";

/**
 * OperationRunStore sözleşmesi (KOMUT-MANEVRA-OPERASYON §8, B2):
 * - initialize: operation_runs DDL'i (idempotent).
 * - begin: running INSERT — params birebir; hata THROW (fail-closed).
 * - finish: terminal UPDATE — hata THROW.
 * - findById/listRecent: okuma eşlemesi (satır → OperationRunRecord).
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

const draft = {
  id: "run-1",
  kind: "maneuver" as const,
  name: "pcs_charge",
  trigger: "manual",
  createdBy: "admin",
  traceId: "t-1",
  startedAt: "2026-09-22T10:00:00.000Z",
  steps: { definition: { name: "pcs_charge" }, params: { powerKw: 200 } },
};

describe("OperationRunStore", () => {
  it("initialize DDL oluşturur (operation_runs + indeksler)", async () => {
    const db = makeDb();
    const store = new OperationRunStore(db);
    await store.initialize();
    const calls = (db.execute as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => s.includes("CREATE TABLE IF NOT EXISTS operation_runs"))).toBe(true);
    expect(calls.some((s) => s.includes("idx_operation_runs_started"))).toBe(true);
  });

  it("begin: running INSERT — parametreler birebir", async () => {
    const db = makeDb();
    const store = new OperationRunStore(db);
    await store.begin(draft);
    const [sql, params] = (db.execute as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain("INSERT INTO operation_runs");
    expect(sql).toContain("'running'");
    expect(params).toEqual([
      "run-1",
      "maneuver",
      "pcs_charge",
      "manual",
      JSON.stringify(draft.steps),
      "2026-09-22T10:00:00.000Z",
      "admin",
      "t-1",
    ]);
  });

  it("begin: DB hatası THROW eder (fail-closed — yürütücü reddeder)", async () => {
    const db = makeDb({
      execute: vi.fn().mockRejectedValue(new Error("pg yok")),
    });
    const store = new OperationRunStore(db);
    await expect(store.begin(draft)).rejects.toThrow("pg yok");
  });

  it("finish: terminal durum UPDATE — params birebir; hata throw", async () => {
    const db = makeDb();
    const store = new OperationRunStore(db);
    await store.finish("run-1", "completed", "2026-09-22T10:00:05.000Z");
    const [sql, params] = (db.execute as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain("UPDATE operation_runs SET status");
    expect(params).toEqual(["run-1", "completed", "2026-09-22T10:00:05.000Z"]);
  });

  it("findById: satır eşlenir; yoksa undefined", async () => {
    const db = makeDb({
      queryOne: vi.fn().mockResolvedValue({
        id: "run-1",
        kind: "operation",
        name: "field_charge",
        trigger: "manual",
        status: "completed",
        steps: { a: 1 },
        started_at: "2026-09-22T10:00:00.000Z",
        finished_at: "2026-09-22T10:00:05.000Z",
        created_by: "admin",
        trace_id: null,
      }),
    });
    const store = new OperationRunStore(db);
    const record = await store.findById("run-1");
    expect(record).toEqual({
      id: "run-1",
      kind: "operation",
      name: "field_charge",
      trigger: "manual",
      status: "completed",
      steps: { a: 1 },
      startedAt: "2026-09-22T10:00:00.000Z",
      finishedAt: "2026-09-22T10:00:05.000Z",
      createdBy: "admin",
      traceId: null,
    });

    const empty = makeDb({ queryOne: vi.fn().mockResolvedValue(undefined) });
    expect(await new OperationRunStore(empty).findById("yok")).toBeUndefined();
  });

  it("listRecent: started_at DESC limit; boş liste", async () => {
    const db = makeDb({
      query: vi.fn().mockResolvedValue([
        {
          id: "run-2",
          kind: "maneuver",
          name: "pcs_charge",
          trigger: "rule:x",
          status: "failed",
          steps: {},
          started_at: "2026-09-22T11:00:00.000Z",
          finished_at: null,
          created_by: "system",
          trace_id: "auto:x",
        },
      ]),
    });
    const store = new OperationRunStore(db);
    const records = await store.listRecent(10);
    const [sql, params] = (db.query as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(sql).toContain("ORDER BY started_at DESC");
    expect(params).toEqual([10]);
    expect(records).toHaveLength(1);
    expect(records[0]!.finishedAt).toBeNull();
  });
});
