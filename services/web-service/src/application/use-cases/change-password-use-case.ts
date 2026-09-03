import type { AuthResponse } from "@gd-monorepo/shared-types";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { ITokenService } from "../../domain/services/ITokenService";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher";
import { Result } from "@gd-monorepo/result";

/**
 * ChangePasswordUseCase — ilk girişte zorunlu şifre değişimi (Faz 1 T1.6).
 * Başarıda must_change_password bayrağı düşer ve YENİ token'lar döner —
 * eski token bayrak true taşıdığı için kullanılamaz halde kalır.
 */
export class ChangePasswordUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
    private readonly tokens: ITokenService,
  ) {}

  async execute(
    userId: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<Result<AuthResponse, string>> {
    const user = await this.users.findById(userId);
    if (!user) return Result.err("Kullanici bulunamadi");

    const hash = await this.users.passwordHashByUsername(user.username);
    if (!hash) return Result.err("Kullanici bulunamadi");

    const valid = await this.hasher.verify(oldPassword, hash);
    if (!valid) return Result.err("Gecersiz mevcut sifre");

    if (oldPassword === newPassword) {
      return Result.err("Yeni sifre eskisinden farkli olmali");
    }

    const newHash = await this.hasher.hash(newPassword);
    const updated = await this.users.update(userId, {
      password_hash: newHash,
      must_change_password: false,
    });

    const [accessToken, refreshToken] = await Promise.all([
      this.tokens.signAccess(updated),
      this.tokens.signRefresh(updated),
    ]);

    return Result.ok({ accessToken, refreshToken, user: updated });
  }
}
