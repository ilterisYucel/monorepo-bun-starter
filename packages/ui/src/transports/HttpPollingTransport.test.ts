import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HttpPollingTransport } from "./HttpPollingTransport";
import type { TelemetryObserver, TelemetryData } from "@gd-monorepo/shared-types";

/**
 * HttpPollingTransport sözleşmesi (2026-08-30 — T2):
 * - connect: anında ilk fetch + interval; state "connected".
 * - Başarılı fetch → onData (telemetries/data fallback'iyle).
 * - HTTP hatası → onError, bağlantı state'i BOZULMAZ (kademeli bozulma).
 * - getToken → Authorization header.
 * - disconnect: interval iptal, state "idle", fetch durur.
 * - subscribe geri dönüş fonksiyonu observer'ı çıkarır.
 */

function makeObserver(): TelemetryObserver {
  return {
    onData: vi.fn(),
    onError: vi.fn(),
    onConnectionChange: vi.fn(),
  };
}

const telemetry = (): TelemetryData[] => [
  {
    deviceId: "BSC-1",
    name: "SOC",
    value: 88,
    description: "",
    unit: "%",
    timestamp: "2026-08-30T12:00:00Z",
  },
];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("HttpPollingTransport (T2)", () => {
  it("connect: ilk fetch + interval kurulur; state connected yayınlanır", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ telemetries: [] }), { status: 200 }),
    );
    const transport = new HttpPollingTransport({ endpoint: "/api/t" });
    const observer = makeObserver();
    transport.subscribe(observer);

    await transport.connect({ deviceId: "BSC-1" });

    expect(transport.connectionState()).toBe("connected");
    expect(observer.onConnectionChange).toHaveBeenCalledWith("connected");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(5001);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("deviceIds=BSC-1");

    await transport.disconnect();
  });

  it("başarılı fetch onData'yı besler (telemetries fallback data)", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ telemetries: telemetry() }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: telemetry() }), { status: 200 }),
      );
    const transport = new HttpPollingTransport({ endpoint: "/api/t" });
    const observer = makeObserver();
    transport.subscribe(observer);

    await transport.connect({ deviceId: "BSC-1" });
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.onData).toHaveBeenCalledWith(telemetry());

    vi.advanceTimersByTime(5001);
    await vi.advanceTimersByTimeAsync(0);
    expect(observer.onData).toHaveBeenCalledTimes(2);
    await transport.disconnect();
  });

  it("HTTP 500 → onError; state BOZULMAZ (kademeli bozulma)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("boom", { status: 500 }),
    );
    const transport = new HttpPollingTransport({ endpoint: "/api/t" });
    const observer = makeObserver();
    transport.subscribe(observer);

    await transport.connect({ deviceId: "BSC-1" });
    expect(observer.onError).toHaveBeenCalledWith(expect.any(Error));
    expect(transport.connectionState()).toBe("connected");
    await transport.disconnect();
  });

  it("getToken Authorization header olarak eklenir", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ telemetries: [] }), { status: 200 }),
    );
    const transport = new HttpPollingTransport({
      endpoint: "/api/t",
      getToken: () => "tok-1",
    });

    await transport.connect({ deviceId: "BSC-1" });

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as
      | Record<string, string>
      | undefined;
    expect(headers?.Authorization).toBe("Bearer tok-1");
    await transport.disconnect();
  });

  it("disconnect: interval durur + state idle", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ telemetries: [] }), { status: 200 }),
    );
    const transport = new HttpPollingTransport({ endpoint: "/api/t" });
    await transport.connect({ deviceId: "BSC-1" });
    const calls = fetchMock.mock.calls.length;

    await transport.disconnect();
    vi.advanceTimersByTime(15000);

    expect(fetchMock.mock.calls.length).toBe(calls);
    expect(transport.connectionState()).toBe("idle");
  });

  it("subscribe geri dönüşü observer'ı çıkarır", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ telemetries: telemetry() }), { status: 200 }),
    );
    const transport = new HttpPollingTransport({ endpoint: "/api/t" });
    const observer = makeObserver();
    const unsubscribe = transport.subscribe(observer);
    unsubscribe();

    await transport.connect({ deviceId: "BSC-1" });
    expect(observer.onData).not.toHaveBeenCalled();
    await transport.disconnect();
  });
});
