export interface DeviceTableRow {
  id: string;
  name: string;
  type: string;
  protocol: string;
  rack_count: number | null;
  model: string | null;
  status: "online" | "offline";
  poll_interval_ms: number | null;
  last_seen: string | null;
}

export interface DeviceTableProps {
  devices: DeviceTableRow[];
  isLoading?: boolean;
  headerSlot?: React.ReactNode;
  renderActions?: (device: DeviceTableRow) => React.ReactNode;
  getDeviceId?: (device: DeviceTableRow) => React.ReactNode;
}
