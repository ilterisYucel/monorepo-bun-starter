// src/modules/telemetry/types/index.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";

export interface TelemetryResponse {
  telemetries: TelemetryData[];
}

export interface ChartDataPoint {
  timestamp: string;
  [key: string]: string | number;
}

export interface SystemStatus {
  chargeStatus: "Charge" | "Discharge" | "Idle";
  isCharging: boolean;
  isDischarging: boolean;
  isIdle: boolean;
}
