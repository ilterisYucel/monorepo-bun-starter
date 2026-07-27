import { describe, it, expect, vi, beforeEach } from "vitest";
import { MockTransport } from "./MockTransport";
import type { TelemetryObserver } from "@gd-monorepo/shared-types";

describe("MockTransport", () => {
  let transport: MockTransport;

  beforeEach(() => {
    vi.useFakeTimers();
    transport = new MockTransport(
      [
        { name: "Voltage", unit: "V", min: 220, max: 240 },
        { name: "Current", unit: "A", min: 0, max: 100 },
      ],
      1000,
    );
  });

  it("starts in idle state", () => {
    expect(transport.connectionState()).toBe("idle");
  });

  it("transitions to connected on connect()", async () => {
    await transport.connect({ deviceId: "test-1" });
    expect(transport.connectionState()).toBe("connected");
  });

  it("generates data for each definition per tick", async () => {
    const observer: TelemetryObserver = {
      onData: vi.fn(),
      onError: vi.fn(),
      onConnectionChange: vi.fn(),
    };
    transport.subscribe(observer);
    await transport.connect({ deviceId: "test-1" });

    vi.advanceTimersByTime(1000);

    expect(observer.onData).toHaveBeenCalledTimes(1);
    const batch = (observer.onData as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(batch).toHaveLength(2);
    expect(batch[0].name).toBe("Voltage");
    expect(batch[0].deviceId).toBe("test-1");
    expect(batch[1].name).toBe("Current");
  });

  it("generates values within min/max range", async () => {
    const observer: TelemetryObserver = {
      onData: vi.fn(),
      onError: vi.fn(),
      onConnectionChange: vi.fn(),
    };
    transport.subscribe(observer);
    await transport.connect({ deviceId: "test-1" });

    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(1000);
    }

    const allCalls = (observer.onData as ReturnType<typeof vi.fn>).mock.calls;
    for (const call of allCalls) {
      const batch = call[0] as Array<{ name: string; value: number }>;
      for (const item of batch) {
        if (item.name === "Voltage") {
          expect(item.value).toBeGreaterThanOrEqual(220);
          expect(item.value).toBeLessThanOrEqual(240);
        } else if (item.name === "Current") {
          expect(item.value).toBeGreaterThanOrEqual(0);
          expect(item.value).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("stops generating after disconnect", async () => {
    const observer: TelemetryObserver = {
      onData: vi.fn(),
      onError: vi.fn(),
      onConnectionChange: vi.fn(),
    };
    transport.subscribe(observer);
    await transport.connect({ deviceId: "test-1" });

    await transport.disconnect();
    expect(transport.connectionState()).toBe("idle");

    vi.advanceTimersByTime(5000);
    expect(observer.onData).toHaveBeenCalledTimes(0);
  });

  it("unsubscribe stops receiving data", async () => {
    const observer: TelemetryObserver = {
      onData: vi.fn(),
      onError: vi.fn(),
      onConnectionChange: vi.fn(),
    };
    const unsubscribe = transport.subscribe(observer);
    await transport.connect({ deviceId: "test-1" });
    unsubscribe();

    vi.advanceTimersByTime(1000);
    expect(observer.onData).not.toHaveBeenCalled();
  });

  it("multiple observers all receive data", async () => {
    const o1: TelemetryObserver = {
      onData: vi.fn(),
      onError: vi.fn(),
      onConnectionChange: vi.fn(),
    };
    const o2: TelemetryObserver = {
      onData: vi.fn(),
      onError: vi.fn(),
      onConnectionChange: vi.fn(),
    };
    transport.subscribe(o1);
    transport.subscribe(o2);
    await transport.connect({ deviceId: "test-1" });

    vi.advanceTimersByTime(1000);

    expect(o1.onData).toHaveBeenCalled();
    expect(o2.onData).toHaveBeenCalled();
  });

  it("respects custom intervalMs", async () => {
    const fastTransport = new MockTransport(
      [{ name: "Temp", unit: "°C", min: 0, max: 50 }],
      500,
    );
    const observer: TelemetryObserver = {
      onData: vi.fn(),
      onError: vi.fn(),
      onConnectionChange: vi.fn(),
    };
    fastTransport.subscribe(observer);
    await fastTransport.connect({ deviceId: "test-1" });

    vi.advanceTimersByTime(500);
    expect(observer.onData).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(500);
    expect(observer.onData).toHaveBeenCalledTimes(2);
  });
});
