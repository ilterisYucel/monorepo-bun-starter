import type { LoginRequest, AuthResponse, MfaRequiredResponse } from "@gd-monorepo/shared-types";

import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { ITokenService } from "../../domain/services/ITokenService";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher";
import type { ILoginThrottle } from "../../domain/services/ILoginThrottle";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import { Result } from "@gd-monorepo/result";


export type LoginOutcome = AuthResponse | MfaRequiredResponse;

export class LoginUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly tokens: ITokenService,
    private readonly hasher: IPasswordHasher,
    private readonly logger?: TamperLogger,
    /** Faz 6 T6.6 — hesap kilidi (opsiyonel: yoksa davranış değişmez). */
    private readonly throttle?: ILoginThrottle,
  ) {}

  async execute(req: LoginRequest): Promise<Result<LoginOutcome, string>> {
    // Faz 6 T6.6: kilitli hesap — doğru şifre dahil her deneme reddedilir.
    if (this.throttle) {
      try {
        if (await this.throttle.isLocked(req.username)) {
          return Result.err("Hesap gecici kilitli");
        }
      } catch {
        return Result.err("Gecici olarak giris yapilamiyor");
      }
    }

    const user = await this.users.findByUsername(req.username);
    if (!user) {
      await this.logLoginSafe("login_failed", "security", req.username);
      await this.recordFailure(req.username);
      return Result.err("Gecersiz kullanici adi veya sifre");
    }

    const hash = await this.users.passwordHashByUsername(req.username);
    if (!hash) {
      await this.logLoginSafe("login_failed", "security", req.username);
      await this.recordFailure(req.username);
      return Result.err("Gecersiz kullanici adi veya sifre");
    }

    const valid = await this.hasher.verify(req.password, hash);
    if (!valid) {
      await this.logLoginSafe("login_failed", "security", req.username);
      await this.recordFailure(req.username);
      return Result.err("Gecersiz kullanici adi veya sifre");
    }

    // Fail-closed (K0.3): audit kaydı tutulamazsa giriş reddedilir —
    // NIS-2 izlenebilirlik garantisi. Password asla log'a girmez.
    try {
      await this.logLogin("login_succeeded", "audit", req.username);
    } catch {
      return Result.err("Denetim kaydi tutulamadi — giris reddedildi");
    }

    await this.recordSuccess(req.username);

    // Faz 6 T6.1: MFA aktif kullanıcı — şifre adımı geçti; kısa ömürlü
    // mfa token'la ikinci adıma yönlendirilir (access/refresh ÜRETİLMEZ).
    if (user.mfaEnabled) {
      const mfaToken = await this.tokens.signMfa(user.id);
      return Result.ok({
        mfaRequired: true,
        mfaToken,
        user,
      });
    }

    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccess(user),
      this.tokens.signRefresh(user),
    ]);

    await this.users.storeRefreshToken(
      user.id,
      refreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return Result.ok({ accessToken, refreshToken, user });
  }

  /**
   * Faz 6 T6.6 — başarısız denemeyi sayaca işler; kilit GEÇİŞİNDE
   * `login_locked` security logu atılır (yalnızca bir kez). Throttle
   * hatasında akış etkilenmez — giriş zaten reddedilmiştir.
   */
  private async recordFailure(username: string): Promise<void> {
    if (!this.throttle) return;
    try {
      const wasLocked = await this.throttle.isLocked(username);
      await this.throttle.recordFailure(username);
      const nowLocked = await this.throttle.isLocked(username);
      if (nowLocked && !wasLocked) {
        await this.logLoginSafe("login_locked", "security", username);
      }
    } catch {
      // throttle erişilemez — giriş zaten red; fail-open riski yok
    }
  }

  private async recordSuccess(username: string): Promise<void> {
    if (!this.throttle) return;
    try {
      await this.throttle.recordSuccess(username);
    } catch {
      // Sayaç temizlenemezse kullanıcı sonraki denemelerde yanlış
      // kilitlenebilir — geçiş anındaki login_locked security logu bunu
      // yakalar; başarılı girişi engellemek daha kötü olur (fail-closed
      // yalnızca başarısız yolda).
    }
  }

  /**
   * Login olayını loglar. Başarısız girişte log hatası yutulur (yanıt zaten
   * reddir); başarılı girişte hata çağırana yayılır — fail-closed.
   */
  private async logLogin(
    eventCode: "login_failed" | "login_succeeded" | "login_locked",
    category: "audit" | "security",
    username: string,
  ): Promise<void> {
    if (!this.logger) return;
    await this.logger.log({
      level: category === "security" ? "warn" : "info",
      category,
      eventCode,
      message:
        eventCode === "login_failed"
          ? "Giris basarisiz"
          : eventCode === "login_locked"
            ? "Hesap gecici kilitlendi"
            : "Giris basarili",
      context: { username },
    });
  }

  /** Başarısız giriş logu — log hatası yanıtı bozmaz (zaten reddedilmiştir). */
  private async logLoginSafe(
    eventCode: "login_failed" | "login_succeeded" | "login_locked",
    category: "audit" | "security",
    username: string,
  ): Promise<void> {
    try {
      await this.logLogin(eventCode, category, username);
    } catch {
      // yanıt zaten red — crash etmez
    }
  }
}
