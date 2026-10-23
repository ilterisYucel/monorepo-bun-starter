import { describe, it, expect, vi } from "vitest";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { LogEventFeed } from "./log-event-feed";

function makeSql(rows: unknown[] = []): ISqlDatabase {
  return {
    execute: vi.fn(),
    query: vi.fn(async () => rows),
    queryOne: vi.fn(),
    health: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as ISqlDatabase;
}

describe("LogEventFeed (adapter)", () => {
  it("whitelist+after+limit ile sorgular ve satırı port tipine eşler", async () => {
    const sql = makeSql([
      {
        ts: "2026-10-22T09:58:00Z",
        level: "warn",
        category: "security",
        event_code: "device_alarm",
        message: "x",
        context: {},
        seq: 42,
        correlation_id: "corr-9",
      },
    ]);
    const rows = await new LogEventFeed(sql).listAfter({
      after: "2026-10-22T09:50:00.000Z",
      limit: 50,
      eventCodes: ["device_alarm"],
    });

    const [text, params] = (sql.query as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(text).toContain("event_code = ANY($2::text[])");
    expect(text).toContain("ORDER BY ts ASC");
    expect(params).toEqual(["2026-10-22T09:50:00.000Z", ["device_alarm"], 50]);
    expect(rows[0]).toMatchObject({
      eventCode: "device_alarm",
      correlationId: "corr-9",
      seq: 42,
    });
  });
});
