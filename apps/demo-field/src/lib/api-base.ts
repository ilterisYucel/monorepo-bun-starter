// apps/field/src/lib/api-base.ts
/**
 * Boss Faz 3 — çalışma zamanı URL türetimi (container-web api-base deseni).
 *
 * Field uygulaması boss'tan uplink tüneliyle `/fields/:fid/ui/*` altında
 * iframe'de açıldığında API tabanı o alt yoldan türetilir; normal saha
 * modunda ("/field/:fid" rotaları) "/api" kalır.
 * - Tünel modu: api = "/fields/:fid/ui/api" → iframe istekleri
 *   `field_session` cookie'sini (Path-scoped) otomatik taşır.
 * - Tünel tespiti YALNIZCA `/fields/<fid>/ui` önekiyle yapılır (container-web
 *   Faz 5.1 düzeltmesinin karşılığı — alt rotalar yanlış pozitif üretmez).
 */

export interface LocationLike {
  protocol: string;
  host: string;
  pathname: string;
}

const TUNNEL_PATH = /^\/fields\/[^/]+\/ui(?:\/|$)/;

function tunnelRoot(location: LocationLike): string | undefined {
  const match = location.pathname.match(/^(\/fields\/[^/]+\/ui)/);
  return match ? match[1] : undefined;
}

/** Tünel modu mu? — SPA `/fields/:fid/ui` altında mı. */
export function isTunnelMode(location: LocationLike = window.location): boolean {
  if (!location.host) return false;
  return TUNNEL_PATH.test(location.pathname);
}

/** API taban yolu — her zaman MUTLAK path ("/api" veya "/fields/fid/ui/api"). */
export function apiBaseUrl(location: LocationLike = window.location): string {
  if (!location.host) return "/api";
  const root = tunnelRoot(location);
  return root ? `${root}/api` : "/api";
}

/**
 * Saha kök rotası — tünel modunda `/fields/<fid>/ui` (boss iframe'i),
 * normal modda `/field/<fid>`. Tüm sayfa-içi navigasyonlar bu kökten
 * türetilir — tunnel içinde çıplak /field/... yolları boss'ta 404'e düşer.
 */
export function fieldRootPath(
  fieldId: string,
  location: LocationLike = window.location,
): string {
  const root = tunnelRoot(location);
  return root ?? `/field/${fieldId}`;
}
