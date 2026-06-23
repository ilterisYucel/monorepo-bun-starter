import type { TelemetryData, IDevice } from "@gd-monorepo/shared-types";

export class CANBusDevice implements IDevice {
  id: string;

  constructor(id: string) {
    this.id = id;
  }

  async connect(): Promise<void> {
    throw new Error("CANBusDevice not implemented");
  }

  async disconnect(): Promise<void> {
    throw new Error("CANBusDevice not implemented");
  }

  async read(_telemetries?: TelemetryData[]): Promise<TelemetryData[]> {
    throw new Error("CANBusDevice not implemented");
  }

  async write(_telemetries: TelemetryData[]): Promise<void> {
    throw new Error("CANBusDevice not implemented");
  }
}
