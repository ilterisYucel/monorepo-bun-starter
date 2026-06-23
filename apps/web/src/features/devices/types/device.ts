// apps/web/src/features/devices/types/device.ts

export interface DeviceInfo {
  id: string;
  name: string;
  protocol: string;
  status: "online" | "offline";
  manufacturer: string | null;
  model: string | null;
  poll_interval_ms: number | null;
  connection: Record<string, unknown> | null;
  last_seen: string | null;
  created_at: string;
  // Computed by store, not in DB:
  type?: string | null;
  rack_count?: number | null;
}
