import type { ISqlDatabase } from "@gd-monorepo/core";

interface DeviceRow {
  id: string;
  protocol: string;
  status: string;
  name: string;
  type: string;
  manufacturer: string | null;
  model: string | null;
}

export interface DeviceInfo {
  id: string;
  protocol: string;
  status: string;
  name: string;
  type: string;
}

export class DeviceRegistry {
  private devices: DeviceInfo[] = [];
  private lastRefreshAt = 0;

  constructor(
    private readonly db: ISqlDatabase,
    /** Refresh TTL — kısa sürede gelen ardışık poll'lar tek DB sorgusunu paylaşır. */
    private readonly ttlMs = 2000,
  ) {}

  /**
   * Cihaz listesini yeniler. `ttlMs` içindeki ardışık çağrılar önbelleği döner
   * (force=true ile atlanır). `/telemetry/latest` ve `/downsampled` her istekte
   * çağırdığından, çok bileşenli poll'ler tek sorguya iner.
   */
  async refresh(force = false): Promise<void> {
    const now = Date.now();
    if (!force && this.devices.length > 0 && now - this.lastRefreshAt < this.ttlMs) {
      return;
    }

    const rows = await this.db.query<DeviceRow>(
      "SELECT id, protocol, status, name, type, manufacturer, model FROM devices WHERE status = $1 ORDER BY created_at",
      ["online"],
    );

    this.devices = rows.map((r) => ({
      id: r.id,
      protocol: r.protocol,
      status: r.status,
      name: r.name,
      type: r.type ?? "unknown",
    }));
    this.lastRefreshAt = now;

    console.log(
      `[DeviceRegistry] ${this.devices.length} cihaz cevrimici`,
    );
  }

  online(): DeviceInfo[] {
    return this.devices;
  }
}
