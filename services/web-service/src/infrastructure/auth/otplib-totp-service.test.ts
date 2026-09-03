import { describe, it, expect } from "vitest";
import { OtpLibTotpService } from "./otplib-totp-service";
import type { ITotpService } from "../../domain/services/ITotpService";

/**
 * T6.1 — TOTP servisi sözleşmesi (RFC 6238):
 * - `generateSecret` her çağrıda yeni base32 sır döner.
 * - `otpauthUri` otpauth://totp biçiminde, issuer + kullanıcı adı içerir.
 * - `isCodeValid` 30 sn adımda, ±1 pencere ile doğrular; yanlış kod,
 *   kısa/uzun veya sayısal olmayan kod, bilinmeyen sır → false (throw yok).
 *
 * RFC 6238 Ek B test vektörü: ASCII anahtar "12345678901234567890";
 * base32 karşılığı GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ. RFC tablosu 8 haneli
 * HOTP çıktısı verir — otplib/Google Authenticator standardı 6 hanelidir;
 * T=59 → RFC 94287082 → son 6 hane 287082 (counter 1).
 */
const RFC_SECRET_BASE32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

function makeService(): ITotpService {
  return new OtpLibTotpService({ issuer: "GD-EMS" });
}

describe("OtpLibTotpService.generateSecret (T6.1)", () => {
  it("her çağrıda yeni bir sır döner (base32)", () => {
    const service = makeService();
    const a = service.generateSecret();
    const b = service.generateSecret();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(16);
  });
});

describe("OtpLibTotpService.otpauthUri (T6.1)", () => {
  it("otpauth://totp URI'si issuer ve kullanıcıyı taşır", () => {
    const service = makeService();
    const uri = service.otpauthUri("ABCDEF234567", "admin");
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("issuer=GD-EMS");
    expect(uri).toContain("secret=");
  });
});

describe("OtpLibTotpService.isCodeValid (T6.1)", () => {
  it("RFC 6238 vektörü: T=59 → 94287082 (6 haneli: 287082) geçerli", () => {
    const service = makeService();
    expect(
      service.isCodeValid(RFC_SECRET_BASE32, "287082", new Date(59_000)),
    ).toBe(true);
  });

  it("pencere içi komşu adımlar geçerlidir (±30 sn)", () => {
    const service = makeService();
    // T=59'daki kod (287082), 30 sn önce/sonra üretilen kodla eşleşir:
    expect(
      service.isCodeValid(RFC_SECRET_BASE32, "287082", new Date(89_000)),
    ).toBe(true);
    expect(
      service.isCodeValid(RFC_SECRET_BASE32, "287082", new Date(29_000)),
    ).toBe(true);
  });

  it("pencere dışı reddedilir", () => {
    const service = makeService();
    expect(
      service.isCodeValid(RFC_SECRET_BASE32, "287082", new Date(240_000)),
    ).toBe(false);
  });

  it("yanlış kod reddedilir", () => {
    const service = makeService();
    expect(
      service.isCodeValid(RFC_SECRET_BASE32, "000000", new Date(59_000)),
    ).toBe(false);
  });

  it("sayısal olmayan/boş kod throw etmez — false döner", () => {
    const service = makeService();
    expect(service.isCodeValid(RFC_SECRET_BASE32, "", new Date(59_000))).toBe(false);
    expect(service.isCodeValid(RFC_SECRET_BASE32, "abc", new Date(59_000))).toBe(false);
  });
});
