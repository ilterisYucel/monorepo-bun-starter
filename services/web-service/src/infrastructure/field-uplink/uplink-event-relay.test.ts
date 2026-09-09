import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ISqlDatabase } from "@gd-monorepo/core";
import type { ITunnelChannel } from "@gd-monorepo/ws-tunnel";
import { UplinkEventRelay, UPLINK_EVENT_WHITELIST } from "./uplink-event-relay";

/**
 * UplinkEventRelay sözleşmesi (Boss Faz 5):
 * - İlk tur son 1 saatlik backlog; sonraki turlar ts-cursor deltası (2 sn örtüşme)
 * - `eventId = <fieldId>:<correlation_id>` (zincir restart'ında seq ÇAKIŞMAZ)
 * - Whitelist dışı satırlar elenir; uplink kapalıyken sendControl no-op
 */

const NOW = new Date("2026-09-08T12:00:00Z").getTime();

const row = (overrides: Record<string, unknown>): Record<string, unknown> => ({
  ts: new Date(NOW),
  level: "error",
  category: "app",
  event_code: "device_alarm",
  message: "Voltage alarmi",
  context: { deviceId: "bsc-1" },
  seq: 42,
  correlation_id: "corr-42",
  service: "device-service",
  ...overrides,
});

function makeSql(
  batches: Array<unknown[]>,
): ISqlDatabase & { queryCalls: Array<[string, unknown[]]> } {
  let index = 0;
  const queryCalls: Array<[string, unknown[]]> = [];
  const query = vi.fn((sqlText: string, params: unknown[]) => {
    queryCalls.push([sqlText, params]);
    const batch = batches[Math.min(index, batches.length - 1)] ?? [];
    index += 1;
    return Promise.resolve(batch);
  });
  return {
    query,
    queryCalls,
    execute: vi.fn(),
    queryOne: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
  } as unknown as ISqlDatabase & { queryCalls: Array<[string, unknown[]]> };
}

function makeConnector() {
  return {
    sendControl: vi.fn(),
    sendBinary: vi.fn(),
    onMessage: vi.fn(() => () => undefined),
    onBinaryFrame: vi.fn(() => () => undefined),
  } as unknown as ITunnelChannel & { sendControl: ReturnType<typeof vi.fn> };
}

describe("UplinkEventRelay (Faz 5)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("ilk tur backlog (son 1 saat) gönderir — eventId correlation_id ile", async () => {
    const sql = makeSql([
      [
        row({ ts: new Date(NOW - 30 * 60_000), correlation_id: "corr-1" }),
        row({ ts: new Date(NOW - 10 * 60_000), correlation_id: "corr-2" }),
      ],
      [],
    ]);
    const connector = makeConnector();
    const relay = new UplinkEventRelay(connector, sql, "f-1", undefined, {
      now: () => NOW,
    });
    await relay.poll();
    expect(connector.sendControl).toHaveBeenCalledTimes(2);
    expect(connector.sendControl.mock.calls[0]?.[0]).toMatchObject({
      type: "event",
      eventId: "f-1:corr-1",
      eventCode: "device_alarm",
      context: { deviceId: "bsc-1" },
    });
    // İlk tur parametresi: son 1 saat (12:00 - 1s)
    expect(sql.queryCalls[0]?.[1][0]).toBe(new Date(NOW - 60 * 60_000).toISOString());
  });

  it("sonraki turlar yalnızca cursor sonrasını gönderir (2 sn örtüşme payı)", async () => {
    const sql = makeSql([[], [row({ ts: new Date(NOW + 5_000), correlation_id: "corr-new" })]]);
    const connector = makeConnector();
    const relay = new UplinkEventRelay(connector, sql, "f-1", undefined, {
      now: () => NOW,
    });
    await relay.poll(); // backlog turu — boş; cursor = sinceMs
    connector.sendControl.mockClear();
    await relay.poll(); // delta turu
    expect(connector.sendControl).toHaveBeenCalledTimes(1);
    expect(connector.sendControl.mock.calls[0]?.[0]).toMatchObject({
      eventId: "f-1:corr-new",
    });
    // delta parametresi: cursor - 2 sn (ör. ilk tur başlangıcı)
    expect(new Date(sql.queryCalls[1]?.[1][0] as string).getTime()).toBe(
      NOW - 60 * 60_000 - 2_000,
    );
  });

  it("whitelist dışı satırlar elenir (log gürültüsü aktarılmaz)", async () => {
    const sql = makeSql([
      [
        row({ correlation_id: "corr-x", event_code: "ws_connection_lost" }),
        row({ correlation_id: "corr-y", event_code: "device_alarm_cleared" }),
      ],
      [],
    ]);
    const connector = makeConnector();
    const relay = new UplinkEventRelay(connector, sql, "f-1", undefined, {
      now: () => NOW,
    });
    await relay.poll();
    const sent = connector.sendControl.mock.calls.map((c) => c[0]);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ eventCode: "device_alarm_cleared" });
  });

  it("correlation_id yoksa eventId seq'e düşer", async () => {
    const sql = makeSql([[row({ correlation_id: null, seq: 7 })], []]);
    const connector = makeConnector();
    const relay = new UplinkEventRelay(connector, sql, "f-1", undefined, {
      now: () => NOW,
    });
    await relay.poll();
    expect(connector.sendControl.mock.calls[0]?.[0]).toMatchObject({
      eventId: "f-1:7",
    });
  });

  it("whitelist varsayılanı alarm + oturum audit'idir", () => {
    expect(UPLINK_EVENT_WHITELIST).toEqual([
      "device_alarm",
      "device_alarm_cleared",
      "alarm_resolved",
      "session_open",
      "session_end",
    ]);
  });

  it("start → 10 sn interval; stop → döngü biter", async () => {
    const sql = makeSql([[], [row({ correlation_id: "corr-timer" })]]);
    const connector = makeConnector();
    const relay = new UplinkEventRelay(connector, sql, "f-1", undefined, {
      now: () => NOW,
    });
    relay.start();
    await vi.advanceTimersByTimeAsync(10_100);
    expect(connector.sendControl).toHaveBeenCalled();
    relay.stop();
    connector.sendControl.mockClear();
    await vi.advanceTimersByTimeAsync(60_000);
    expect(connector.sendControl).not.toHaveBeenCalled();
  });
});
