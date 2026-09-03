import type { MfaConfirmResponse, MfaEnrollResponse } from "@gd-monorepo/shared-types";

import { Result } from "@gd-monorepo/result";

import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { ITotpService } from "../../domain/services/ITotpService";
import type { ITokenService } from "../../domain/services/ITokenService";
import type { ITotpThrottle } from "../../domain/services/ITotpThrottle";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import { sha256Hex } from "../../infrastructure/auth/service-token";
import { MFA_LOCKED_MESSAGE } from "./mfa-login-use-case";

/** Faz 6 T6.1 — kayıt sırasında üretilen kurtarma kodu sayısı. */
const RECOVERY_CODE_COUNT = 10;

/**
 * MfaEnrollUseCase — Faz 6 T6.1: TOTP kayıt akışı.
 *
 * - `enroll`: yeni sır üretir + saklar (`mfa_enabled` HENÜZ FALSE — kod
 *   doğrulanmadan MFA aktifleşmez); otpauth URI döner.
 * - `confirm`: ilk kodu doğrular; başarıda `enableMfa` + 10 tek kullanımlık
 *   kurtarma kodu üretilir (yalnızca bu yanıtta düz metin görünür — DB'ye
 *   SHA-256 hash yazılır) + mfaEnabled=true claim'li YENİ token'lar döner
 *   (eski access token MFA enforcement'ını geçemez). `mfa_enrolled` audit
 *   logu fail-closed'tur: log yazılamazsa MFA açılmaz.
 * - `reset`: MFA'yı düşürür (sır + kodlar silinir); `mfa_reset` audit
 *   fail-closed (log yazılamazsa sıfırlama yapılmaz).
 *
 * 2026-08-30 (T1.6): `confirm`'de opsiyonel TOTP throttle — ilk kod denemesi
 * brute-force'u da sınırlanır (ASVS V3.5.2).
 */
export class MfaEnrollUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly totp: ITotpService,
    private readonly tokens: ITokenService,
    private readonly logger?: TamperLogger,
    private readonly throttle?: ITotpThrottle,
  ) {}

  async enroll(userId: string): Promise<Result<MfaEnrollResponse, string>> {
    const secret = this.totp.generateSecret();
    const user = await this.users.findById(userId);
    if (!user) return Result.err("Kullanici bulunamadi");

    await this.users.setTotpSecret(userId, secret);
    const otpauthUri = this.totp.otpauthUri(secret, user.username);
    return Result.ok({ secret, otpauthUri });
  }

  async confirm(
    userId: string,
    code: string,
  ): Promise<Result<MfaConfirmResponse, string>> {
    // T1.6: kilitli kullanıcıda kod denenmez.
    if (this.throttle) {
      try {
        if (await this.throttle.isLocked(userId)) {
          await this.logSafe("mfa_login_failed", "warn", "security", userId);
          return Result.err(MFA_LOCKED_MESSAGE);
        }
      } catch {
        return Result.err(MFA_LOCKED_MESSAGE);
      }
    }

    const secret = await this.users.totpSecretByUserId(userId);
    if (!secret) return Result.err("MFA kaydi bulunamadi");

    if (!this.totp.isCodeValid(secret, code)) {
      await this.logSafe("mfa_login_failed", "warn", "security", userId);
      if (this.throttle) {
        try {
          await this.throttle.recordFailure(userId);
        } catch {
          return Result.err(MFA_LOCKED_MESSAGE);
        }
      }
      return Result.err("Gecersiz dogrulama kodu");
    }

    if (this.throttle) {
      await this.throttle.recordSuccess(userId).catch(() => {});
    }

    const recoveryCodes = this.newRecoveryCodes();
    const codeHashes = recoveryCodes.map((code) => sha256Hex(code));

    // Fail-closed: audit logu yazılamazsa MFA AÇILMAZ (T6.1).
    try {
      await this.audit("mfa_enrolled", userId);
    } catch {
      return Result.err("Denetim kaydi tutulamadi — MFA kaydi reddedildi");
    }

    const user = await this.users.enableMfa(userId);
    await this.users.storeRecoveryCodes(userId, codeHashes);

    // Kayıtla birlikte YENİ token'lar: access claim'i mfaEnabled=true taşır —
    // eski token'larla devam edilirse rbac MFA enforcement'ı 403 verir.
    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccess(user),
      this.tokens.signRefresh(user),
    ]);

    return Result.ok({ recoveryCodes, user, accessToken, refreshToken });
  }

  async reset(targetUserId: string): Promise<Result<void, string>> {
    // Fail-closed: audit logu yazılamazsa sıfırlama YAPILMAZ (T6.1).
    try {
      await this.audit("mfa_reset", targetUserId);
    } catch {
      return Result.err("Denetim kaydi tutulamadi — MFA sifirlama reddedildi");
    }
    await this.users.disableMfa(targetUserId);
    return Result.okVoid();
  }

  /** XXXXX-XXXXX biçiminde kriptografik kurtarma kodları. */
  private newRecoveryCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
      const bytes = new Uint8Array(5);
      crypto.getRandomValues(bytes);
      const raw = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"))
        .join("")
        .toUpperCase();
      codes.push(`${raw.slice(0, 5)}-${raw.slice(5)}`);
    }
    return codes;
  }

  private async audit(
    eventCode: "mfa_enrolled" | "mfa_reset",
    userId: string,
  ): Promise<void> {
    if (!this.logger) return;
    await this.logger.log({
      level: "info",
      category: "audit",
      eventCode,
      message:
        eventCode === "mfa_enrolled"
          ? "MFA kaydi tamamlandi"
          : "MFA sifirlandi",
      context: { userId },
    });
  }

  private async logSafe(
    eventCode: "mfa_login_failed",
    level: "warn",
    category: "security",
    userId: string,
  ): Promise<void> {
    if (!this.logger) return;
    await this.logger
      .log({
        level,
        category,
        eventCode,
        message: "MFA dogrulamasi basarisiz",
        context: { userId },
      })
      .catch(() => {});
  }
}
