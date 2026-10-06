import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ITelemetryTransport, TelemetryObserver, TelemetryData } from "@gd-monorepo/shared-types";
import { useTelemetryStream } from "./useTelemetryStream";

/** Multipleks destekleyen sahte transport. */
function fakeTransport(): ITelemetryTransport & {
  observer: TelemetryObserver | undefined;
  added: string[][];
  removed: string[][];
  namesCalls: (readonly string[] | undefined)[];
} {
  const added: string[][] = [];
  const removed: string[][] = [];
  const namesCalls: (readonly string[] | undefined)[] = [];
  let observer: TelemetryObserver | undefined;
  return {
    added,
    removed,
    namesCalls,
    get observer() {
      return observer;
    },
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    connectionState: () => "connected",
    subscribe: (o: TelemetryObserver) => {
      observer = o;
      return () => {
        observer = undefined;
      };
    },
    addDevices: (ids: readonly string[], names?: readonly string[]) => {
      added.push([...ids]);
      namesCalls.push(names);
    },
    removeDevices: (ids: readonly string[]) => removed.push([...ids]),
  };
}

function entry(deviceId: string, value: number): TelemetryData {
  return {
    deviceId,
    name: "SOC",
    value,
    unit: "%",
    description: "",
    timestamp: "2026-10-05T10:00:00.000Z",
  } as TelemetryData;
}

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
    cb(0);
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useTelemetryStream — çok-abone", () => {
  it("mount'ta addDevices + connect; unmount'ta removeDevices (disconnect DEĞİL)", () => {
    const transport = fakeTransport();
    const { unmount } = renderHook(() =>
      useTelemetryStream({ transport, deviceIds: ["BSC-1", "CB-1"] }),
    );

    expect(transport.added).toEqual([["BSC-1", "CB-1"]]);
    expect(transport.connect).toHaveBeenCalled();
    unmount();
    expect(transport.removed).toEqual([["BSC-1", "CB-1"]]);
    expect(transport.disconnect).not.toHaveBeenCalled();
  });

  it("observer verisi hook çıktısına yansır", () => {
    const transport = fakeTransport();
    const { result } = renderHook(() =>
      useTelemetryStream({ transport, deviceIds: ["BSC-1"] }),
    );

    act(() => {
      transport.observer?.onData([entry("BSC-1", 80)]);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0]!.value).toBe(80);
  });

  it("abone OLUNMAYAN cihazın verisi buffer'a alınmaz (filtreleme)", () => {
    const transport = fakeTransport();
    const { result } = renderHook(() =>
      useTelemetryStream({ transport, deviceIds: ["HVAC-1"] }),
    );

    act(() => {
      // Tek batch'te hem HVAC hem BSC satırı gelir (tek soket, tüm cihazlar).
      transport.observer?.onData([entry("HVAC-1", 22), entry("BSC-1", 80)]);
    });

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0]!.deviceId).toBe("HVAC-1");
  });

  it("names verilirse addDevices'e iletilir (sunucu filtresi)", () => {
    const transport = fakeTransport();
    renderHook(() =>
      useTelemetryStream({ transport, deviceIds: ["BSC-1"], names: ["SOC", "Voltage"] }),
    );

    expect(transport.namesCalls[0]).toEqual(["SOC", "Voltage"]);
  });
});
