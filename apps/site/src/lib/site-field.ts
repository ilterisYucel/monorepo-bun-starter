// apps/demo-site/src/lib/site-field.ts
import type { Role, User } from "@gd-monorepo/shared-types";

/**
 * Tek saha kimliği — compose env'inden (VITE_FIELD_ID, backend FIELD_ID ile
 * aynı kaynak). Demo-field sahaya özeldir; saha listesi çözümü yoktur.
 */
export function siteFieldId(): string {
  return import.meta.env.VITE_FIELD_ID ?? "";
}

export type PostLoginDestination = { path: string } | { error: string };

/**
 * Giriş sonrası hedef rota (saf — test edilir; yan etki yok).
 *
 * Öncelik sırası (SITE-MIMARISI UC-4, FR-4.2):
 * 1. `user.mustChangePassword === true` ve rol `guest` değil → `{ path: "/change-password" }`.
 *    Saha kimliği kontrolünden ÖNCE gelir: şifre değişimi saha kimliği olmadan da yapılabilir.
 * 2. Saha kimliği boş → `{ error }` (beklenen hata; sessiz takılma yok).
 * 3. Diğer → `{ path: "/projects" }` (UC-11 portföy sayfası).
 *
 * `guest` istisnası: otomatik misafir oturumu şifre değişimi bekleyemez (AUTH;
 * backend rbac de guest'i muaf tutar). MFA kayıt yönlendirmesi YOKTUR (SITE A3);
 * `mfaRequiredRoles` imza uyumu için alınır, kullanılmaz.
 */
export function postLoginDestination(
  user: User,
  _mfaRequiredRoles: Role[],
  fieldId: string,
): PostLoginDestination {
  if (user.mustChangePassword === true && user.role !== "guest") {
    return { path: "/change-password" };
  }
  if (fieldId.length === 0) {
    return { error: "Saha kimligi tanimsiz (VITE_FIELD_ID)" };
  }
  return { path: "/projects" };
}
