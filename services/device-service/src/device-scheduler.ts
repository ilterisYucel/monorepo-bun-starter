import type { IMessageQueue } from "@gd-monorepo/core";
import type { ReadDeviceJob, ManagementJob, TelemetryData, ServiceConfigFile } from "@gd-monorepo/shared-types";
import type { Logger } from "@gd-monorepo/logger";
import { createOpsLog } from "./ops-log";
import type { OpsLog } from "./ops-log";

const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_MANAGEMENT_INTERVAL_MS = 10000;

export class DeviceScheduler {
  private readonly ops: OpsLog;

  constructor(
    private readonly mq: IMessageQueue,
    private readonly config: ServiceConfigFile,
    opsLogger?: Logger,
  ) {
    this.ops = createOpsLog(opsLogger, "DeviceScheduler");
  }

  scheduleRead(deviceId: string, intervalMs: number, startDate?: Date): Promise<void> {
    const jobName = `read-${deviceId}`;

    const job: ReadDeviceJob = {
      jobId: jobName,
      type: "READ_DEVICE",
      deviceId,
      timestamp: new Date().toISOString(),
    };

    if (startDate) {
      return this.mq.addRepeatableJobEvery(jobName, job, intervalMs, startDate);
    }
    return this.mq.addRepeatableJobEvery(jobName, job, intervalMs);
  }

  scheduleManagement(): Promise<void> {
    const intervalMs =
      this.config.managementIntervalMs ?? DEFAULT_MANAGEMENT_INTERVAL_MS;

    const job: ManagementJob = {
      jobId: "management-publish",
      type: "MANAGEMENT",
      deviceId: "device-service",
      timestamp: new Date().toISOString(),
      telemetries: [],
    };

    return this.mq.addRepeatableJobEvery("management-publish", job, intervalMs);
  }

  /**
   * Telemetriyi downstream job'lara dağıtır.
   *
   * - `WRITE_TELEMETRY`: yalnız `writeTelemetries` (filtrelenmiş alt küme). Boşsa job atılmaz.
   * - `MANAGEMENT` + `WS_BROADCAST`: `data` (TAM — kural motoru/ön yüz taze kalır).
   *
   * @returns `writeEnqueued` — WRITE job'u başarıyla kuyruğa eklendiyse `true`
   *   (DeviceService state'i yalnız bu durumda ilerletir).
   */
  async publishTelemetry(
    deviceId: string,
    data: TelemetryData[],
    writeTelemetries: TelemetryData[] = data,
  ): Promise<{ writeEnqueued: boolean }> {
    if (data.length === 0) return { writeEnqueued: false };

    const timestamp = new Date().toISOString();
    const base = `${deviceId}-${Date.now()}`;

    const writePromise: Promise<unknown> | undefined =
      writeTelemetries.length > 0
        ? Promise.resolve(
            this.mq.addJob({
              jobId: `${base}-write`,
              type: "WRITE_TELEMETRY",
              deviceId,
              timestamp,
              telemetries: writeTelemetries,
            }),
          )
        : undefined;

    const results = await Promise.allSettled([
      this.mq.addJob({
        jobId: `${base}-mgmt`,
        type: "MANAGEMENT",
        deviceId,
        timestamp,
        telemetries: data,
      }),
      this.mq.addJob({
        jobId: `${base}-ws`,
        type: "WS_BROADCAST",
        deviceId,
        timestamp,
        telemetries: data,
      }),
      ...(writePromise !== undefined ? [writePromise] : []),
    ]);

    const writeEnqueued =
      writePromise !== undefined && results[2]?.status === "fulfilled";
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed > 0) {
      this.ops.warn(`${deviceId} icin ${failed} job kuyruga eklenemedi`);
    }

    return { writeEnqueued };
  }

  close(): Promise<void> {
    return this.mq.close();
  }
}
