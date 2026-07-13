
import type { ChargeStatus } from "@gd-monorepo/shared-types";

export interface Rack {
  id: number;
  name: string;
  status: "online" | "offline";
  soc: number | null;
  soh: number | null;
  charge_status: ChargeStatus | null;
  voltage: number | null;
  current: number | null;
  temperature: number | null;
  power_kw: number | null;
  stored_capacity_kwh: number | null;
  remaining_seconds: number | null;
  timestamp: string;
}

export interface CommandHistory {
  command: "CHARGE" | "DISCHARGE";
  mode: "TIMER" | "CONTINUOUS";
  duration?: number;
  remainingSeconds?: number;
  endTime?: Date | null;
  isActive: boolean;
}

export type OperationMode = "TIMER" | "CONTINUOUS";

// Tarihsel veri için (time-series)
export interface HistoricalDataPoint {
  timestamp: string;
  value: number;
  rackId: number;
  rackName: string;
}

export interface HistoricalData {
  voltage: HistoricalDataPoint[];
  current: HistoricalDataPoint[];
}

export interface SystemDataPoint {
  timestamp: string;
  voltage: number;
  current: number;
}

export interface SetPowerRequest {
  charge_status: ChargeStatus;
  power_kw: number;
  duration_seconds: number;
  rack_id?: number;
}

export interface SetStatusRequest {
  status: "online" | "offline";
  rack_id?: number;
}

export interface SetSOCRequest {
  soc: number;
  rack_id?: number;
}
