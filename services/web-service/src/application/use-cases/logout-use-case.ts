import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import { Result } from "@gd-monorepo/shared-types";

export class LogoutUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute(userId: string): Promise<Result<void>> {
    await this.users.clearRefreshToken(userId);
    return Result.ok(undefined);
  }
}
