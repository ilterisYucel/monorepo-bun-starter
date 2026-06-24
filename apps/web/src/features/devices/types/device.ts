// apps/web/src/features/devices/types/device.ts

export interface DeviceInfo {
  id: string;
  name: string;
  protocol: string;
  type: string;
  status: "online" | "offline";
  manufacturer: string | null;
  model: string | null;
  rack_count: number | null;
  poll_interval_ms: number | null;
  connection: Record<string, unknown> | null;
  last_seen: string | null;
  created_at: string;
}
