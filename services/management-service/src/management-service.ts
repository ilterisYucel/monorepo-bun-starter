// ManagementService — queue_management tüketicisi + değerlendirme döngüsü.
// Kaynak tasarım: docs/architecture/MANAGEMENT-SERVICE-MIMARISI.md §3.

import type { IMessageQueue } from "@gd-monorepo/core";
import type {
  AutomationRule,
  DeviceJob,
} from "@gd-monorepo/shared-types";
import { CycleSnapshotStore } from "./cycle-snapshot-store";
import { RuleEvaluator } from "./rule-evaluator";
import { ActionExecutor } from "./action-executor";

/** ManagementService yapılandırması — tek obje (DI kuralı 3). */
export interface ManagementServiceConfig {
  mq: IMessageQueue;
  rules: AutomationRule[];
  evaluator: RuleEvaluator;
  executor: ActionExecutor;
  snapshotStore: CycleSnapshotStore;
  /** Değerlendirme döngüsü aralığı (ms). */
  evaluationIntervalMs: number;
}

/**
 * ManagementService — servis çekirdeği.
 *
 * Davranış sözleşmesi (test: management-service.test.ts, MIMARISI §3):
 * - `start()`: `MANAGEMENT` tipi için worker kaydeder (job telemetrisi
 *   snapshot'a yazılır) + değerlendirme döngüsünü başlatır.
 * - `runCycle()`: komut — snapshot → evaluator → ateşlenen kuralların
 *   executor'ı (paralel allSettled); dönüş değeri ateşlenen kural adedi.
 * - `stop()`: döngüyü durdurur, mq'yu kapatır; çift çağrı güvenli.
 * - `health()`: sorgu — running + mq.health.
 * - Worker yalnızca MANAGEMENT job'larını kaydeder.
 */
export class ManagementService {
  private readonly mq: IMessageQueue;
  private readonly rules: AutomationRule[];
  private readonly evaluator: RuleEvaluator;
  private readonly executor: ActionExecutor;
  private readonly snapshotStore: CycleSnapshotStore;
  private readonly evaluationIntervalMs: number;

  private running = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(config: ManagementServiceConfig) {
    this.mq = config.mq;
    this.rules = config.rules;
    this.evaluator = config.evaluator;
    this.executor = config.executor;
    this.snapshotStore = config.snapshotStore;
    this.evaluationIntervalMs = config.evaluationIntervalMs;
  }

  /** Komut — worker + değerlendirme döngüsünü başlatır. */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;

    await this.mq.registerWorkerFor(
      "MANAGEMENT",
      async (job: DeviceJob) => {
        if (job.type !== "MANAGEMENT") return;
        this.snapshotStore.record(job.deviceId, job.telemetries);
      },
      { concurrency: 5 },
    );

    this.scheduleNextTick();
  }

  /**
   * Komut — bir değerlendirme cycle'ı çalıştırır; ateşlenen kural adedini
   * döner (rapor). Döngü içinden ve testlerden çağrılabilir.
   */
  async runCycle(): Promise<number> {
    const snapshot = this.snapshotStore.snapshot();
    const fired = this.evaluator.evaluate(this.rules, snapshot);
    await Promise.allSettled(
      fired.map((rule) => this.executor.execute(rule)),
    );
    return fired.length;
  }

  /** Komut — döngüyü durdurur, mq'yu kapatır. */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    await this.mq.close();
  }

  /** Sorgu — çalışıyor mu + mq sağlığı. */
  async health(): Promise<boolean> {
    if (!this.running) return false;
    return this.mq.health();
  }

  private scheduleNextTick(): void {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      this.runCycle()
        .catch((err) => {
          console.warn(`[ManagementService] Cycle hatasi: ${String(err)}`);
        })
        .finally(() => this.scheduleNextTick());
    }, this.evaluationIntervalMs);
  }
}
