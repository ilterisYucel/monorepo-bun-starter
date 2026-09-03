import type { IMessageQueue, ITimeseriesDatabase } from "@gd-monorepo/core";

import type { ISqlDatabase } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import { TransientError } from "@gd-monorepo/result";


export class DataService {
  private running: boolean;

  constructor(
    private readonly mq: IMessageQueue,
    private readonly timescale: ITimeseriesDatabase,
    private readonly sql: ISqlDatabase,
    private readonly logger?: TamperLogger,
  ) {
    this.running = false;
  }

  async start(): Promise<void> {
    this.running = true;

    await this.mq.registerWorkerFor("WRITE_TELEMETRY", async (job) => {
      if (!this.running) return;

      if (job.type === "WRITE_TELEMETRY") {
        try {
          await this.timescale.write(job.telemetries);
        } catch (err) {
          // Açık 2 kapanışı (T0.11): telemetri ≠ log — log sızıntısı kaldırıldı.
          // Sınır logu onFailed'da (tek log noktası); burada yalnızca retry
          // tetiklenir (WRITE_TELEMETRY attempts:5 + dead-letter).
          throw new TransientError("telemetry_write_failed", "Telemetri yazma hatası", {
            context: {
              jobId: job.jobId,
              deviceIds: [...new Set(job.telemetries.map((t) => t.deviceId))],
            },
            cause: err,
          });
        }
      }
    }, {
      concurrency: 10,
      onFailed: async (job, err) => {
        if (!this.logger) return;
        await this.logger
          .log({
            level: "error",
            category: "app",
            eventCode: "telemetry_write_failed",
            message: "WRITE_TELEMETRY denemeleri tükendi (dead-letter)",
            context: {
              jobId: job.jobId,
              deviceIds: [...new Set(job.telemetries.map((t) => t.deviceId))],
              error: String(err),
            },
          })
          .catch(() => undefined);
      },
    });

    console.log("[DataService] WRITE_TELEMETRY worker baslatildi");
  }

  async stop(): Promise<void> {
    this.running = false;

    await this.mq.close();
    await this.timescale.close();
    await this.sql.disconnect();

    console.log("[DataService] Durduruldu");
  }

  async health(): Promise<boolean> {
    if (!this.running) return false;

    try {
      const [mqOk, dbOk, sqlOk] = await Promise.all([
        this.mq.health(),
        this.timescale.health(),
        this.sql.health(),
      ]);
      return mqOk && dbOk && sqlOk;
    } catch {
      console.warn("[DataService] Health check failed");
      return false;
    }
  }
}
