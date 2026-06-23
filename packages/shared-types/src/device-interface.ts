import type { TelemetryData } from "./telemetry";

export interface IDevice {
  id: string;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  read(telemetries?: TelemetryData[]): Promise<TelemetryData[]>;
  readBitfields?(): Promise<TelemetryData[]>;
  write(telemetries: TelemetryData[]): Promise<void>;
  writeAtomic?(telemetries: TelemetryData[]): Promise<void>;
}
