import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { ISqlDatabase } from "@gd-monorepo/core";
import type { RealtimeManager } from "../../realtime/realtime-manager";
import type { ISnapshotSource } from "@gd-monorepo/ws-tunnel";

/**
 * RealtimeSnapshotSource — container tier telemetri snapshot kaynağı.
 *
 * Kaynaklar: (1) `devices` tablosu (`status='online'`) — cihaz listesi;
 * (2) RealtimeManager'ın Redis ring buffer'ları — data-service'in WS_BROADCAST
 * job'larıyla beslenir, en yeni kayıt baştadır (lPush).
 *
 * Her (deviceId, name) için EN YENİ değer korunur (buffer en-yeni-önce sıralı
 * olduğundan ilk görülen = en yeni). Bozuk/eksik alanlı kayıtlar elenir.
 * SQL veya tek cihazın Redis hatası akışı durdurmaz (kademeli bozulma §12.4).
 */
export class RealtimeSnapshotSource implements ISnapshotSource {
  constructor(
    private readonly sql: ISqlDatabase,
    private readonly realtime: RealtimeManager,
  ) {}

  async snapshot(): Promise<TelemetryData[]> {
    try {
      const devices = await this.sql.query<{ id: string }>(
        "SELECT id FROM devices WHERE status = 'online'",
      );
      const buffers = await Promise.allSettled(
        devices.map((device) => this.realtime.ringBuffer(device.id)),
      );

      const result: TelemetryData[] = [];
      const seen = new Set<string>();
      buffers.forEach((buffer) => {
        if (buffer.status !== "fulfilled") return;
        for (const item of buffer.value) {
          if (!isTelemetryPoint(item)) continue;
          const key = `${item.deviceId}\u0000${item.name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          result.push(item);
        }
      });
      return result;
    } catch {
      return [];
    }
  }
}

/** Veri sınırı doğrulaması — ring buffer'da yabancı/kayıp alanlı kayıt olabilir. */
function isTelemetryPoint(value: unknown): value is TelemetryData {
  if (typeof value !== "object" || value === null) return false;
  const point = value as Record<string, unknown>;
  return (
    typeof point.deviceId === "string" &&
    typeof point.name === "string" &&
    typeof point.timestamp === "string" &&
    point.value !== undefined
  );
}
