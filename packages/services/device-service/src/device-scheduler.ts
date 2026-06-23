import type { IMessageQueue } from "@gd-monorepo/core";
import type {
  ReadDeviceJob,
  ManagementJob,
  TelemetryData,
  ServiceConfigFile,
} from "@gd-monorepo/shared-types";

const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_MANAGEMENT_INTERVAL_MS = 10000;

export class DeviceScheduler {
  constructor(
    private readonly mq: IMessageQueue,
    private readonly config: ServiceConfigFile,
  ) {}

  scheduleRead(deviceId: string, intervalMs: number): Promise<void> {
    const jobName = `read-${deviceId}`;

    const job: ReadDeviceJob = {
      jobId: jobName,
      type: "READ_DEVICE",
      deviceId,
      timestamp: new Date().toISOString(),
    };

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

  async publishTelemetry(
    deviceId: string,
    data: TelemetryData[],
  ): Promise<void> {
    if (data.length === 0) return;

    const timestamp = new Date().toISOString();
    const base = `${deviceId}-${Date.now()}`;

    await Promise.all([
      this.mq.addJob({
        jobId: `${base}-write`,
        type: "WRITE_TELEMETRY",
        deviceId,
        timestamp,
        telemetries: data,
      }),
      this.mq.addJob({
        jobId: `${base}-mgmt`,
        type: "MANAGEMENT",
        deviceId,
        timestamp,
        telemetries: data,
      }),
    ]);
  }

  close(): Promise<void> {
    return this.mq.close();
  }
}
