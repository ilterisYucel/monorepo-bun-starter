import type { IDevice, DeviceJob } from "@gd-monorepo/shared-types";
import type { IMessageQueue } from "@gd-monorepo/core";
import type { DeviceServiceDevice } from "./types";

interface DeviceEntry {
  device: IDevice;
  pollIntervalMs: number;
  jobName: string;
}

export class DeviceService {
  private devices: Map<string, DeviceEntry> = new Map();
  private mq: IMessageQueue;
  private running = false;

  constructor(devices: DeviceServiceDevice[], mq: IMessageQueue) {
    this.mq = mq;
    for (const dd of devices) {
      this.devices.set(dd.device.id, {
        device: dd.device,
        pollIntervalMs: dd.pollIntervalMs,
        jobName: `read-${dd.device.id}`,
      });
    }
  }

  async start(): Promise<void> {
    this.running = true;

    for (const [, entry] of this.devices) {
      const { device, pollIntervalMs, jobName } = entry;

      await device.connect();
      console.log(`[DeviceService] Connected: ${device.id} (${pollIntervalMs}ms)`);

      const job: DeviceJob = {
        jobId: jobName,
        type: "READ_DEVICE",
        deviceId: device.id,
        timestamp: new Date().toISOString(),
      };

      await this.mq.addRepeatableJobEvery(jobName, job, pollIntervalMs);
    }

    await this.mq.registerWorker(async (job: DeviceJob) => {
      if (!this.running) return;

      if (job.type === "READ_DEVICE") {
        await this.handleReadJob(job);
      } else if (job.type === "COMMAND_DEVICE") {
        await this.handleCommandJob(job);
      }
    });

    console.log(`[DeviceService] Started ${this.devices.size} device(s)`);
  }

  async stop(): Promise<void> {
    this.running = false;

    for (const [, entry] of this.devices) {
      try { await entry.device.disconnect(); } catch (_) { /* ignore */ }
      console.log(`[DeviceService] Stopped ${entry.device.id}`);
    }

    await this.mq.close();
    this.devices.clear();
    console.log("[DeviceService] All devices stopped");
  }

  private async handleReadJob(job: DeviceJob): Promise<void> {
    const entry = this.devices.get(job.deviceId);
    if (!entry) {
      console.warn(`[DeviceService] Unknown device for read: ${job.deviceId}`);
      return;
    }

    const data = await entry.device.read();
    const bitfields = await entry.device.readBitfields?.() ?? [];

    const allData = [...data, ...bitfields];
    if (allData.length === 0) return;

    await this.mq.addJob({
      jobId: `${job.deviceId}-${Date.now()}`,
      type: "WRITE_TELEMETRY",
      deviceId: job.deviceId,
      timestamp: new Date().toISOString(),
      telemetries: allData,
    });
  }

  private async handleCommandJob(job: DeviceJob): Promise<void> {
    const entry = this.devices.get(job.deviceId);
    if (!entry) {
      console.warn(`[DeviceService] Unknown device for command: ${job.deviceId}`);
      return;
    }

    console.log(`[DeviceService] Command for ${job.deviceId}: ${(job as any).telemetries?.length ?? 0} telemetry`);

    const cmd = job as any;
    if (cmd.atomic && entry.device.writeAtomic) {
      await entry.device.writeAtomic(cmd.telemetries);
    } else if (cmd.telemetries) {
      await entry.device.write(cmd.telemetries);
    }
  }

  health(): boolean {
    return this.running && this.devices.size > 0;
  }
}
