// src/modules/racks/types/index.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";

export interface Rack {
  id: number;
  name: string;
  status: "online" | "offline";
  charge_status: "Charge" | "Discharge" | "Idle";
  soc: number | null;
  soh: number | null;
  voltage: number | null;
  current: number | null;
  power_kw: number | null;
  temperature: number | null;
}

export interface RacksResponse {
  telemetries: TelemetryData[];
}
