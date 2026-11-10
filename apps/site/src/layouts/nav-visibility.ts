import type { Role } from "@gd-monorepo/shared-types";

/**
 * Saha uygulaması menü görünürlük sözleşmesi (2026-08-30):
 * - admin/teknik: tüm menü + acil durdurma.
 * - boss (Patron): asset yönetimi + veri; Kontrol (manevra) ve acil durdurma
 *   YOKTUR (backend rbac de 403 verir — UI katmanı gizlemesi).
 * - guest/developer: yalnız Panel (dashboard) — salt-okunur.
 */

export const ALL_NAV_KEYS = [
  "nav.dashboard",
  "nav.containers",
  "nav.pcs",
  "nav.control",
  "nav.eventsShort",
  "nav.reports",
  "nav.devices",
] as const;

export type NavKey = (typeof ALL_NAV_KEYS)[number];

/** Role göre görünür menü anahtarları. */
export function visibleNavKeys(role: Role): NavKey[] {
  if (role === "guest" || role === "developer") return ["nav.dashboard"];
  if (role === "boss") {
    return ALL_NAV_KEYS.filter((key) => key !== "nav.control");
  }
  return [...ALL_NAV_KEYS];
}

/** Acil durdurma butonu yalnız manevra yetkili rollere görünür. */
export function emergencyVisible(role: Role): boolean {
  return role === "admin" || role === "teknik";
}
