import { useMemo } from "react";
import { mockContainers } from "../../containers/services/mockDataGenerator";
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
  last_seen: string | null;
  created_at: string;
}

// ponytail: PCS-N ↔ container-N eşlemesi mock için index tabanlı.
// Gerçek backend'de field device-service kayıt defteri eşlemeyi verir.
function containerIndexForPcs(pcsId: string): number {
  const n = Number(pcsId.replace("PCS-", ""));
  return Number.isNaN(n) ? 0 : Math.max(0, n - 1);
}

export function useFieldDevices(pcsId: string) {
  const containers = useMemo(() => mockContainers(), []);
  const container = containers[containerIndexForPcs(pcsId)];

  const devices: DeviceInfo[] = useMemo(() => {
    if (!container) return [];

    const now = ts();
    const row: DeviceRow = {
      id: pcsId,
      name: `PCS — ${container.name}`,
      type: "pcs",
      protocol: "MODBUS",
      status: container.connected ? "online" : "offline",
      manufacturer: "Field",
      model: "PCS-500",
      rack_count: null,
      poll_interval_ms: 2000,
      last_seen: container.connected ? now : null,
      created_at: "2024-01-01T00:00:00Z",
    };

    return [{ ...row, connection: null }];
  }, [container, pcsId]);

  return { devices, isLoading: false };
}

function ts(): string {
  return new Date().toISOString();
}
