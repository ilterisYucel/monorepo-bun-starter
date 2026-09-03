import { describe, it, expect, vi } from "vitest";
import { TimescaleSink } from "./timescale-sink";
import type { LogEvent } from "../types";

/**
 * T0.4 — TimescaleSink kontratı:
 * - `log_events` tablosuna çok satırlı tek INSERT yazar (12 kolon, unnest).
 * - Boş batch = no-op (executor çağrılmaz).
 * - Executor hatası yukarı fırlatılır (fail-closed'u tetikler).
 */

function event(seq: number): LogEvent {
  return {
    ts: "2026-08-24T10:00:00.000Z",
    level: "error",
    category: "app",
    eventCode: "modbus_read_failed",
    message: "timeout",
    context: { deviceId: "bsc-1" },
    correlationId: "c",
    service: "svc",
    host: "h",
    seq,
    prevHash: "0".repeat(64),
    signature: "a".repeat(64),
  };
}

describe("TimescaleSink (T0.4)", () => {
  it("name() 'timescale' döner", () => {
    const sink = new TimescaleSink({ executor: { execute: vi.fn() } });
    expect(sink.name()).toBe("timescale");
  });

  it("çok satırlı tek INSERT üretir — kolon sayısı 12, parametre 12 dizi", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const sink = new TimescaleSink({ executor: { execute } });
    await sink.write([event(1), event(2)]);

    expect(execute).toHaveBeenCalledTimes(1);
    const [sql, params] = execute.mock.calls[0] as [string, unknown[][]];
    expect(sql).toContain("INSERT INTO log_events");
    expect(sql).toContain("unnest");
    expect(params).toHaveLength(12);
    expect(params[0]).toHaveLength(2);
  });

  it("boş batch no-op", async () => {
    const execute = vi.fn();
    const sink = new TimescaleSink({ executor: { execute } });
    await sink.write([]);
    expect(execute).not.toHaveBeenCalled();
  });

  it("opsiyonel alanlar eksikse NULL ile yazılır", async () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const sink = new TimescaleSink({ executor: { execute } });
    const bare: LogEvent = {
      ts: "2026-08-24T10:00:00.000Z",
      level: "info",
      category: "app",
      eventCode: "service_started",
      message: "test",
      seq: 1,
      prevHash: "0".repeat(64),
      signature: "a".repeat(64),
    };
    await sink.write([bare]);
    const [, params] = execute.mock.calls[0] as [string, unknown[][]];
    expect(params[5]).toEqual(["{}"]);
    expect(params[6]).toEqual([null]);
    expect(params[7]).toEqual([null]);
    expect(params[8]).toEqual([null]);
  });

  it("executor hatası fırlatılır", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("connection lost"));
    const sink = new TimescaleSink({ executor: { execute } });
    await expect(sink.write([event(1)])).rejects.toThrow("connection lost");
  });

  it("close() hata fırlatmaz (bağlantı executor sahibinde)", async () => {
    const sink = new TimescaleSink({ executor: { execute: vi.fn() } });
    await expect(sink.close()).resolves.toBeUndefined();
  });
});
