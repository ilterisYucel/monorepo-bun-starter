import type { User, Role } from "@gd-monorepo/shared-types";
import type { SeedUser } from "../../config/default";

export interface IUserRepository {
  initialize(seeds?: SeedUser[]): Promise<void>;

  findByUsername(username: string): Promise<User | undefined>;
  findById(id: string): Promise<User | undefined>;
  usersByFieldIds(fieldIds: string[]): Promise<User[]>;
  list(): Promise<User[]>;

  create(username: string, passwordHash: string, role: Role, name: string, fieldIds?: string[]): Promise<User>;

  update(
    id: string,
    fields: {
      username?: string;
      password_hash?: string;
      role?: Role;
      name?: string;
      field_ids?: string[];
    },
  ): Promise<User>;

  delete(id: string): Promise<void>;

  passwordHashByUsername(username: string): Promise<string | undefined>;

  storeRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  findByRefreshToken(token: string): Promise<User | undefined>;
  clearRefreshToken(userId: string): Promise<void>;
}
