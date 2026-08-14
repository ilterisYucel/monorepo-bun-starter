import type { User } from "@gd-monorepo/shared-types";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import { Result } from "@gd-monorepo/shared-types";

export class ListUsersUseCase {
  constructor(private readonly users: IUserRepository) {}

  async execute(): Promise<Result<User[]>> {
    const users = await this.users.list();
    return Result.ok(users);
  }
}
