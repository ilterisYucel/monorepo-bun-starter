// apps/demo-field/src/lib/site-field.ts
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
 * Giriş sonrası hedef rota (saf — test edilir).
 * Demo kapsamı: MFA/şifre değişimi sayfaları YOKTUR — yalnızca saha ekranı.
 * Saha kimliği yoksa açık hata (sessiz takılma yok).
 */
export function postLoginDestination(
  _user: User,
  _mfaRequiredRoles: Role[],
  fieldId: string,
): PostLoginDestination {
  if (fieldId.length === 0) {
    return { error: "Saha kimligi tanimsiz (VITE_FIELD_ID)" };
  }
  return { path: `/field/${fieldId}` };
}
