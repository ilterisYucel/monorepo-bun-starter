import { describe, it, expect, vi } from "vitest";
import type { ISqlDatabase } from "@gd-monorepo/core";
import type { HubConsumerClient } from "../hub-tunnel";
import type { EventMessage } from "./event-message";
import { FieldEventCollector } from "./field-event-collector";

/**
 * FieldEventCollector sözleşmesi (SPEC UC-5 — HTTP pull):
 * - poll: hub'dan `peerType=field` + connected peer'ları keşfeder; her biri
 *   için `GET /api/events?after=<cursor>&limit=<batch>` çağırır.
 * - İlk tur 1 saatlik backlog; sonraki turlar cursor - 2 sn örtüşme.
 * - Olaylar (field_id, event_id) dedupe INSERT ile yazılır; whitelist dışı
 *   olaylar YOK sayılır (savunma katmanı).
 * - Peer hatası turu atlar; cursor ilerlemez (fail-safe).
 * - list: JOIN ile saha adı + after filtresi; countSince: sayı.
 */

const NOW = () => new Date("2026-10-22T10:00:00Z").getTime();

function makeSql(): ISqlDatabase {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue(undefined),
    health: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
  } as unknown as ISqlDatabase;
}

interface Peer {
  peerId: string;
  peerType: string;
  status: string;
  services: Array<{ id: string }>;
}

interface AccessCall {
  peerId: string;
  serviceId: string;
  path: string;
}

function makeClient(
  peers: Peer[],
  impl: (call: AccessCall) => Promise<Response> = async () =>
    Response.json({ events: [] }),
): { client: HubConsumerClient; calls: AccessCall[] } {
  const calls: AccessCall[] = [];
  const client = {
    peers: vi.fn(async () => peers),
    access: vi.fn(async (call: AccessCall) => {
      calls.push(call);
      return impl(call);
    }),
  } as unknown as HubConsumerClient;
  return { client, calls };
}

const FIELD_PEER: Peer = {
  peerId: "f-1",
  peerType: "field",
  status: "connected",
  services: [{ id: "field-api" }],
};

const EVENT: EventMessage = {
  eventId: "f-1:42",
  timestamp: "2026-10-22T09:59:00.000Z",
  level: "error",
  category: "app",
  eventCode: "device_alarm",
  message: "Voltage alarmi",
  context: { deviceId: "bsc-1" },
};

describe("FieldEventCollector (UC-5 — HTTP pull)", () => {
  it("field peer'ı keşfeder, backlog cursor'ı ile çeker ve dedupe INSERT yazar", async () => {
    const sql = makeSql();
    const { client, calls } = makeClient([FIELD_PEER], async () =>
      Response.json({ events: [EVENT] }),
    );
    const collector = new FieldEventCollector(sql, undefined, {
      client,
      serviceId: "field-api",
      now: NOW,
    });

    await collector.poll();

    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      peerId: "f-1",
      serviceId: "field-api",
    });
    // İlk tur: 1 saatlik backlog (now - 3600000).
    expect(calls[0]?.path).toContain(
      encodeURIComponent("2026-10-22T09:00:00.000Z"),
    );
    expect(calls[0]?.path).toContain("limit=200");
    expect(sql.execute).toHaveBeenCalledWith(
      expect.stringContaining("ON CONFLICT (field_id, event_id) DO NOTHING"),
      expect.arrayContaining(["f-1", "f-1:42", "device_alarm"]),
    );
  });

  it("whitelist dışı olay yok sayılır", async () => {
    const sql = makeSql();
    const { client } = makeClient([FIELD_PEER], async () =>
      Response.json({ events: [{ ...EVENT, eventCode: "ws_connection_lost" }] }),
    );
    const collector = new FieldEventCollector(sql, undefined, {
      client,
      now: NOW,
    });

    await collector.poll();
    expect(sql.execute).not.toHaveBeenCalled();
  });

  it("ikinci tur cursor - 2 sn örtüşmesinden devam eder", async () => {
    const sql = makeSql();
    const { client, calls } = makeClient([FIELD_PEER], async () =>
      Response.json({ events: [EVENT] }),
    );
    const collector = new FieldEventCollector(sql, undefined, {
      client,
      now: NOW,
    });

    await collector.poll();
    await collector.poll();

    expect(calls).toHaveLength(2);
    // last event ts = 09:59:00 → 2 sn örtüşme = 09:58:58
    expect(calls[1]?.path).toContain(
      encodeURIComponent("2026-10-22T09:58:58.000Z"),
    );
  });

  it("peer erişilemezse tur atlanır, cursor ilerlemez", async () => {
    const sql = makeSql();
    const { client, calls } = makeClient([FIELD_PEER], async () => {
      throw new Error("ECONNREFUSED");
    });
    const collector = new FieldEventCollector(sql, undefined, {
      client,
      now: NOW,
    });

    await expect(collector.poll()).resolves.toBeUndefined();
    await collector.poll();
    expect(calls[1]?.path).toContain(
      encodeURIComponent("2026-10-22T09:00:00.000Z"),
    );
  });

  it("bağlı olmayan field peer'ı atlanır", async () => {
    const sql = makeSql();
    const { client, calls } = makeClient([
      { ...FIELD_PEER, status: "disconnected" },
      { peerId: "c-1", peerType: "container", status: "connected", services: [] },
    ]);
    const collector = new FieldEventCollector(sql, undefined, {
      client,
      now: NOW,
    });

    await collector.poll();
    expect(calls).toHaveLength(0);
  });

  it("demoSeed açıkken ensureSchema 3 örnek bildirim eker (idempotent)", async () => {
    const sql = makeSql();
    const collector = new FieldEventCollector(sql, undefined, {
      demoSeed: true,
      now: NOW,
    });
    await collector.ensureSchema();
    const inserts = (sql.execute as ReturnType<typeof vi.fn>).mock.calls.filter(
      ([sqlText]) => String(sqlText).includes("INSERT INTO field_events"),
    );
    expect(inserts).toHaveLength(3);
    expect(String(inserts[0]?.[0])).toContain(
      "ON CONFLICT (field_id, event_id) DO NOTHING",
    );
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
});
