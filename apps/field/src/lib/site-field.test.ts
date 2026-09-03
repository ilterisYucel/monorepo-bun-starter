import { describe, it, expect } from "vitest";
import type { Role, User } from "@gd-monorepo/shared-types";
import { postLoginDestination, siteFieldId } from "./site-field";

/**
 * postLoginDestination sözleşmesi (2026-08-28):
 * - mustChangePassword → /change-password (T1.6).
 * - MFA zorunlu rol + kayıt yok → /mfa-enroll; kayıtlıysa devam eder.
 * - MFA roller listesi BOŞSA (MFA_ENABLED=false debug) → enroll'a gönderilmez.
 * - boss → /map.
 * - Diğer → /field/<id>; fieldId boşsa AÇIK hata (sessiz takılma yok).
 */

const FIELD_ID = "5d5e49dc-7757-4f3e-a026-0263c2966bc6";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "u-1",
    username: "admin",
    role: "admin",
    name: "Admin",
    fieldIds: [],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("postLoginDestination", () => {
  it("mustChangePassword → /change-password (her rol için öncelikli)", () => {
    const user = makeUser({ mustChangePassword: true, role: "boss" });
    expect(
      postLoginDestination(user, ["admin", "teknik"], FIELD_ID),
    ).toEqual({ path: "/change-password" });
  });

  it("MFA zorunlu rol + kayıt yok → /mfa-enroll", () => {
    const user = makeUser({ role: "admin" });
    expect(
      postLoginDestination(user, ["admin", "teknik"], FIELD_ID),
    ).toEqual({ path: "/mfa-enroll" });
  });

  it("MFA kayıtlıysa → saha ana sayfası", () => {
    const user = makeUser({ role: "admin", mfaEnabled: true });
    expect(
      postLoginDestination(user, ["admin", "teknik"], FIELD_ID),
    ).toEqual({ path: `/field/${FIELD_ID}` });
  });

  it("MFA roller listesi boşsa (debug) → enroll YOK, doğrudan saha", () => {
    const user = makeUser({ role: "admin" });
    expect(postLoginDestination(user, [], FIELD_ID)).toEqual({
      path: `/field/${FIELD_ID}`,
    });
  });

  it("boss → /map", () => {
    const user = makeUser({ role: "boss" });
    expect(postLoginDestination(user, ["admin"], FIELD_ID)).toEqual({
      path: "/map",
    });
  });

  it("fieldId boşsa → açık hata", () => {
    const user = makeUser({ role: "teknik", mfaEnabled: true });
    expect(postLoginDestination(user, [], "")).toEqual({
      error: "Saha kimligi tanimsiz (VITE_FIELD_ID)",
    });
  });

  it("teknik + MFA zorunlu + kayıtlı → kendi sahası", () => {
    const user = makeUser({ role: "teknik", mfaEnabled: true });
    expect(postLoginDestination(user, ["teknik"], FIELD_ID)).toEqual({
      path: `/field/${FIELD_ID}`,
    });
  });
});

describe("siteFieldId", () => {
  it("string döner (tanımsızsa boş)", () => {
    expect(typeof siteFieldId()).toBe("string");
  });
});
