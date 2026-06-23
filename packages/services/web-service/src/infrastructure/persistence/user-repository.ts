import { PostgresAdapter } from "@gd-monorepo/core";
import type { Role, User } from "@gd-monorepo/shared-types";
import type { SeedUser } from "../../config/default";
import type { IUserRepository } from "../../domain/repositories/IUserRepository";

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  role: Role;
  name: string;
  refresh_token: string | null;
  refresh_token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    username: row.username,
    role: row.role,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class UserRepository implements IUserRepository {
  constructor(private readonly db: PostgresAdapter) {}

  async initialize(seeds?: SeedUser[]): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teknik', 'guest')),
        name VARCHAR(200) NOT NULL,
        refresh_token TEXT,
        refresh_token_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const count = await this.db.queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM users",
    );
    if (seeds && parseInt(count?.count ?? "0") === 0) {
      for (const seed of seeds) {
        const hash = await Bun.password.hash(seed.password);
        await this.db.execute(
          "INSERT INTO users (username, password_hash, role, name) VALUES ($1, $2, $3, $4)",
          [seed.username, hash, seed.role, seed.name],
        );
      }
      console.log(`[UserRepository] ${seeds.length} varsayilan kullanici olusturuldu`);
    }
  }

  async findByUsername(username: string): Promise<User | undefined> {
    const row = await this.db.queryOne<UserRow>(
      "SELECT * FROM users WHERE username = $1",
      [username],
    );
    return row ? toUser(row) : undefined;
  }

  async findById(id: string): Promise<User | undefined> {
    const row = await this.db.queryOne<UserRow>(
      "SELECT * FROM users WHERE id = $1",
      [id],
    );
    return row ? toUser(row) : undefined;
  }

  async create(
    username: string,
    passwordHash: string,
    role: Role,
    name: string,
  ): Promise<User> {
    const row = await this.db.queryOne<UserRow>(
      `INSERT INTO users (username, password_hash, role, name)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [username, passwordHash, role, name],
    );
    return toUser(row!);
  }

  async update(
    id: string,
    fields: {
      username?: string;
      password_hash?: string;
      role?: Role;
      name?: string;
    },
  ): Promise<User> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (fields.username !== undefined) {
      sets.push(`username = $${i++}`);
      params.push(fields.username);
    }
    if (fields.password_hash !== undefined) {
      sets.push(`password_hash = $${i++}`);
      params.push(fields.password_hash);
    }
    if (fields.role !== undefined) {
      sets.push(`role = $${i++}`);
      params.push(fields.role);
    }
    if (fields.name !== undefined) {
      sets.push(`name = $${i++}`);
      params.push(fields.name);
    }

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const row = await this.db.queryOne<UserRow>(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      params,
    );
    return toUser(row!);
  }

  async delete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM users WHERE id = $1", [id]);
  }

  async list(): Promise<User[]> {
    const rows = await this.db.query<UserRow>(
      "SELECT * FROM users ORDER BY created_at ASC",
    );
    return rows.map(toUser);
  }

  async passwordHashByUsername(username: string): Promise<string | undefined> {
    const row = await this.db.queryOne<{ password_hash: string }>(
      "SELECT password_hash FROM users WHERE username = $1",
      [username],
    );
    return row?.password_hash;
  }

  async storeRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<void> {
    await this.db.execute(
      "UPDATE users SET refresh_token = $1, refresh_token_expires_at = $2 WHERE id = $3",
      [token, expiresAt.toISOString(), userId],
    );
  }

  async findByRefreshToken(token: string): Promise<User | undefined> {
    const row = await this.db.queryOne<UserRow>(
      "SELECT * FROM users WHERE refresh_token = $1 AND refresh_token_expires_at > NOW()",
      [token],
    );
    return row ? toUser(row) : undefined;
  }

  async clearRefreshToken(userId: string): Promise<void> {
    await this.db.execute(
      "UPDATE users SET refresh_token = NULL, refresh_token_expires_at = NULL WHERE id = $1",
      [userId],
    );
  }
}
