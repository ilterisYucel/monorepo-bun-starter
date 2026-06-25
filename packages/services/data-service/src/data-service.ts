import type { IMessageQueue, ITimeseriesDatabase } from "@gd-monorepo/core";
import type { ISqlDatabase } from "@gd-monorepo/core";

export class DataService {
  private running: boolean;

  constructor(
    private readonly mq: IMessageQueue,
    private readonly timescale: ITimeseriesDatabase,
    private readonly sql: ISqlDatabase,
  ) {
    this.running = false;
  }

  async start(): Promise<void> {
    this.running = true;

    await this.mq.registerWorker(async (job) => {
      if (!this.running) return;

      if (job.type === "WRITE_TELEMETRY") {
        await this.timescale.write(job.telemetries);

        const logInserts = job.telemetries
          .filter((td) => td.logType && td.value)
          .map((td) =>
            this.sql.execute(
              `INSERT INTO system_logs (type, source, message, details)
               VALUES ($1, $2, $3, $4)`,
              [
                td.logType!,
                "system",
                `${td.deviceId}: ${td.name}`,
                `${td.description} | value=${td.value}`,
              ],
            ),
          );

        if (logInserts.length > 0) {
          await Promise.all(logInserts);
        }
      }
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
      return false;
    }
  }
}
