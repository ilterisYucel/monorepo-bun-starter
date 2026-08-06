import { useMemo } from "react";
import { mockContainer } from "../../containers/services/mockDataGenerator";
import type { DeviceInfo } from "../types/device";

interface DeviceRow {
  id: string;
  name: string;
  type: string;
  protocol: string;
  status: "online" | "offline";
  manufacturer: string;
  model: string;
  rack_count: number | null;
  poll_interval_ms: number;
  last_seen: string;
  created_at: string;
}

const DEVICE_DEFS: Omit<DeviceRow, "status" | "last_seen">[] = [
  { id: "BSC-1", name: "BSC Main", type: "bsc", protocol: "MODBUS", manufacturer: "BSC", model: "BSC-2000", rack_count: 8, poll_interval_ms: 2000, created_at: "2024-01-01T00:00:00Z" },
  { id: "BSC-2", name: "BSC Secondary", type: "bsc", protocol: "MODBUS", manufacturer: "BSC", model: "BSC-2000", rack_count: 8, poll_interval_ms: 2000, created_at: "2024-01-01T00:00:00Z" },
  { id: "CB-1", name: "DC Circuit Breaker 1", type: "cb", protocol: "MODBUS", manufacturer: "Generic", model: "CB-480-630A", rack_count: null, poll_interval_ms: 2000, created_at: "2024-01-01T00:00:00Z" },
  { id: "CB-2", name: "DC Circuit Breaker 2", type: "cb", protocol: "MODBUS", manufacturer: "Generic", model: "CB-480-630A", rack_count: null, poll_interval_ms: 2000, created_at: "2024-01-01T00:00:00Z" },
  { id: "DC-1", name: "DC Output 1", type: "dc-output", protocol: "MODBUS", manufacturer: "Generic", model: "DC-48-100A", rack_count: null, poll_interval_ms: 2000, created_at: "2024-01-01T00:00:00Z" },
  { id: "DC-2", name: "DC Output 2", type: "dc-output", protocol: "MODBUS", manufacturer: "Generic", model: "DC-48-100A", rack_count: null, poll_interval_ms: 2000, created_at: "2024-01-01T00:00:00Z" },
  { id: "HVAC-1", name: "Oda 1", type: "hvac", protocol: "MODBUS", manufacturer: "Generic", model: "HVAC-ROOM", rack_count: null, poll_interval_ms: 5000, created_at: "2024-01-01T00:00:00Z" },
  { id: "HVAC-2", name: "Oda 2", type: "hvac", protocol: "MODBUS", manufacturer: "Generic", model: "HVAC-ROOM", rack_count: null, poll_interval_ms: 5000, created_at: "2024-01-01T00:00:00Z" },
  { id: "HVAC-3", name: "Oda 3", type: "hvac", protocol: "MODBUS", manufacturer: "Generic", model: "HVAC-ROOM", rack_count: null, poll_interval_ms: 5000, created_at: "2024-01-01T00:00:00Z" },
  { id: "HVAC-4", name: "Oda 4", type: "hvac", protocol: "MODBUS", manufacturer: "Generic", model: "HVAC-ROOM", rack_count: null, poll_interval_ms: 5000, created_at: "2024-01-01T00:00:00Z" },
];

function getDeviceStatus(containerId: string, deviceId: string, status: string, telemetry: any[]): "online" | "offline" {
  if (status === "offline") return "offline";

  if (containerId === "container-2") {
    if (deviceId === "CB-2") return "offline";
    if (deviceId === "DC-1") return "offline";
  }

  return "online";
}

export function useFieldDevices(containerId: string) {
  const container = useMemo(() => mockContainer(containerId), [containerId]);

  const devices: DeviceInfo[] = useMemo(() => {
    if (!container) return [];

    const now = ts();

    return DEVICE_DEFS.map((def) => ({
      ...def,
      status: getDeviceStatus(containerId, def.id, container.status, container.latestTelemetry),
      last_seen: container.status === "offline" ? null : now,
      connection: null,
    }));
  }, [container]);

  return { devices, isLoading: false };
}

function ts(): string {
  return new Date().toISOString();
}
