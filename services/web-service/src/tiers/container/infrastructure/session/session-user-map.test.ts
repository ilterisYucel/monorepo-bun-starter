import { describe, it, expect } from "vitest";
import { toTunnelUser, toWebUser } from "./session-user-map";
import type { User } from "@gd-monorepo/shared-types";

/**
 * SessionUserMap — sınır eşleme sözleşmesi:
 * - toTunnelUser yalnızca id/username/role taşır (domain alanları sızmaz)
 * - toWebUser geçici oturum kullanıcısı üretir (fieldIds boş,
 *   mustChangePassword yok)
 */
describe("SessionUserMap", () => {
  const user: User = {
    id: "u-1",
    username: "operator",
    role: "teknik",
    name: "Operator",
    fieldIds: ["f-1"],
    mustChangePassword: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  it("toTunnelUser yalnızca tünel alanlarını taşır", () => {
    const tunnel = toTunnelUser(user);
    expect(tunnel).toEqual({ id: "u-1", username: "operator", role: "teknik" });
    expect("fieldIds" in tunnel).toBe(false);
    expect("mustChangePassword" in tunnel).toBe(false);
  });

  it("toWebUser geçici oturum kullanıcısı üretir", () => {
    const web = toWebUser({ id: "u-1", username: "operator", role: "teknik" });
    expect(web).toEqual({
      id: "u-1",
      username: "operator",
      role: "teknik",
      name: "operator",
      fieldIds: [],
      mustChangePassword: false,
      createdAt: "",
      updatedAt: "",
    });
  });

  it("round-trip: role korunur", () => {
    expect(toWebUser(toTunnelUser(user)).role).toBe("teknik");
  });
});
