import type { TunnelTelemetryPoint } from "../types";

/**
 * ISnapshotSource — FieldConnector'ın telemetri push kaynağı (jenerik).
 * `snapshot()` tüm cihazların EN GÜNCEL değerlerini döndürür (boş olabilir).
 * Hata fırlatırsa push atlanır — bağlantı etkilenmez (kademeli bozulma).
 * Monorepo implementasyonu: `RealtimeSnapshotSource` (web-service).
 */
export interface ISnapshotSource {
  snapshot(): Promise<TunnelTelemetryPoint[]>;
}
