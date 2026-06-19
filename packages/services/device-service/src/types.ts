import type { IDevice } from "@gd-monorepo/shared-types";

export interface DeviceServiceDevice {
  device: IDevice;
  pollIntervalMs: number;
}
