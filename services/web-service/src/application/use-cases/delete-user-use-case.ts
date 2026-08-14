import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import { Result } from "@gd-monorepo/shared-types";

export class DeleteUserUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute(id: string, currentUserId: string): Promise<Result<void>> {
    if (id === currentUserId) return Result.fail("Kendinizi silemezsiniz");
    await this.users.delete(id);
    return Result.ok(undefined);
  }
}
