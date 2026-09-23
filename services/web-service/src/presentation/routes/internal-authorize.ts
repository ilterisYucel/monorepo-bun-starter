// Komut/manevra/operasyon yetkilendirme yardımcıları — RBAC admin|teknik
// veya programatik iç token (management-service kanalı).
// Kaynak: field-container-commands deseni (WS4 D3); KOMUT §4 (RBAC + iç token).

import { timingSafeEqual } from "node:crypto";
import type { FastifyRequest } from "fastify";
import type { User } from "@gd-monorepo/shared-types";

/** Programatik istek kullanıcısı — audit "system" açıcı olarak kaydeder. */
export const SYSTEM_USER: User = {
  id: "system",
  username: "system",
  role: "admin",
  name: "system",
  fieldIds: [],
  mustChangePassword: false,
  createdAt: "",
};

/** Timing-safe gizli karşılaştırma — internal token (güvenlik sınırı). */
export function tokenMatches(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Sorgu — komut yetkilendirmesi: geçerli iç token (fail-closed: token
 * env'de YOKSA bu yol KAPALI) veya Bearer admin|teknik. Yetkisiz → undefined.
 */
export function authorizeCommand(
  request: FastifyRequest,
  internalToken: string | undefined,
): User | undefined {
  if (
    internalToken &&
    typeof request.headers["x-internal-token"] === "string" &&
    tokenMatches(request.headers["x-internal-token"], internalToken)
  ) {
    return SYSTEM_USER;
  }
  const user = (request as unknown as { user?: User }).user;
  if (!user) return undefined;
  if (user.role !== "admin" && user.role !== "teknik") return undefined;
  return user;
}
