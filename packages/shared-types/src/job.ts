// packages/shared-types/src/jobs.ts

import type { TelemetryData } from "./telemetry";

export type JobType = "READ_DEVICE" | "WRITE_TELEMETRY" | "COMMAND_DEVICE" | "MANAGEMENT";

export interface BaseJob {
  jobId: string;
  type: JobType;
  deviceId: string;
  timestamp: string;
  priority?: number;
  retryCount?: number;
}

export interface ReadDeviceJob extends BaseJob {
  type: "READ_DEVICE";
  telemetryNames?: string[]; // Yoksa tümü
}

export interface WriteTelemetryJob extends BaseJob {
  type: "WRITE_TELEMETRY";
  telemetries: TelemetryData[];
}

export interface CommandDeviceJob extends BaseJob {
  type: "COMMAND_DEVICE";
  /**
   * Gönderilecek telemetry verileri
   * Her biri kendi priority'sine sahip (ModbusTelemetryData içindeki priority)
   * Device bu priority'e göre sıralayıp yazar
   */
  telemetries: TelemetryData[];
  /**
   * Atomic transaction: hepsi başarılı olmazsa hiçbiri yazılmasın
   */
  atomic?: boolean;
}

export interface ManagementJob extends BaseJob {
  type: "MANAGEMENT";
  telemetries: TelemetryData[];
}

export type DeviceJob = ReadDeviceJob | WriteTelemetryJob | CommandDeviceJob | ManagementJob;
