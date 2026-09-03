// apps/field/src/lib/site-field.ts
import type { Role, User } from "@gd-monorepo/shared-types";

/**
 * Tek saha kimliği — compose env'inden (VITE_FIELD_ID, backend FIELD_ID ile
 * aynı kaynak). Field app sahaya özeldir; saha listesi çözümü yoktur
 * (2026-08-28 kararı).
 */
export function siteFieldId(): string {
  return import.meta.env.VITE_FIELD_ID ?? "";
}

export type PostLoginDestination =
  | { path: string }
  | { error: string };

/**
 * Giriş sonrası hedef rotayı üretir (saf — test edilir):
 * - mustChangePassword → /change-password (T1.6)
 * - MFA zorunlu rol + kayıt yok → /mfa-enroll (Faz 6; MFA_ENABLED=false ise
 *   roller listesi boş gelir — bu dal hiç çalışmaz)
 * - boss → /map
 * - diğer → /field/<fieldId>; fieldId boşsa açık hata (sessiz takılma yok)
 */
export function postLoginDestination(
  user: User,
  mfaRequiredRoles: Role[],
  fieldId: string,
): PostLoginDestination {
  if (user.mustChangePassword) {
    return { path: "/change-password" };
  }
  if (mfaRequiredRoles.includes(user.role) && user.mfaEnabled !== true) {
    return { path: "/mfa-enroll" };
  }
  if (user.role === "boss") {
    return { path: "/map" };
  }
  if (fieldId.length === 0) {
    return { error: "Saha kimligi tanimsiz (VITE_FIELD_ID)" };
  }
  return { path: `/field/${fieldId}` };
}
