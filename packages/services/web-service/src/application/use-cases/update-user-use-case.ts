import type { UpdateUserRequest, User, Role } from "@gd-monorepo/shared-types";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";
import type { IPasswordHasher } from "../../domain/services/IPasswordHasher";
import { Result } from "@gd-monorepo/shared-types";

export class UpdateUserUseCase {
  constructor(
    private readonly users: IUserRepository,
    private readonly hasher: IPasswordHasher,
  ) {}

  async execute(id: string, req: UpdateUserRequest): Promise<Result<User>> {
    const user = await this.users.findById(id);
    if (!user) return Result.fail("Kullanici bulunamadi");

    const updates: {
      username?: string;
      password_hash?: string;
      role?: Role;
      name?: string;
    } = {};

    if (req.username !== undefined) updates.username = req.username;
    if (req.password !== undefined) {
      updates.password_hash = await this.hasher.hash(req.password);
    }
    if (req.role !== undefined) updates.role = req.role;
    if (req.name !== undefined) updates.name = req.name;

    const updated = await this.users.update(id, updates);
    return Result.ok(updated);
  }
}
