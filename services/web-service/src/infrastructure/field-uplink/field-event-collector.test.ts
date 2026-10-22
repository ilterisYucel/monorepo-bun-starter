import { describe, it, expect, vi } from "vitest";
import type { ISqlDatabase } from "@gd-monorepo/core";
import type { EventMessage, IHubChannel } from "@gd-monorepo/ws-tunnel";
import { FieldEventCollector } from "./field-event-collector";

/**
 * FieldEventCollector sözleşmesi (Boss Faz 5):
 * - `event` frame → (field_id, event_id) dedupe INSERT
 * - whitelist dışı olaylar YOK sayılır (savunma katmanı)
 * - list: JOIN ile saha adı + after filtresi; countSince: sayı
 */

function makeSql(): ISqlDatabase {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(undefined),
    health: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
  } as unknown as ISqlDatabase;
}

function makeChannel(): {
  channel: IHubChannel;
  emit: (peerId: string, message: unknown) => void;
} {
  let handler: ((peerId: string, message: unknown) => void) | undefined;
  const channel = {
    onControlMessage: (cb: (peerId: string, message: unknown) => void) => {
      handler = cb;
      return () => undefined;
    },
  } as unknown as IHubChannel;
  return { channel, emit: (peerId, message) => handler?.(peerId, message) };
}

const EVENT: EventMessage = {
  type: "event",
  eventId: "f-1:42",
  timestamp: "2026-09-07T10:00:00.000Z",
  level: "error",
  category: "app",
  eventCode: "device_alarm",
  message: "Voltage alarmi",
  context: { deviceId: "bsc-1" },
};

describe("FieldEventCollector (Faz 5)", () => {
  it("event frame'i dedupe INSERT ile yazar (ON CONFLICT DO NOTHING)", async () => {
    const sql = makeSql();
    const { channel, emit } = makeChannel();
    const collector = new FieldEventCollector(sql, undefined);
    collector.attachChannel(channel);
    emit("f-1", EVENT);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sql.execute).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (field_id, event_id) DO NOTHING"),
      expect.arrayContaining(["f-1", "f-1:42", "device_alarm"]),
    );
  });

  it("whitelist dışı olay yok sayılır", async () => {
    const sql = makeSql();
    const { channel, emit } = makeChannel();
    const collector = new FieldEventCollector(sql, undefined);
    collector.attachChannel(channel);
    emit("f-1", { ...EVENT, eventCode: "ws_connection_lost" });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sql.execute).not.toHaveBeenCalled();
  });

  it("list JOIN ile saha adını taşır + ISO dönüşümü", async () => {
    const sql = makeSql();
    (sql.query as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        id: "1",
        field_id: "f-1",
        event_id: "f-1:42",
        event_code: "device_alarm",
        level: "error",
        category: "app",
        message: "Voltage alarmi",
        context: { deviceId: "bsc-1" },
        occurred_at: new Date("2026-09-07T10:00:00Z"),
        received_at: new Date("2026-09-07T10:00:01Z"),
        field_name: "İstanbul-1",
      },
    ]);
    const collector = new FieldEventCollector(sql, undefined);
    const events = await collector.list({ limit: 10 });
    expect(events[0]).toMatchObject({
      fieldName: "İstanbul-1",
      eventCode: "device_alarm",
      occurredAt: "2026-09-07T10:00:00.000Z",
    });
  });

  it("countSince sonrasını sayar", async () => {
    const sql = makeSql();
    (sql.query as ReturnType<typeof vi.fn>).mockResolvedValue([{ n: 7 }]);
    const collector = new FieldEventCollector(sql, undefined);
    expect(await collector.countSince("2026-09-07T00:00:00Z")).toBe(7);
  });

  it("demoSeed açıkken ensureSchema 3 örnek bildirim eker (idempotent)", async () => {
    const sql = makeSql();
    const collector = new FieldEventCollector(sql, undefined, {
      demoSeed: true,
      now: () => new Date("2026-09-07T10:00:00Z").getTime(),
    });
    await collector.ensureSchema();
    const inserts = (sql.execute as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([sqlText]) => String(sqlText).includes("INSERT INTO field_events"),
    );
    expect(inserts).toHaveLength(3);
    expect(String(inserts[0]?.[0])).toContain("ON CONFLICT (field_id, event_id) DO NOTHING");
  });

  it("demoSeed kapalıyken ensureSchema seed EKMEZ", async () => {
    const sql = makeSql();
    const collector = new FieldEventCollector(sql, undefined);
    await collector.ensureSchema();
    const inserts = (sql.execute as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([sqlText]) => String(sqlText).includes("INSERT INTO field_events"),
    );
    expect(inserts).toHaveLength(0);
  });

  it("attachChannel: hub consumer kanalından event frame'i toplar (P3)", async () => {
    const sql = makeSql();
    const collector = new FieldEventCollector(sql, undefined);
    let handler: ((peerId: string, message: unknown) => void) | undefined;
    const channel = {
      onControlMessage: (cb: (peerId: string, message: unknown) => void) => {
        handler = cb;
        return () => undefined;
      },
    } as unknown as IHubChannel;
    collector.attachChannel(channel);
    handler?.("f-1", EVENT);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(sql.execute).toHaveBeenCalledTimes(1);
  });
});
