import type { ISnapshotSource, TunnelTelemetryPoint } from "@gd-monorepo/ws-tunnel";
import type { IContainerProxy } from "@gd-monorepo/platform-container-access";

/**
 * FieldUplinkSnapshotSource — field tier uplink telemetri push kaynağı (Faz 3).
 * Field'a kayıtlı konteynerlerin EN GÜNCEL telemetrilerini tek snapshot'ta
 * toplar; hata/boş durumda boş dizi (kademeli bozulma — uplink etkilenmez).
 */
export class FieldUplinkSnapshotSource implements ISnapshotSource {
  constructor(private readonly containerProxy: IContainerProxy) {}

  async snapshot(): Promise<TunnelTelemetryPoint[]> {
    const points: TunnelTelemetryPoint[] = [];
    for (const [containerId, state] of this.containerProxy.connectionStatus()) {
      if (state !== "connected") continue;
      const latest = this.containerProxy.latestTelemetry(containerId);
      for (const telemetry of latest) {
        points.push({
          deviceId: telemetry.deviceId,
          name: telemetry.name,
          value: telemetry.value,
          timestamp: telemetry.timestamp,
          unit: telemetry.unit,
          description: telemetry.description,
          tags: telemetry.tags,
        });
      }
    }
    return points;
  }
}
