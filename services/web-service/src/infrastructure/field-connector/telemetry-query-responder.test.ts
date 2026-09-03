import { describe, it, expect, vi } from "vitest";
import { TelemetryQueryResponder } from "./telemetry-query-responder";
import type { FieldConnector } from "@gd-monorepo/ws-tunnel";
import type { ITelemetrySeriesSource } from "./interfaces";
import type { TelemetryData } from "@gd-monorepo/shared-types";

/**
 * TelemetryQueryResponder sözleşmesi (Faz 5.1 B2):
 *
 * - `telemetry-query` alınınca `ITelemetrySeriesSource.series()` çağrılır ve
 *   sonuç AYNI kanaldan `telemetry-result` frame'iyle döner.
 * - Geçersiz sorgu (zod) → `telemetry-query-error` (TimescaleDB'ye ulaşmaz).
 * - Kaynak hatası → `telemetry-query-error` (kademeli bozulma — kanal açık kalır).
 * - Başka tipte mesajlar yok sayılır.
 * - start() tekrar çağrılırsa eski abonelik sökülmez (idempotent);
 *   stop() söküp yeniden start'a izin verir.
 */
describe("TelemetryQueryResponder (Faz 5.1 B2)", () => {
  function makeConnector() {
    const subscribers = new Set<(message: unknown) => void>();
    const sent: unknown[] = [];
    const connector = {
      onMessage: vi.fn((fn: (message: unknown) => void) => {
        subscribers.add(fn);
        return () => subscribers.delete(fn);
      }),
      sendControl: vi.fn((frame: unknown) => {
        sent.push(frame);
      }),
    };
    return {
      connector: connector as unknown as FieldConnector,
      subscribers,
      sent,
      emit: (message: unknown) => {
        subscribers.forEach((fn) => fn(message));
      },
    };
  }

  const point = (deviceId: string, name: string): TelemetryData => ({
    deviceId,
    name,
    value: 1,
    unit: "",
    timestamp: "2026-08-25T10:00:00.000Z",
  });

  const validQuery = {
    type: "telemetry-query",
    queryId: "q-1",
    from: "2026-08-25T00:00:00.000Z",
    to: "2026-08-25T12:00:00.000Z",
    points: 120,
  };

  function makeSource(result: TelemetryData[] | Error): ITelemetrySeriesSource {
    return {
      series: vi.fn(async () => {
        if (result instanceof Error) throw result;
        return result;
      }),
    };
  }

  it("geçerli sorgu → series() çağrılır ve telemetry-result döner", async () => {
    const { connector, sent, emit } = makeConnector();
    const source = makeSource([point("BSC-1", "BSC SOC")]);
    const responder = new TelemetryQueryResponder(connector, source);
    responder.start();

    emit(validQuery);
    await vi.waitFor(() => expect(sent.length).toBe(1));

    expect(source.series).toHaveBeenCalledWith({
      from: new Date("2026-08-25T00:00:00.000Z"),
      to: new Date("2026-08-25T12:00:00.000Z"),
      points: 120,
    });
    expect(sent[0]).toEqual({
      type: "telemetry-result",
      queryId: "q-1",
      data: [point("BSC-1", "BSC SOC")],
    });
  });

  it("deviceIds/names opsiyoneldir — varsa sorguya taşınır", async () => {
    const { connector, sent, emit } = makeConnector();
    const source = makeSource([]);
    const responder = new TelemetryQueryResponder(connector, source);
    responder.start();

    emit({ ...validQuery, deviceIds: ["BSC-1", "PCS-1"], names: ["BSC SOC"] });
    await vi.waitFor(() => expect(sent.length).toBe(1));

    expect(source.series).toHaveBeenCalledWith({
      from: new Date(validQuery.from),
      to: new Date(validQuery.to),
      points: 120,
      deviceIds: ["BSC-1", "PCS-1"],
      names: ["BSC SOC"],
    });
  });

  it("geçersiz sorgu → telemetry-query-error (kaynağa ulaşılmaz)", async () => {
    const { connector, sent, emit } = makeConnector();
    const source = makeSource([]);
    const responder = new TelemetryQueryResponder(connector, source);
    responder.start();

    emit({ type: "telemetry-query", queryId: "q-bad", from: "yok", to: 42, points: 0 });
    await vi.waitFor(() => expect(sent.length).toBe(1));

    expect(source.series).not.toHaveBeenCalled();
    expect(sent[0]).toEqual({
      type: "telemetry-query-error",
      queryId: "q-bad",
      message: "gecersiz telemetry-query",
    });
  });

  it("queryId'siz geçersiz mesaj → queryId 'unknown'", async () => {
    const { connector, sent, emit } = makeConnector();
    const source = makeSource([]);
    const responder = new TelemetryQueryResponder(connector, source);
    responder.start();

    emit({ type: "telemetry-query" });
    await vi.waitFor(() => expect(sent.length).toBe(1));

    expect(sent[0]).toMatchObject({ type: "telemetry-query-error", queryId: "unknown" });
  });

  it("kaynak hatası → telemetry-query-error", async () => {
    const { connector, sent, emit } = makeConnector();
    const source = makeSource(new Error("db down"));
    const responder = new TelemetryQueryResponder(connector, source);
    responder.start();

    emit(validQuery);
    await vi.waitFor(() => expect(sent.length).toBe(1));

    expect(sent[0]).toMatchObject({
      type: "telemetry-query-error",
      queryId: "q-1",
      message: "db down",
    });
  });

  it("farklı tipte mesajlar yok sayılır", async () => {
    const { connector, sent, emit } = makeConnector();
    const source = makeSource([]);
    const responder = new TelemetryQueryResponder(connector, source);
    responder.start();

    emit({ type: "stream-open", streamId: 1 });
    await new Promise((r) => setTimeout(r, 20));
    expect(sent.length).toBe(0);
    expect(source.series).not.toHaveBeenCalled();
  });

  it("start idempotenttir; stop aboneliği söker", async () => {
    const { connector, subscribers, sent, emit } = makeConnector();
    const responder = new TelemetryQueryResponder(connector, makeSource([]));
    responder.start();
    responder.start();
    expect(connector.onMessage).toHaveBeenCalledTimes(1);
    expect(subscribers.size).toBe(1);

    responder.stop();
    emit(validQuery);
    await new Promise((r) => setTimeout(r, 20));
    expect(sent.length).toBe(0);

    responder.start();
    expect(subscribers.size).toBe(1);
  });
});
