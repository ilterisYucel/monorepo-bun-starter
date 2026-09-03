import { authenticator } from "otplib";
import type { ITotpService } from "../../domain/services/ITotpService";

/** TOTP servis yapılandırması — tek obje (DI kuralı 3). */
export interface TotpServiceConfig {
  /** otpauth URI'sinde görünen uygulama adı (ör. "GD-EMS"). */
  readonly issuer: string;
  /** Doğrulama penceresi (adım sayısı — varsayılan ±1). */
  readonly window?: number;
}

/**
 * OtpLibTotpService — RFC 6238 TOTP (HMAC-SHA1, 30 sn) otplib implementasyonu.
 *
 * Global otplib ayarları MUTASYONA uğratılmaz: her doğrulama `clone()` edilen
 * instance üzerinde çalışır; `now` deterministik testler için epoch olarak
 * enjekte edilir (RFC 6238 Ek B vektörleri).
 */
export class OtpLibTotpService implements ITotpService {
  constructor(private readonly config: TotpServiceConfig) {}

  generateSecret(): string {
    return authenticator.generateSecret();
  }

  otpauthUri(secret: string, username: string): string {
    return authenticator.keyuri(username, this.config.issuer, secret);
  }

  isCodeValid(secret: string, code: string, now?: Date): boolean {
    if (!/^\d{6}$/.test(code)) return false;
    try {
      const instance = authenticator.clone();
      instance.options = {
        ...instance.options,
        window: this.config.window ?? 1,
        ...(now
          ? { epoch: now.getTime() }
          : {}),
      };
      return instance.check(code, secret);
    } catch {
      return false;
    }
  }
}
