import type { AuthResponse } from "@gd-monorepo/shared-types";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { ITokenService } from "../../domain/services/ITokenService";
import { Result } from "@gd-monorepo/result";

/**
 * Refresh token rotasyonu — K4 + K5 (2026-09-23).
 *
 * Sözleşme:
 * - `verifyRefresh` BAŞARISIZSA (imza/süre/type) → `Result.err("Gecersiz
 *   refresh token")`; reuse tespiti YAPILMAZ (repo'ya dokunulmaz).
 * - İmza geçerli ama token'ın SHA-256 hash'i DB'de YOKSA → K5 reuse tespiti:
 *   rotasyonlanmış/iptal edilmiş token yeniden sunuldu (olası hırsızlık).
 *   Fail-closed: saklı token da iptal edilir (`clearRefreshToken(sub)`) —
 *   çift sekmede iki taraf da düşer (K2+K5 kabul edilen davranış).
 * - Başarı: yeni access+refresh çifti üretilir; yeni refresh token'ın hash'i
 *   depolanır (rotasyon — eski token artık geçersizdir).
 *
 * Hata kategorisi: oturum sonu = BEKLENEN hata → `Result.err` (401).
 * Yan etki: yalnızca `storeRefreshToken`/`clearRefreshToken` (DB).
 * Limit: kullanıcı başına TEK refresh token (K2) — çoklu oturum tablosu yok.
 */
export class RefreshTokenUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly tokens: ITokenService,
  ) {}

  async execute(refreshToken: string): Promise<Result<AuthResponse, string>> {
    let payload: { sub: string; jti: string };
    try {
      payload = await this.tokens.verifyRefresh(refreshToken);
    } catch {
      // İmza/süre/type geçersiz — reuse tespiti YAPILMAZ (K5 yalnızca
      // geçerli imzalı ama DB'de bulunmayan token'lar içindir).
      return Result.err("Gecersiz refresh token");
    }

    const user = await this.users.findByRefreshToken(refreshToken);
    if (!user || user.id !== payload.sub) {
      // K5: geçerli imzalı token DB'de yok (veya başka kullanıcıya bağlı) →
      // reuse. Fail-closed: `sub`'a ait saklı token da iptal edilir.
      await this.users.clearRefreshToken(payload.sub);
      return Result.err("Gecersiz refresh token");
    }

    const [accessToken, newRefreshToken] = await Promise.all([
      this.tokens.signAccess(user),
      this.tokens.signRefresh(user),
    ]);

    await this.users.storeRefreshToken(
      user.id,
      newRefreshToken,
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    );

    return Result.ok({ accessToken, refreshToken: newRefreshToken, user });
  }
}
