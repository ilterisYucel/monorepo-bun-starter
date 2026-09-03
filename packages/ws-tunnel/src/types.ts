/**
 * ws-tunnel jenerik alan tipleri — GD-PMS'ye özgü DEĞİLDİR.
 *
 * Tünel bu tipleri YORUMLAMAZ: rolü field tarafı eşler, yetkiyi konteyner
 * RBAC'ı uygular; telemetri noktaları opak veridir (yalnızca kanaldan taşınır).
 * Tüketiciler kendi domain tiplerini bu şekillere eşler (monorepo örnekleri:
 * `session-user-map.ts`, `RealtimeSnapshotSource`).
 */

/** Tünel rolü — serbest string; eşleme/doğrulama tüketiciye aittir. */
export type TunnelRole = string;

/** Oturum kullanıcısı — field tarafında EŞLENMİŞ konteyner rolüyle. */
export interface TunnelUser {
  id: string;
  username: string;
  role: TunnelRole;
}

/** Kanaldan taşınan en küçük telemetri noktası sözleşmesi. */
export interface TunnelTelemetryPoint {
  deviceId: string;
  name: string;
  value: number | boolean | string;
  timestamp: string;
  unit?: string;
  description?: string;
  tags?: Record<string, string>;
}
