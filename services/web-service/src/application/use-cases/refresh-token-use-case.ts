import type { AuthResponse } from "@gd-monorepo/shared-types";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { ITokenService } from "../../domain/services/ITokenService";
import { Result } from "@gd-monorepo/shared-types";

export class RefreshTokenUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly tokens: ITokenService,
  ) {}

  async execute(refreshToken: string): Promise<Result<AuthResponse>> {
    const payload = await this.tokens.verifyRefresh(refreshToken);
    const user = await this.users.findByRefreshToken(refreshToken);
    if (!user || user.id !== payload.sub) {
      return Result.fail("Gecersiz refresh token");
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
