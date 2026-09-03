import type { User } from "@gd-monorepo/shared-types";
import type { ContainerSessionUser, TunnelUser } from "@gd-monorepo/ws-tunnel";

/**
 * SessionUserMap — GD-PMS `User` ↔ ws-tunnel `TunnelUser` sınır eşlemesi.
 *
 * - `toTunnelUser`: field kullanıcısını tünele taşır — YALNIZCA tünelin
 *   bildiği alanlar (id/username/role) gider; fieldIds/mustChangePassword
 *   gibi domain alanları sızmaz.
 * - `toWebUser`: konteyner oturum kullanıcısını web-service `User`'ına
 *   genişletir (rbac yüzeyi için) — geçici oturum kullanıcısıdır:
 *   fieldIds boş, mustChangePassword yok (field tarafında doğrulandı).
 */
export function toTunnelUser(user: User): TunnelUser {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

export function toWebUser(sessionUser: ContainerSessionUser): User {
  return {
    id: sessionUser.id,
    username: sessionUser.username,
    role: sessionUser.role as User["role"],
    name: sessionUser.username,
    fieldIds: [],
    mustChangePassword: false,
    createdAt: "",
    updatedAt: "",
  };
}
