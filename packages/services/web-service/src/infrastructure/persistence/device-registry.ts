import type { ISqlDatabase } from "@gd-monorepo/core";

interface DeviceRow {
  id: string;
  protocol: string;
  status: string;
  name: string;
  manufacturer: string | null;
  model: string | null;
}

export interface DeviceInfo {
  id: string;
  protocol: string;
  status: string;
  name: string;
  rackCount: number;
  rackOffset: number;
}

const MODEL_RACKS: Record<string, number> = {
  bsc: 8,
  xrack: 16,
};

function detectType(row: DeviceRow): string | null {
  const id = row.id.toUpperCase();
  if (id.startsWith("BSC-")) return "bsc";
  if (id.startsWith("HVAC-")) return "hvac";
  if (id.startsWith("XRACK-")) return "xrack";
  return null;
}

export class DeviceRegistry {
  private bscDevices: DeviceInfo[] = [];
  private hvacDevices: DeviceInfo[] = [];

  constructor(private readonly db: ISqlDatabase) {}

  async refresh(): Promise<void> {
    const rows = await this.db.query<DeviceRow>(
      "SELECT id, protocol, status, name, manufacturer, model FROM devices WHERE status = $1 ORDER BY created_at",
      ["online"],
    );

    this.bscDevices = [];
    this.hvacDevices = [];

    let rackOffset = 0;
    for (const r of rows) {
      const type = detectType(r);
      if (type === "bsc" || type === "xrack") {
        const rackCount = MODEL_RACKS[type] ?? 0;
        this.bscDevices.push({
          id: r.id,
          protocol: r.protocol,
          status: r.status,
          name: r.name,
          rackCount,
          rackOffset,
        });
        rackOffset += rackCount;
      } else if (type === "hvac") {
        this.hvacDevices.push({
          id: r.id,
          protocol: r.protocol,
          status: r.status,
          name: r.name,
          rackCount: 0,
          rackOffset: 0,
        });
      }
    }

    console.log(
      `[DeviceRegistry] ${this.bscDevices.length} BSC/XRack cihaz (${this.totalRacks()} rack), ${this.hvacDevices.length} HVAC cihaz`,
    );
  }

  bsc(): DeviceInfo[] {
    return this.bscDevices;
  }

  hvac(): DeviceInfo[] {
    return this.hvacDevices;
  }

  totalRacks(): number {
    return this.bscDevices.reduce((s, d) => s + d.rackCount, 0);
  }
}
