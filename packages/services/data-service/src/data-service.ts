import type { IMessageQueue, ITimeseriesDatabase } from "@gd-monorepo/core";

export class DataService {
  private running: boolean;

  constructor(
    private readonly mq: IMessageQueue,
    private readonly timescale: ITimeseriesDatabase,
  ) {
    this.running = false;
  }

  async start(): Promise<void> {
    this.running = true;

    await this.mq.registerWorker(async (job) => {
      if (!this.running) return;

      if (job.type === "WRITE_TELEMETRY") {
        await this.timescale.write(job.telemetries);
      }
    });

    console.log("[DataService] WRITE_TELEMETRY worker baslatildi");
  }

  async stop(): Promise<void> {
    this.running = false;

    await this.mq.close();
    await this.timescale.close();

    console.log("[DataService] Durduruldu");
  }

  async health(): Promise<boolean> {
    if (!this.running) return false;

    try {
      const [mqOk, dbOk] = await Promise.all([
        this.mq.health(),
        this.timescale.health(),
      ]);
      return mqOk && dbOk;
    } catch {
      return false;
    }
  }
}
