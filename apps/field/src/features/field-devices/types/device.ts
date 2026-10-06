export interface DeviceInfo {
  id: string;
  name: string;
  protocol: string;
  type: string;
  status: "online" | "offline";
  manufacturer: string | null;
  model: string | null;
  details: Record<string, unknown> | null;
  poll_interval_ms: number | null;
  connection: Record<string, unknown> | null;
  last_seen: string | null;
  created_at: string;
}
