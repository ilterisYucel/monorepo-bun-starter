// apps/container-web/src/lib/api-base.ts
/**
 * Faz 4 T4.3 — çalışma zamanı URL türetimi.
 *
 * Build-time `VITE_WS_URL=ws://localhost:5001` gömme bug'ının kök nedeniydi
 * (tasarım §6.1). API/WS adresleri artık `window.location`'dan türetilir:
 * - Normal mod (SPA "/" altında): api="/api", ws="/ws/telemetry"
 * - Tünel modu (SPA "/containers/:cid/ui/" altında):
 *   api="/containers/:cid/ui/api", ws="/containers/:cid/ui/ws/telemetry"
 *   → iframe istekleri cookie (Path-scoped) ile otomatik taşınır.
 *
 * Faz 5.1 düzeltmesi: tünel tespiti YALNIZCA `/containers/:cid/ui` önekine
 * bakar. Eski davranış ("her alt yol = tünel") normal SPA route'larında
 * (/dashboard, /login, /change-password) sert yenileme sonrası API tabanını
 * "/change-password/api" gibi yanlış yola donduruyordu — tüm istekler 404,
 * login formu "Giriş başarısız" gösteriyordu (canlı, 2026-08-26).
 */

export interface LocationLike {
  protocol: string;
  host: string;
  pathname: string;
}

/** Uygulamanın hizmet edildiği dizin — pathname'den türetilir. */
export function appDirPath(location: LocationLike): string {
  return location.pathname.replace(/\/+$/, "");
}

/** Tünel öneki deseni — `/containers/<cid>/ui` (Faz 3 §5.4). */
const TUNNEL_PATH = /^\/containers\/[^/]+\/ui(?:\/|$)/;

/** Tünel kök dizini — pathname'deki `/ui` sınırına kadar (SPA alt route'ları hariç). */
function tunnelRoot(location: LocationLike): string | undefined {
  const match = location.pathname.match(/^(\/containers\/[^/]+\/ui)/);
  return match ? match[1] : undefined;
}

/** Tünel modu mu? — SPA `/containers/:cid/ui` altında mı (Faz 5.1: yalnız bu önek). */
export function isTunnelMode(location: LocationLike = window.location): boolean {
  // file:// (Electron LCD) tünel değildir.
  if (!location.host) return false;
  return TUNNEL_PATH.test(location.pathname);
}

/** API taban yolu — her zaman MUTLAK path (örn. "/api" veya "/containers/c1/ui/api"). */
export function apiBaseUrl(location: LocationLike = window.location): string {
  // file:// (Electron LCD — K4.3): origin yok; eski davranis korunur.
  if (!location.host) return "/api";
  const root = tunnelRoot(location);
  return root ? `${root}/api` : "/api";
}

/** Telemetri WS adresi — geçerli origin + tünel kökü + /ws/telemetry. */
export function wsUrl(location: LocationLike = window.location): string {
  // file:// (Electron LCD — konteynerin kendisinde kosar): yerel web-service.
  // CSP connect-src http://localhost:* bu adresi zaten kapsar (K4.3).
  if (!location.host) return "ws://localhost:5001/ws/telemetry";
  const protocol = location.protocol === "https:" ? "wss://" : "ws://";
  const root = tunnelRoot(location);
  return `${protocol}${location.host}${root ?? ""}/ws/telemetry`;
}

/**
 * HttpOnly cookie JS'ten görünmez — `document.cookie` ile tünel tespiti
 * YAPILAMAZ. Tünel modu pathname'den belirlenir (`isTunnelMode`). Bu yardımcı
 * yalnızca tanı amaçlı kalır (non-HttpOnly senaryolar).
 */
export function hasContainerSessionCookie(): boolean {
  return document.cookie
    .split(";")
    .some((part) => part.trim().startsWith("container_session="));
}

/**
 * Faz 5.1 — hash router (T4.2) uyumlu rota yolu.
 *
 * Router `createHashRouter` olduğundan tam sayfa yönlendirmeleri pathname
 * yerine HASH'e yazılmalıdır; pathname'e yazılan URL (örn. "/change-password")
 * sayfa yüklenince boş hash'le "/" rotasına düşer (canlı: kullanıcı
 * /change-password URL'inde DASHBOARD görüyordu — yönlendirme döngüsü).
 */
export function hashRoute(path: string): string {
  if (path.startsWith("#")) return path;
  return `#${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Faz 5.1 — giriş sonrası hedef rota: must-change kullanıcı doğrudan şifre
 * değişim sayfasına gider (403 round-trip'i yaşamadan).
 */
export function postLoginRoute(
  user: { mustChangePassword?: boolean } | null | undefined,
): string {
  return user?.mustChangePassword ? "/change-password" : "/dashboard";
}
