import { describe, it, expect, vi } from "vitest";
import type { AutomationRule } from "@gd-monorepo/shared-types";
import { CycleSnapshotStore } from "./cycle-snapshot-store";
import { RuleEvaluator } from "./rule-evaluator";
import { ActionExecutor } from "./action-executor";
import { DeviceCatalog } from "./device-catalog";
import { CommandJobBuilder } from "@gd-monorepo/platform-commands";
import type { IContainerCommandChannel } from "./container-command-channel";

/**
 * PPC sinyal zinciri — integration (WS3 + D4, Redis YOK):
 *
 * Field web-service `ContainerConnectionTelemetryPublisher`'ın ürettiği
 * synthetic MANAGEMENT telemetrisi (`deviceId="field"`,
 * `Container <id> Connection` 0/1/2) management-service'e gerçek yoldan girer:
 * worker → CycleSnapshotStore → RuleEvaluator → ActionExecutor. Bu spec
 * zincirin kural tarafını gerçek bileşenlerle sabitler:
 *
 * - Bağlantı koptu (value=0, stale→2 eşlemesi 0/2): R-07 tipi kural ATEŞLER;
 *   container-command aksiyonu kanala `traceId: auto:<rule>` ile gider.
 * - Bağlı (value=1): kural ATEŞLEMEZ (kenar-tetik: sonraki snapshot'ta).
 * - Kanaldan ok=false dönerse aksiyon fail sonucuna düşer — akış durmaz.
 */

const connectionRule: AutomationRule = {
  name: "r07_comm_loss",
  when: {
    any: [
      {
        device: { ids: ["field"] },
        telemetry: "Container c-1 Connection",
        op: "eq",
        threshold: 0,
      },
      {
        device: { ids: ["field"] },
        telemetry: "Container c-1 Connection",
        op: "eq",
        threshold: 2,
      },
    ],
  },
  then: [
    {
      action: "container-command",
      containerId: "c-1",
      deviceId: "PCS-1",
      command: "stop",
    },
    { action: "log", level: "warn", eventCode: "auto_rule_r07_comm_loss" },
  ],
};

function telemetry(value: number): Array<{
  deviceId: string;
  name: string;
  value: number;
  timestamp: string;
}> {
  return [
    {
      deviceId: "field",
      name: "Container c-1 Connection",
      value,
      timestamp: new Date().toISOString(),
    },
  ];
}

function executorWith(channel: IContainerCommandChannel): {
  executor: ActionExecutor;
  evaluator: RuleEvaluator;
  store: CycleSnapshotStore;
} {
  const catalog = new DeviceCatalog([
    { deviceId: "PCS-1", type: "pcs" },
    { deviceId: "field", type: "field" },
  ]);
  const store = new CycleSnapshotStore({ maxAgeMs: 60_000 });
  const evaluator = new RuleEvaluator(catalog);
  const builder = new CommandJobBuilder({
    source: { load: () => undefined },
  });
  const executor = new ActionExecutor({
    builder,
    mq: {
      addJob: async () => undefined,
      executeAndWait: async () => ({ success: true }),
      addRepeatableJob: async () => undefined,
      addRepeatableJobEvery: async () => undefined,
      registerWorker: async () => undefined,
      registerWorkerFor: async () => undefined,
      close: async () => undefined,
      queueStatus: async () => ({}),
      queueStats: async () => ({}),
      health: async () => true,
    },
    containerCommands: channel,
  });
  return { executor, evaluator, store };
}

describe("PPC sinyal zinciri (WS3 + D4)", () => {
  it("bağlantı koptu (0) → kural ateşler + kanala auto:<rule> trace ile gider", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true, traceId: "auto:r07_comm_loss" });
    const { executor, evaluator, store } = executorWith({ send });

    store.record("field", telemetry(0));
    const fired = evaluator.evaluate([connectionRule], store.snapshot());
    expect(fired.map((r) => r.name)).toContain("r07_comm_loss");

    const outcomes = await executor.execute(fired[0]!);
    expect(send).toHaveBeenCalledWith({
      containerId: "c-1",
      deviceId: "PCS-1",
      command: "stop",
      params: undefined,
      traceId: "auto:r07_comm_loss",
    });
    expect(outcomes[0]!.ok).toBe(true);
  });

  it("stale eşlemesi (2) de tetikler; bağlı (1) ATEŞLEMEZ", async () => {
    const { evaluator, store } = executorWith({
      send: vi.fn().mockResolvedValue({ ok: true, traceId: "x" }),
    });

    store.record("field", telemetry(1));
    expect(evaluator.evaluate([connectionRule], store.snapshot())).toHaveLength(0);

    store.record("field", telemetry(2));
    expect(
      evaluator.evaluate([connectionRule], store.snapshot()).map((r) => r.name),
    ).toContain("r07_comm_loss");
  });

  it("kenar-tetik: aynı snapshot ikinci kez değerlendirilmez", async () => {
    const { evaluator, store } = executorWith({
      send: vi.fn().mockResolvedValue({ ok: true, traceId: "x" }),
    });

    store.record("field", telemetry(0));
    const snapshot = store.snapshot();
    expect(evaluator.evaluate([connectionRule], snapshot)).toHaveLength(1);
    expect(evaluator.evaluate([connectionRule], snapshot)).toHaveLength(0);
  });

  it("kanal fail (ok=false) → aksiyon fail sonucu; sonraki aksiyon DEVAM eder", async () => {
    const send = vi
      .fn()
      .mockResolvedValue({ ok: false, reason: "container_not_connected", traceId: "x" });
    const { executor, evaluator, store } = executorWith({ send });

    store.record("field", telemetry(0));
    const fired = evaluator.evaluate([connectionRule], store.snapshot());
    const outcomes = await executor.execute(fired[0]!);
    expect(outcomes[0]!.ok).toBe(false);
    expect(outcomes[0]!.reason).toBe("container_not_connected");
    // log aksiyonu yine çalışır (kademeli bozulma)
    expect(outcomes[1]!.action.action).toBe("log");
  });
});
