import { describe, it, expect, vi } from "vitest";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { FieldEventReader } from "./field-event-reader";

function makeSql(): ISqlDatabase {
  return {
    execute: vi.fn(),
    query: vi.fn(async () => []),
    queryOne: vi.fn(),
    health: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as ISqlDatabase;
}

describe("FieldEventReader (adapter)", () => {
  it("JOIN ile saha adını taşır + ISO dönüşümü", async () => {
    const sql = makeSql();
    (sql.query as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        field_id: "f-1",
        field_name: "İstanbul-1",
        event_id: "f-1:42",
        event_code: "device_alarm",
        level: "error",
        category: "app",
        message: "Voltage alarmi",
        context: { deviceId: "bsc-1" },
        occurred_at: new Date("2026-09-07T10:00:00Z"),
      },
    ]);
    const rows = await new FieldEventReader(sql).list({ limit: 10 });
    expect(rows[0]).toMatchObject({
      fieldId: "f-1",
      fieldName: "İstanbul-1",
      eventId: "f-1:42",
      eventCode: "device_alarm",
    });
    const [text, params] = (sql.query as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      unknown[],
    ];
    expect(text).toContain("LEFT JOIN admin_fields");
    expect(params).toEqual([null, 10]);
  });

  it("countSince sonrasını sayar", async () => {
    const sql = makeSql();
    (sql.query as ReturnType<typeof vi.fn>).mockResolvedValue([{ n: 7 }]);
    expect(await new FieldEventReader(sql).countSince("2026-09-07T00:00:00Z")).toBe(7);
  });
});
