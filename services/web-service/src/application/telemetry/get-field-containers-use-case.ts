import type { TelemetryData } from "@gd-monorepo/shared-types";
import type {
  ContainerConnectionState,
  IContaTelemetryPort,
} from "../../domain/ports/container-telemetry";

/** Field API `/containers` satırı (dış sözleşme — şekil DEĞİŞMEZ). */
export interface FieldContainerRow {
  containerId: string;
  connectionStatus: ContainerConnectionState;
  lastSeenAt?: string;
  latestTelemetry: TelemetryData[];
}

/**
 * GetFieldContainersUseCase — field'ın konteyner listesi (UC-2).
 *
 * Sözleşme:
 * - Her konteyner için bağlantı durumu + son görülme + telemetri döner.
 * - Taze snapshot (`latestQuery`) başarısız/boşsa cache'teki son değere düşer.
 * - Bir konteynerin hatası diğerlerini engellemez (Promise.allSettled).
 */
export class GetFieldContainersUseCase {
  constructor(private readonly containers: IContaTelemetryPort) {}

  /** Sadece cache'teki son telemetri (özet ekranı — dış sorgu yok). */
  async executeCached(): Promise<FieldContainerRow[]> {
    const rows = this.containers.containerIds().map((containerId) => {
      const status =
        this.containers.connectionStatus().get(containerId) ?? "idle";
      const lastSeenAtMs = this.containers.lastSeenAt(containerId);
      return {
        containerId,
        connectionStatus: status,
        ...(lastSeenAtMs !== undefined
          ? { lastSeenAt: new Date(lastSeenAtMs).toISOString() }
          : {}),
        latestTelemetry: this.containers.latestTelemetry(containerId),
      } satisfies FieldContainerRow;
    });
    return rows;
  }

  async execute(): Promise<FieldContainerRow[]> {
    const containerIds = this.containers.containerIds();
    const results = await Promise.allSettled(
      containerIds.map(async (containerId) => {
        const status =
          this.containers.connectionStatus().get(containerId) ?? "idle";
        const lastSeenAtMs = this.containers.lastSeenAt(containerId);
        const fresh = await this.containers.latestQuery(containerId);
        const latestTelemetry =
          fresh.length > 0
            ? fresh
            : this.containers.latestTelemetry(containerId);
        return {
          containerId,
          connectionStatus: status,
          ...(lastSeenAtMs !== undefined
            ? { lastSeenAt: new Date(lastSeenAtMs).toISOString() }
            : {}),
          latestTelemetry,
        } satisfies FieldContainerRow;
      }),
    );
    return results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  }
}
