import { describe, it, expect, vi, afterEach } from "vitest";
import { HeartbeatWriter } from "./heartbeat-writer";
import type { IDevice } from "@gd-monorepo/shared-types";

function fakeDevice(): IDevice {
  return {
    id: "BSC-1",
    write: vi.fn().mockResolvedValue(undefined),
  } as unknown as IDevice;
}

/**
 * KAPANIŞ — HeartbeatWriter (LGES BSC 40000): 1 sn'lik artan sayaç yazımı.
 * Yazılmazsa BSC ~20 sn sonra tüm rack kontaktörlerini açar (C2B / C4).
 */
describe("HeartbeatWriter", () => {
  afterEach(() => vi.useRealTimers());

  it("writeBeat artan sayaç ve telemetri adını yazar", async () => {
    const device = fakeDevice();
    const w = new HeartbeatWriter(device, "BSC-1", {
      telemetry: "Controller Heartbeat",
      intervalMs: 1000,
    });
    await w.writeBeat();
    await w.writeBeat();
    const calls = (device.write as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0]![0][0]).toMatchObject({
      deviceId: "BSC-1",
      name: "Controller Heartbeat",
      value: 1,
    });
    expect(calls[1]![0][0].value).toBe(2);
  });

  it("sayaç 255 sonrası 0'a döner (0-255 döngü)", async () => {
    const device = fakeDevice();
    const w = new HeartbeatWriter(device, "BSC-1", {
      telemetry: "Controller Heartbeat",
      intervalMs: 1000,
    });
    for (let i = 0; i < 255; i++) await w.writeBeat();
    const calls = (device.write as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[254]![0][0].value).toBe(255);
    await w.writeBeat();
    expect(calls[255]![0][0].value).toBe(0);
  });

  it("yazım hatası onError'a gider, servisi düşürmez", async () => {
    const device = fakeDevice();
    (device.write as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("bus-error"),
    );
    const onError = vi.fn();
    const w = new HeartbeatWriter(
      device,
      "BSC-1",
      { telemetry: "Controller Heartbeat", intervalMs: 1000 },
      onError,
    );
    await expect(w.writeBeat()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("R2.3: extraTelemetries (40001–40009) aynı sayaçla yazılır", async () => {
    const device = fakeDevice();
    const w = new HeartbeatWriter(device, "BSC-1", {
      telemetry: "Controller Heartbeat",
      intervalMs: 1000,
      extraTelemetries: ["Controller Heartbeat 2", "Controller Heartbeat 3"],
    });
    await w.writeBeat();
    const points = (device.write as unknown as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Array<{ name: string; value: number }>;
    expect(points).toHaveLength(3);
    expect(points.map((p) => p.name)).toEqual([
      "Controller Heartbeat",
      "Controller Heartbeat 2",
      "Controller Heartbeat 3",
    ]);
    expect(points.every((p) => p.value === 1)).toBe(true);
  });

  it("start/stop idempotent — interval periyodik yazar", async () => {
    vi.useFakeTimers();
    const device = fakeDevice();
    const w = new HeartbeatWriter(device, "BSC-1", {
      telemetry: "Controller Heartbeat",
      intervalMs: 1000,
    });
    w.start();
    w.start();
    await vi.advanceTimersByTimeAsync(3000);
    const write = device.write as unknown as ReturnType<typeof vi.fn>;
    expect(write).toHaveBeenCalledTimes(3);
    w.stop();
    w.stop();
    await vi.advanceTimersByTimeAsync(3000);
    expect(write).toHaveBeenCalledTimes(3);
  });
});
