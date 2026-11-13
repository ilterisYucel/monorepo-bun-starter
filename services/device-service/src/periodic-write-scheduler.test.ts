// PeriodicWriteScheduler kanıtları — SPEC DEVICE-SERVICE-SADELESTIRME UC-2.
// AK-2.1 sayaç döngüsü · AK-2.2 dayanıklılık · AK-2.3 davranış eşdeğerliği (extraPoints).
import { afterEach, describe, expect, it, vi } from "vitest";
import type { IDevice, TelemetryData } from "@gd-monorepo/shared-types";
import { PeriodicWriteScheduler } from "./periodic-write-scheduler";

interface FakeDevice extends IDevice {
  readonly written: TelemetryData[][];
  failNext?: Error;
}

const fakeDevice = (): FakeDevice => {
  const written: TelemetryData[][] = [];
  const device: FakeDevice = {
    id: "BSC-1",
    written,
    async write(points: TelemetryData[]): Promise<void> {
      if (device.failNext !== undefined) {
        const error = device.failNext;
        device.failNext = undefined;
        throw error;
      }
      written.push(points);
    },
  } as unknown as FakeDevice;
  return device;
};

afterEach(() => {
  vi.useRealTimers();
});

describe("PeriodicWriteScheduler", () => {
  it("AK-2.1: counter her yazımda artar, 255'ten sonra 0'a döner", async () => {
    const device = fakeDevice();
    const scheduler = new PeriodicWriteScheduler(device, "BSC-1", {
      point: "Controller Heartbeat",
      intervalMs: 1000,
      mode: "counter",
    });

    await scheduler.write();
    await scheduler.write();
    expect(device.written[0]?.[0]?.value).toBe(1);
    expect(device.written[1]?.[0]?.value).toBe(2);

    for (let i = 0; i < 254; i++) await scheduler.write();
    expect(device.written.at(-1)?.[0]?.value).toBe(0); // 256 → 0
  });

  it("AK-2.2: yazım hatası servisi düşürmez; onError'a gider, sonraki yazım denenir", async () => {
    const device = fakeDevice();
    const onError = vi.fn();
    const scheduler = new PeriodicWriteScheduler(
      device,
      "BSC-1",
      { point: "Controller Heartbeat", intervalMs: 1000, mode: "counter" },
      onError,
    );

    device.failNext = new Error("bağlantı koptu");
    await expect(scheduler.write()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledTimes(1);

    await scheduler.write();
    expect(device.written).toHaveLength(1); // retry başarılı
  });

  it("AK-2.3: point + extraPoints aynı değerle yazılır (40000–40009 eşdeğerliği)", async () => {
    const device = fakeDevice();
    const scheduler = new PeriodicWriteScheduler(device, "BSC-1", {
      point: "Controller Heartbeat",
      intervalMs: 1000,
      mode: "counter",
      extraPoints: ["Controller Heartbeat 2", "Controller Heartbeat 3"],
    });

    await scheduler.write();
    const points = device.written[0] ?? [];
    expect(points.map((p) => p.name)).toEqual([
      "Controller Heartbeat",
      "Controller Heartbeat 2",
      "Controller Heartbeat 3",
    ]);
    expect(new Set(points.map((p) => p.value)).size).toBe(1);
  });

  it("fixed modu sabit değer yazar", async () => {
    const device = fakeDevice();
    const scheduler = new PeriodicWriteScheduler(device, "PCS-1", {
      point: "Keepalive",
      intervalMs: 500,
      mode: "fixed",
      value: 7,
    });
    await scheduler.write();
    await scheduler.write();
    expect(device.written.map((w) => w[0]?.value)).toEqual([7, 7]);
  });

  it("start/stop idempotent — çift start tek timer kurar", async () => {
    vi.useFakeTimers();
    const device = fakeDevice();
    const write = vi.spyOn(PeriodicWriteScheduler.prototype, "write").mockResolvedValue();
    const scheduler = new PeriodicWriteScheduler(device, "BSC-1", {
      point: "Controller Heartbeat",
      intervalMs: 1000,
      mode: "counter",
    });

    scheduler.start();
    scheduler.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(write).toHaveBeenCalledTimes(1);
    scheduler.stop();
    scheduler.stop();
    await vi.advanceTimersByTimeAsync(2000);
    expect(write).toHaveBeenCalledTimes(1);
    write.mockRestore();
  });

  it("geçersiz config constructor'da fail-fast", () => {
    const device = fakeDevice();
    expect(
      () => new PeriodicWriteScheduler(device, "BSC-1", { point: "x", intervalMs: 0, mode: "counter" }),
    ).toThrow(/geçersiz intervalMs/);
    expect(
      () => new PeriodicWriteScheduler(device, "BSC-1", { point: "x", intervalMs: 1000, mode: "fixed" }),
    ).toThrow(/value zorunlu/);
  });
});
