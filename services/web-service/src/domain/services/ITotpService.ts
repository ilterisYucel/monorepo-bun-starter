import type { ITotpService } from "../../domain/services/ITotpService";

/**
 * TOTP servisi sözleşmesi (T6.1) — RFC 6238 (TOTP, HMAC-SHA1, 30 sn adım).
 *
 * İmplementasyonlar deterministik olmalıdır; `isCodeValid` beklenen alan
 * hatasında (yanlış kod) throw ETMEZ — boolean döner. Üretim implementasyonu:
 * `OtpLibTotpService` (otplib).
 */
export interface ITotpService {
  /** Yeni base32 sır üretir (RFC 4648) — kullanıcı QR/manuel kayıt için alır. */
  generateSecret(): string;

  /** otpauth://totp URI'si üretir — authenticator uygulamasına QR ile aktarılır. */
  otpauthUri(secret: string, username: string): string;

  /**
   * Kodu doğrular (query) — 30 sn adımda ±1 pencere. `now` verilmezse geçerli
   * saat kullanılır; verilirse test/deterministik doğrulama içindir.
   */
  isCodeValid(secret: string, code: string, now?: Date): boolean;
}
