import type { ChargeStatus } from "@gd-monorepo/shared-types";

/**
 * Rack (Batarya Rafı) tipi
 */
export interface Rack {
  id: number;
  deviceId: string;
  name: string;
  status: "online" | "offline";
  charge_status: ChargeStatus;
  soc: number | null;
  soh?: number | null;
  voltage: number | null;
  current: number | null;
  power_kw: number | null;
  temperature: number | null;
}