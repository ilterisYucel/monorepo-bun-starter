import type { CreateUserRequest, User } from "@gd-monorepo/shared-types";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher";
import { Result } from "@gd-monorepo/shared-types";

export class CreateUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(req: CreateUserRequest): Promise<Result<User>> {
    const existing = await this.users.findByUsername(req.username);
    if (existing) return Result.fail("Bu kullanici adi zaten kullaniliyor");

    const hash = await this.hasher.hash(req.password);
    const user = await this.users.create(req.username, hash, req.role, req.name);
    return Result.ok(user);
  }
}
