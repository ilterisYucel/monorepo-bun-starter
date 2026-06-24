// apps/web/src/features/racks/types/rack.ts
export interface Rack {
  id: number;
  deviceId: string;
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