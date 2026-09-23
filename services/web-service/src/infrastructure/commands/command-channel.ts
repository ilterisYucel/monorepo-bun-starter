// CommandChannel — OperationExecutor'ın yerel komut kanalı adaptörü.
// Kaynak tasarım: KOMUT-MANEVRA-OPERASYON §3 (mevcut komut hattı deseni:
// CommandJobBuilder → BullMQ → device-service).

import type { IMessageQueue } from "@gd-monorepo/core";
import { CommandJobBuilder } from "@gd-monorepo/platform-commands";
import type {
  CommandStepResult,
  ICommandChannel,
  ResolvedCommandStep,
} from "@gd-monorepo/platform-commands";

/** CommandChannel yapılandırması — tek obje (DI kuralı 3). */
export interface CommandChannelConfig {
  builder: CommandJobBuilder;
  mq: IMessageQueue;
  /** executeAndWait timeout tamponu (job timeout'una eklenir). */
  timeoutBufferMs?: number;
}

const DEFAULT_TIMEOUT_MS = 3000;
const DEFAULT_TIMEOUT_BUFFER_MS = 2000;

/**
 * CommandChannel — tek cihaz komut adımının yürütücüsü + zamanlı stop
 * planlayıcısı (ICommandChannel sözleşmesi, §10).
 *
 * Sözleşme (test: command-channel.test.ts):
 * - `execute`: isimli komut CommandJobBuilder'dan çözülür (çözümleme hatası →
 *   fail + reason); ham `telemetries` fallback'i komut işleme girmeden job
 *   üretir; sonuç `executeAndWait`'ten döner — throw YOK (beklenen hatalar
 *   Result/fail sonucudur; beklenmeyen throw yürütücüde kademeli düşer).
 * - `schedule`: stop komutu (isimli, parametresiz) çözülür ve BullMQ `delay`
 *   ile planlanır — best-effort: hata THROW eder (yürütücü audit'ler).
 */
export class CommandChannel implements ICommandChannel {
  private readonly builder: CommandJobBuilder;
  private readonly mq: IMessageQueue;
  private readonly bufferMs: number;

  constructor(config: CommandChannelConfig) {
    this.builder = config.builder;
    this.mq = config.mq;
    this.bufferMs = config.timeoutBufferMs ?? DEFAULT_TIMEOUT_BUFFER_MS;
  }

  /** Komut — adımı çalıştırır, sonucunu döner (throw YOK — fail sonucu). */
  async execute(step: ResolvedCommandStep): Promise<CommandStepResult> {
    try {
      if (step.command !== undefined) {
        const built = this.builder.build(step.deviceId, step.command, step.params);
        if (built.isErr()) {
          return {
            deviceId: step.deviceId,
            command: step.command,
            success: false,
            reason: built.error().reason,
          };
        }
        const job = built.unwrap();
        const timeoutMs =
          (job.validate?.timeoutMs ?? DEFAULT_TIMEOUT_MS) + this.bufferMs;
        const result = await this.mq.executeAndWait(job, timeoutMs);
        return {
          deviceId: step.deviceId,
          command: step.command,
          success: result.success,
          ...(result.reason !== undefined ? { reason: result.reason } : {}),
        };
      }

      const rawTelemetries = (step.telemetries ?? []).map((t) => ({
        ...t,
        timestamp: new Date().toISOString(),
        deviceId: step.deviceId,
        description: "",
      }));
      const jobId = `${step.deviceId}-raw-${Date.now()}`;
      const result = await this.mq.executeAndWait(
        {
          jobId,
          type: "COMMAND_DEVICE",
          deviceId: step.deviceId,
          timestamp: new Date().toISOString(),
          telemetries: rawTelemetries,
          atomic: true,
        },
        DEFAULT_TIMEOUT_MS + this.bufferMs,
      );
      return {
        deviceId: step.deviceId,
        success: result.success,
        ...(result.reason !== undefined ? { reason: result.reason } : {}),
      };
    } catch (err) {
      return {
        deviceId: step.deviceId,
        command: step.command,
        success: false,
        reason: String(err),
      };
    }
  }

  /** Komut — stop komutunu delay ile planlar (best-effort — hata throw). */
  async schedule(step: ResolvedCommandStep, delayMs: number): Promise<void> {
    if (step.command === undefined) {
      throw new Error("[CommandChannel] schedule: command zorunlu");
    }
    const built = this.builder.build(step.deviceId, step.command, step.params);
    if (built.isErr()) {
      throw new Error(
        `[CommandChannel] schedule cozumleme hatasi: ${built.error().reason}`,
      );
    }
    const job = built.unwrap();
    await this.mq.addJob(job, { delay: delayMs });
  }
}
