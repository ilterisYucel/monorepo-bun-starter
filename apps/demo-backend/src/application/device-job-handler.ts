// apps/demo-backend/src/application/handlers/DeviceJobHandler.ts

import { ModbusDevice } from "@gd-monorepo/core";
import { TimescaleDBAdapter } from "@gd-monorepo/core";
import type {
  DeviceJob,
  ReadDeviceJob,
  WriteTelemetryJob,
  CommandDeviceJob,
} from "@gd-monorepo/shared-types";

export class DeviceJobHandler {
  constructor(
    private modbusDevice: ModbusDevice,
    private timescale: TimescaleDBAdapter,
  ) {}

  async handle(job: DeviceJob): Promise<void> {
    switch (job.type) {
      case "READ_DEVICE":
        return this.handleRead(job);
      case "WRITE_TELEMETRY":
        return this.handleWrite(job);
      case "COMMAND_DEVICE":
        return this.handleCommand(job);
      default:
        console.warn(
          `[DeviceJobHandler] Unknown job type: ${(job as any).type}`,
        );
    }
  }

  private async handleRead(job: ReadDeviceJob): Promise<void> {
    const { deviceId } = job;

    const results = await this.modbusDevice.read();

    // Write job oluştur
    // const writeJob: WriteTelemetryJob = {
    //   jobId: `write-${deviceId}-${Date.now()}`,
    //   type: "WRITE_TELEMETRY",
    //   deviceId,
    //   telemetries: results,
    //   timestamp: new Date().toISOString(),
    // };

    // Queue'ya ekle (bu handler içinden direkt queue'ya erişmek için dependency injection gerek)
    // Şimdilik doğrudan yaz
    // console.log(
    //   `[handleRead] results before write:`,
    //   JSON.stringify(results, null, 2),
    // );
    await this.timescale.write(results);
  }

  private async handleWrite(job: WriteTelemetryJob): Promise<void> {
    const { telemetries } = job;
    await this.timescale.write(telemetries);
    console.log(
      `[DeviceJobHandler] Wrote ${telemetries.length} telemetries to TimescaleDB`,
    );
  }

  private async handleCommand(job: CommandDeviceJob): Promise<void> {
    const { deviceId, telemetries, atomic } = job;

    if (atomic) {
      await this.modbusDevice.writeAtomic(telemetries);
    } else {
      await this.modbusDevice.write(telemetries);
    }

    console.log(
      `[DeviceJobHandler] Command executed on ${deviceId}, wrote ${telemetries.length} values`,
    );
  }
}
