import type { ISqlDatabase } from "@gd-monorepo/core";

interface DeviceRow {
  id: string;
  protocol: string;
  status: string;
  name: string;
  type: string;
  manufacturer: string | null;
  model: string | null;
  rack_count: number;
}

export interface DeviceInfo {
  id: string;
  protocol: string;
  status: string;
  name: string;
  type: string;
  rackCount: number;
}

export class DeviceRegistry {
  private devices: DeviceInfo[] = [];

  constructor(private readonly db: ISqlDatabase) {}

  async refresh(): Promise<void> {
    const rows = await this.db.query<DeviceRow>(
      "SELECT id, protocol, status, name, type, manufacturer, model, rack_count FROM devices WHERE status = $1 ORDER BY created_at",
      ["online"],
    );

    this.devices = rows.map((r) => ({
      id: r.id,
      protocol: r.protocol,
      status: r.status,
      name: r.name,
      type: r.type ?? "unknown",
      rackCount: r.rack_count ?? 0,
    }));

    console.log(
      `[DeviceRegistry] ${this.devices.length} cihaz cevrimici`,
    );
  }

  online(): DeviceInfo[] {
    return this.devices;
  }
}
