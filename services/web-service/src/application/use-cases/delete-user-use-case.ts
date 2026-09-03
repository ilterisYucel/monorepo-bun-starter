import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import { Result } from "@gd-monorepo/result";

export class DeleteUserUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute(id: string, currentUserId: string): Promise<Result<void, string>> {
    if (id === currentUserId) return Result.err("Kendinizi silemezsiniz");
    await this.users.delete(id);
    return Result.okVoid();
  }
}
