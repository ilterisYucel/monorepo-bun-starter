/**
 * Tünel ÜSTÜ telemetri-push mesajı — field→boss uplink sözleşmesi.
 *
 * Bu tipler bilinçli olarak `@gd-monorepo/ws-tunnel` PAKETİNDE DEĞİLDİR: paket
 * yalnız transport taşır; domain mesajları tüketicide (bu modülde) yaşar ve
 * paketin jenerik kontrol kanalından geçer.
 *
 * REV.02: operation/event domain mesajları kaldırıldı (boss→field operasyon
 * hub opak relay HTTP, olaylar HTTP pull — SPEC UC-4/UC-5). Kalan tek domain
 * mesajı telemetri-push uplink'idir (kapsam dışı).
 */

/** Kanaldan taşınan en küçük telemetri noktası. */
export interface TunnelTelemetryPoint {
  deviceId: string;
  name: string;
  value: number | boolean | string;
  timestamp: string;
  unit?: string;
  description?: string;
  tags?: Record<string, string>;
}

/** Snapshot push kaynağı — en güncel değerleri döndürür (boş olabilir). */
export interface ISnapshotSource {
  snapshot(): Promise<TunnelTelemetryPoint[]>;
}

/** Client→Hub: En güncel telemetri snapshot'ı. */
export interface TelemetryMessage {
  type: "telemetry";
  data: TunnelTelemetryPoint[];
}
