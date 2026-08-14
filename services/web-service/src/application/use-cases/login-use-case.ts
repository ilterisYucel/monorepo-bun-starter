import type { LoginRequest, AuthResponse } from "@gd-monorepo/shared-types";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { ITokenService } from "../../domain/services/ITokenService";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher";
import { Result } from "@gd-monorepo/shared-types";

export class LoginUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly tokens: ITokenService,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(req: LoginRequest): Promise<Result<AuthResponse>> {
    const user = await this.users.findByUsername(req.username);
    if (!user) return Result.fail("Gecersiz kullanici adi veya sifre");

    const hash = await this.users.passwordHashByUsername(req.username);
    if (!hash) return Result.fail("Gecersiz kullanici adi veya sifre");

    const valid = await this.hasher.verify(req.password, hash);
    if (!valid) return Result.fail("Gecersiz kullanici adi veya sifre");

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
}
