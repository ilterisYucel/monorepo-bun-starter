import type { AuthResponse, MfaLoginRequest } from "@gd-monorepo/shared-types";

import { Result } from "@gd-monorepo/result";

import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { ITokenService } from "../../domain/services/ITokenService";
import type { ITotpService } from "../../domain/services/ITotpService";
import type { ITotpThrottle } from "../../domain/services/ITotpThrottle";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import { sha256Hex } from "../../infrastructure/auth/service-token";

/** 2026-08-30 (T1.6) — throttle kilit mesajı (route 429 döner). */
export const MFA_LOCKED_MESSAGE = "MFA dogrulamasi gecici kilitli";

/**
 * MfaLoginUseCase — Faz 6 T6.1: MFA girişinin ikinci adımı.
 *
 * Şifre adımı geçildikten sonra üretilen kısa ömürlü `mfaToken` ile gelen
 * kodu doğrular. Kod sırası: önce TOTP (30 sn pencere), başarısızsa TEK
 * KULLANIMLIK kurtarma kodu (hash eşleşmesi — kod yanar). İkisi de
 * başarısızsa `mfa_login_failed` security logu (username bağlamında; log
 * hatası akışı crash etmez — başarısız giriş zaten reddedilmiştir).
 * Başarıda yeni access + refresh token'lar döner.
 *
 * 2026-08-30 (T1.6): opsiyonel `throttle` — kod denemeleri kullanıcı başına
 * sınırlanır (ASVS V3.5.2); kilitliyken TOTP/kurtarma kodu DENENMEZ; throttle
 * hatası fail-closed'tır (doğrulama reddedilir).
 */
export class MfaLoginUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly tokens: ITokenService,
    private readonly totp: ITotpService,
    private readonly logger?: TamperLogger,
    private readonly throttle?: ITotpThrottle,
  ) {}

  async execute(req: MfaLoginRequest): Promise<Result<AuthResponse, string>> {
    let sub: string;
    try {
      sub = (await this.tokens.verifyMfa(req.mfaToken)).sub;
    } catch {
      return Result.err("Gecersiz veya suresi dolmus mfa token");
    }

    // T1.6: kilitli kullanıcıda kod denenmez (brute-force koruması).
    if (this.throttle) {
      try {
        if (await this.throttle.isLocked(sub)) {
          await this.logSafe("mfa_login_failed", "security", sub);
          return Result.err(MFA_LOCKED_MESSAGE);
        }
      } catch {
        return Result.err(MFA_LOCKED_MESSAGE);
      }
    }

    const user = await this.users.findById(sub);
    if (!user) return Result.err("Kullanici bulunamadi");

    const secret = await this.users.totpSecretByUserId(user.id);
    if (!secret) return Result.err("MFA yapilandirmasi bulunamadi");

    const totpOk = this.totp.isCodeValid(secret, req.code);
    const recoveryOk = totpOk
      ? false
      : await this.users.consumeRecoveryCode(user.id, sha256Hex(req.code));

    if (!totpOk && !recoveryOk) {
      await this.logSafe("mfa_login_failed", "security", user.username);
      if (this.throttle) {
        try {
          await this.throttle.recordFailure(user.id);
        } catch {
          return Result.err(MFA_LOCKED_MESSAGE);
        }
      }
      return Result.err("Gecersiz dogrulama kodu");
    }

    if (this.throttle) {
      await this.throttle.recordSuccess(user.id).catch(() => {});
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccess(user),
      this.tokens.signRefresh(user),
    ]);

    return Result.ok({ accessToken, refreshToken, user });
  }

  /** Log hatası akışı crash etmez (başarısız giriş zaten reddedilmiştir). */
  private async logSafe(
    eventCode: "mfa_login_failed",
    category: "security",
    username: string,
  ): Promise<void> {
    if (!this.logger) return;
    await this.logger
      .log({
        level: "warn",
        category,
        eventCode,
        message: "MFA dogrulamasi basarisiz",
        context: { username },
      })
      .catch(() => {});
  }
}
