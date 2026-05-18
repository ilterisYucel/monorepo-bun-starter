// src/modules/control/types/index.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";

export type ChargeStatusType = "Charge" | "Discharge" | "Idle";

export interface PowerCommandRequest {
  charge_status: ChargeStatusType;
  power_kw: number;
  duration_seconds: number;
}

export interface PowerCommandResponse {
  message: string;
  updatedCount: number;
}

// useSetPower hook'unun parametre tipi
export interface SetPowerParams {
  chargeStatus: ChargeStatusType;
  powerKw: number;
  durationSeconds: number;
}

// API'den dönen telemetry yapısı (mevcut api.ts ile uyumlu)
export interface TelemetryResponse {
  telemetries: TelemetryData[];
}
