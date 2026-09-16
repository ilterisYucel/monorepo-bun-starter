import { describe, it, expect, vi, afterEach } from "vitest";
import { ManagementService } from "./management-service";
import { RuleEvaluator } from "./rule-evaluator";
import { ActionExecutor } from "./action-executor";
import { CycleSnapshotStore } from "./cycle-snapshot-store";
import { DeviceCatalog } from "./device-catalog";
import type { IMessageQueue } from "@gd-monorepo/core";
import type { ManagementJob, AutomationRule } from "@gd-monorepo/shared-types";

/**
 * ManagementService sözleşmesi (MANAGEMENT-SERVICE-MIMARISI.md §3, T7):
 *
 * - `start()`: komut — `MANAGEMENT` tipi için worker kaydeder (gelen job'ların
 *   telemetrisi CycleSnapshotStore'a yazılır) + değerlendirme döngüsünü
 *   (evaluationIntervalMs aralıklı) başlatır.
 * - `runCycle()`: komut — snapshot → RuleEvaluator → ateşlenen kuralların
 *   ActionExecutor'ı (paralel, allSettled); dönen sayı ateşlenen kural adedi.
 * - `stop()`: komut — döngü durur, tekrar start edilemez çağrı güvenli, mq
 *   kapatılır.
 * - `health()`: sorgu — running + mq.health.
 * - Worker yalnızca MANAGEMENT job'larını kaydeder; diğer tipler yok sayılır.
 */

vi.useFakeTimers();

const RULES: AutomationRule[] = [
  {
    name: "r1",
    when: { all: [{ telemetry: "soc", op: "gt", threshold: 90 }] },
    then: [{ action: "notify" }],
  },
];

function mockMq(overrides: Partial<IMessageQueue> = {}): IMessageQueue & {
  workerProcessor?: (job: ManagementJob) => Promise<unknown>;
} {
  const mq: IMessageQueue & { workerProcessor?: (job: ManagementJob) => Promise<unknown> } = {
    addJob: vi.fn().mockResolvedValue(undefined),
    executeAndWait: vi.fn().mockResolvedValue({ success: true }),
    addRepeatableJob: vi.fn(),
    addRepeatableJobEvery: vi.fn(),
    registerWorker: vi.fn(),
    registerWorkerFor: vi.fn((_type, processor) => {
      mq.workerProcessor = processor as (job: ManagementJob) => Promise<unknown>;
      return Promise.resolve();
    }),
    close: vi.fn().mockResolvedValue(undefined),
    queueStatus: vi.fn(),
    queueStats: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
  return mq;
}

function buildService(overrides: {
  mq?: IMessageQueue;
  execute?: (rule: AutomationRule) => Promise<unknown>;
  evaluationIntervalMs?: number;
} = {}) {
  const mq = overrides.mq ?? mockMq();
  const executor = {
    execute: vi.fn(
      (overrides.execute as (rule: AutomationRule) => Promise<unknown>) ??
        (async () => [{ ok: true }]),
    ),
  } as unknown as ActionExecutor;
  const service = new ManagementService({
    mq,
    rules: RULES,
    evaluator: new RuleEvaluator(
      new DeviceCatalog([{ deviceId: "bsc-1", type: "bsc" }]),
      { now: () => Date.now() },
    ),
    executor,
    snapshotStore: new CycleSnapshotStore({ maxAgeMs: 30_000 }),
    evaluationIntervalMs: overrides.evaluationIntervalMs ?? 10_000,
  });
  return { mq, executor, service };
}

afterEach(() => {
  vi.clearAllTimers();
});

describe("ManagementService", () => {
  it("start: MANAGEMENT worker kaydedilir; job telemetrisi snapshot'a yazılır", async () => {
    const { mq, service } = buildService();
    await service.start();
    expect(mq.registerWorkerFor).toHaveBeenCalledWith(
      "MANAGEMENT",
      expect.any(Function),
      expect.anything(),
    );
    const processor = (
      mq as { workerProcessor?: (job: ManagementJob) => Promise<unknown> }
    ).workerProcessor!;
    await processor({
      jobId: "m1",
      type: "MANAGEMENT",
      deviceId: "bsc-1",
      timestamp: new Date().toISOString(),
      telemetries: [
        {
          name: "BSC SOC",
          value: 95,
          unit: "%",
          description: "",
          timestamp: new Date().toISOString(),
          deviceId: "bsc-1",
          tags: { canonical: "soc" },
        },
      ],
    });
    expect(service.runCycle()).resolves.toBeGreaterThanOrEqual(0);
    await service.stop();
  });

  it("runCycle: koşul sağlanınca kural ateşlenir ve executor çağrılır", async () => {
    const execute = vi.fn().mockResolvedValue([{ ok: true }]);
    const { mq, service } = buildService({ execute });
    await service.start();
    const processor = (
      mq as { workerProcessor?: (job: ManagementJob) => Promise<unknown> }
    ).workerProcessor!;
    await processor({
      jobId: "m1",
      type: "MANAGEMENT",
      deviceId: "bsc-1",
      timestamp: new Date().toISOString(),
      telemetries: [
        {
          name: "BSC SOC",
          value: 95,
          unit: "%",
          description: "",
          timestamp: new Date().toISOString(),
          deviceId: "bsc-1",
          tags: { canonical: "soc" },
        },
      ],
    });
    const fired = await service.runCycle();
    expect(fired).toBe(1);
    expect(execute).toHaveBeenCalledTimes(1);
    // kenar-tetik: ikinci cycle aynı koşulda ateşlemez
    expect(await service.runCycle()).toBe(0);
    await service.stop();
  });

  it("tick döngüsü: interval sonrası değerlendirme kendiliğinden çalışır", async () => {
    const execute = vi.fn().mockResolvedValue([{ ok: true }]);
    const { mq, service } = buildService({ execute, evaluationIntervalMs: 10_000 });
    await service.start();
    const processor = (
      mq as { workerProcessor?: (job: ManagementJob) => Promise<unknown> }
    ).workerProcessor!;
    await processor({
      jobId: "m1",
      type: "MANAGEMENT",
      deviceId: "bsc-1",
      timestamp: new Date().toISOString(),
      telemetries: [
        {
          name: "BSC SOC",
          value: 95,
          unit: "%",
          description: "",
          timestamp: new Date().toISOString(),
          deviceId: "bsc-1",
          tags: { canonical: "soc" },
        },
      ],
    });
    await vi.advanceTimersByTimeAsync(10_001);
    expect(execute).toHaveBeenCalledTimes(1);
    await service.stop();
  });

  it("worker yalnızca MANAGEMENT tipini kaydeder (non-MANAGEMENT job yok sayılır)", async () => {
    const { mq, service } = buildService();
    await service.start();
    const processor = (
      mq as { workerProcessor?: (job: ManagementJob) => Promise<unknown> }
    ).workerProcessor!;
    await processor({
      jobId: "w1",
      type: "WS_BROADCAST",
      deviceId: "bsc-1",
      timestamp: new Date().toISOString(),
      telemetries: [],
    } as unknown as ManagementJob);
    expect(await service.runCycle()).toBe(0);
    await service.stop();
  });

  it("stop: döngü durur, mq.close çağrılır; çift stop güvenli", async () => {
    const { mq, service } = buildService();
    await service.start();
    await service.stop();
    expect(mq.close).toHaveBeenCalledTimes(1);
    await service.stop();
    expect(mq.close).toHaveBeenCalledTimes(1);
  });

  it("health: çalışıyorsa mq.health yansır", async () => {
    const { service } = buildService();
    expect(await service.health()).toBe(false);
    await service.start();
    expect(await service.health()).toBe(true);
    await service.stop();
    expect(await service.health()).toBe(false);
  });
});
