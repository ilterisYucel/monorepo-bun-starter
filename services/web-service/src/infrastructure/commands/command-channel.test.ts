import { describe, it, expect, vi, beforeEach } from "vitest";
import type { IMessageQueue } from "@gd-monorepo/core";
import type { DeviceConfigFile } from "@gd-monorepo/shared-types";
import { CommandJobBuilder } from "@gd-monorepo/platform-commands";
import { CommandChannel } from "./command-channel";
import { DeviceRegistryTargets } from "./device-registry-targets";
import type { DeviceRegistry } from "../persistence/device-registry";

/**
 * CommandChannel + DeviceRegistryTargets sözleşmesi (KOMUT §3/§5.1, B3):
 *
 * - execute: isimli komut job'ı (builder) + executeAndWait; çözümleme hatası
 *   → fail (throw YOK); ham telemetries fallback; beklenmeyen throw → fail.
 * - schedule: stop komutu builder'dan çözülür + addJob delay (hata THROW —
 *   best-effort çağıran audit'ler).
 * - targets: resolveAvailable type filtreli; filterAvailable online kesişimi.
 */

const demoConfig: DeviceConfigFile = {
  deviceId: "BSC-1",
  name: "BSC 1",
  manufacturer: "LG",
  model: "BSC",
  protocol: "MODBUS",
  type: "bsc",
  connection: { host: "127.0.0.1" },
  telemetry: [],
  commands: {
    stop: {
      telemetries: [{ name: "Command Request", value: 3 }],
      timeoutMs: 2500,
      validate: { reads: [{ name: "Request Acknowledge", expect: 2 }] },
    },
  },
};

function makeMq(overrides: Partial<IMessageQueue> = {}): IMessageQueue {
  return {
    addJob: vi.fn().mockResolvedValue(undefined),
    executeAndWait: vi.fn().mockResolvedValue({ success: true }),
    addRepeatableJob: vi.fn(),
    addRepeatableJobEvery: vi.fn(),
    registerWorker: vi.fn(),
    registerWorkerFor: vi.fn(),
    close: vi.fn(),
    queueStatus: vi.fn(),
    queueStats: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function makeChannel(overrides: Partial<{ mq: IMessageQueue }> = {}): {
  channel: CommandChannel;
  mq: IMessageQueue;
} {
  const mq = overrides.mq ?? makeMq();
  const builder = new CommandJobBuilder({
    source: { load: (id: string) => (id === "BSC-1" ? demoConfig : undefined) },
  });
  return { channel: new CommandChannel({ builder, mq }), mq };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CommandChannel", () => {
  it("execute: isimli komut job üretir + executeAndWait; sonuç ok", async () => {
    const { channel, mq } = makeChannel();
    const result = await channel.execute({
      deviceId: "BSC-1",
      command: "stop",
    });
    expect(result).toEqual({ deviceId: "BSC-1", command: "stop", success: true });
    const job = (mq.executeAndWait as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(job.type).toBe("COMMAND_DEVICE");
    expect(job.telemetries[0]).toMatchObject({ name: "Command Request", value: 3 });
    expect(job.validate).toEqual({
      minWaitMs: undefined,
      timeoutMs: 2500,
      reads: [{ name: "Request Acknowledge", expect: 2 }],
    });
  });

  it("execute: çözümleme hatası (bilinmeyen komut) → fail — throw YOK", async () => {
    const { channel } = makeChannel();
    const result = await channel.execute({
      deviceId: "BSC-1",
      command: "yok",
    });
    expect(result.success).toBe(false);
    expect(result.reason).toBe("command_not_found");
  });

  it("execute: ham telemetries fallback'i (komutsuz adım)", async () => {
    const { channel, mq } = makeChannel();
    const result = await channel.execute({
      deviceId: "BSC-1",
      telemetries: [{ name: "Command Request", value: 1 }],
    });
    expect(result.success).toBe(true);
    const job = (mq.executeAndWait as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(job.telemetries[0]).toMatchObject({ name: "Command Request", value: 1 });
    expect(job.deviceId).toBe("BSC-1");
  });

  it("execute: kuyruk hatası → fail sonucu (throw YOK — kademeli)", async () => {
    const mq = makeMq({
      executeAndWait: vi.fn().mockRejectedValue(new Error("redis yok")),
    });
    const { channel } = makeChannel({ mq });
    const result = await channel.execute({ deviceId: "BSC-1", command: "stop" });
    expect(result.success).toBe(false);
  });

  it("execute: executeAndWait success=false → fail + reason taşınır", async () => {
    const mq = makeMq({
      executeAndWait: vi.fn().mockResolvedValue({
        success: false,
        reason: "komut basarisiz",
      }),
    });
    const { channel } = makeChannel({ mq });
    const result = await channel.execute({ deviceId: "BSC-1", command: "stop" });
    expect(result).toEqual({
      deviceId: "BSC-1",
      command: "stop",
      success: false,
      reason: "komut basarisiz",
    });
  });

  it("schedule: stop komutu builder'dan çözülür + addJob delay", async () => {
    const { channel, mq } = makeChannel();
    await channel.schedule({ deviceId: "BSC-1", command: "stop" }, 60000);
    const [job, opts] = (mq.addJob as ReturnType<typeof vi.fn>).mock.calls[0] as [
      unknown,
      { delay: number },
    ];
    expect(opts).toEqual({ delay: 60000 });
    expect((job as { telemetries: unknown[] }).telemetries[0]).toMatchObject({
      name: "Command Request",
      value: 3,
    });
  });

  it("schedule: bilinmeyen komut → THROW (best-effort çağıran audit'ler)", async () => {
    const { channel } = makeChannel();
    await expect(
      channel.schedule({ deviceId: "BSC-1", command: "yok" }, 1000),
    ).rejects.toThrow();
  });
});

describe("DeviceRegistryTargets", () => {
  function registry(devices: Array<{ id: string; type: string }>): DeviceRegistry {
    return {
      online: () =>
        devices.map((d) => ({
          id: d.id,
          type: d.type,
          protocol: "MODBUS",
          status: "online",
          name: d.id,
          rackCount: 0,
        })),
    } as unknown as DeviceRegistry;
  }

  it("resolveAvailable: tipe göre filtreler", async () => {
    const targets = new DeviceRegistryTargets(
      registry([
        { id: "PCS-1", type: "pcs" },
        { id: "PCS-2", type: "pcs" },
        { id: "BSC-1", type: "bsc" },
      ]),
    );
    expect(await targets.resolveAvailable("pcs")).toEqual(["PCS-1", "PCS-2"]);
    expect(await targets.resolveAvailable("bsc")).toEqual(["BSC-1"]);
    expect(await targets.resolveAvailable("yok")).toEqual([]);
  });

  it("filterAvailable: online kesişimi (sıra korunur)", async () => {
    const targets = new DeviceRegistryTargets(
      registry([{ id: "PCS-1", type: "pcs" }]),
    );
    expect(await targets.filterAvailable(["PCS-1", "PCS-9"])).toEqual(["PCS-1"]);
    expect(await targets.filterAvailable(["PCS-9"])).toEqual([]);
  });
});
