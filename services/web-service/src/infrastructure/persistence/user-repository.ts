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
  field_ids: string[] | null;
  must_change_password: boolean | null;
  totp_secret: string | null;
  mfa_enabled: boolean | null;
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
    fieldIds: row.field_ids ?? undefined,
    mustChangePassword: row.must_change_password ?? false,
    mfaEnabled: row.mfa_enabled ?? false,
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
        role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teknik', 'guest', 'boss', 'developer')),
        name VARCHAR(200) NOT NULL,
        field_ids UUID[] DEFAULT '{}',
        must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
        refresh_token TEXT,
        refresh_token_expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 2026-08-30 ROL GÜNCELLEMESİ: developer rolü eklendi — mevcut kurulumlar
    // için role CHECK constraint'i yenilenir (anonim constraint'in varsayılan
    // adı users_role_check'tir; yoksa IF EXISTS sessiz geçer).
    await this.db.execute(
      "ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check",
    );
    await this.db.execute(
      `ALTER TABLE users ADD CONSTRAINT users_role_check
       CHECK (role IN ('admin', 'teknik', 'guest', 'boss', 'developer'))`,
    );

    // Faz 1 T1.6: mevcut kurulumlar için zorunlu değişim kolonu migrasyonu
    await this.db.execute(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE",
    );

    // Faz 6 T6.1: MFA kolonları + kurtarma kodu tablosu migrasyonu
    await this.db.execute(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT",
    );
    await this.db.execute(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE",
    );
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS mfa_recovery (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash TEXT NOT NULL,
        used BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await this.db.execute(
      "CREATE INDEX IF NOT EXISTS idx_users_refresh_token ON users (refresh_token)",
    );

    if (seeds) {
      for (const seed of seeds) {
        const hash = await Bun.password.hash(seed.password);
        await this.db.execute(
          `INSERT INTO users (username, password_hash, role, name, must_change_password)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (username) DO NOTHING`,
          [
            seed.username,
            hash,
            seed.role,
            seed.name,
            seed.mustChangePassword ?? false,
          ],
        );
      }
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
    fieldIds?: string[],
  ): Promise<User> {
    const row = await this.db.queryOne<UserRow>(
      `INSERT INTO users (username, password_hash, role, name, field_ids)
       VALUES ($1, $2, $3, $4, $5::uuid[]) RETURNING *`,
      [username, passwordHash, role, name, fieldIds ?? []],
    );
    if (!row) throw new Error(`Failed to create user: ${username}`);
    return toUser(row);
  }

  async update(
    id: string,
    fields: {
      username?: string;
      password_hash?: string;
      role?: Role;
      name?: string;
      field_ids?: string[];
      must_change_password?: boolean;
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
    if (fields.field_ids !== undefined) {
      sets.push(`field_ids = $${i++}::uuid[]`);
      params.push(fields.field_ids);
    }
    if (fields.must_change_password !== undefined) {
      sets.push(`must_change_password = $${i++}`);
      params.push(fields.must_change_password);
    }

    sets.push(`updated_at = NOW()`);
    params.push(id);

    const row = await this.db.queryOne<UserRow>(
      `UPDATE users SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      params,
    );
    if (!row) throw new Error(`Failed to update user: ${id}`);
    return toUser(row);
  }

  async delete(id: string): Promise<void> {
    await this.db.execute("DELETE FROM users WHERE id = $1", [id]);
  }

  async usersByFieldIds(fieldIds: string[]): Promise<User[]> {
    const rows = await this.db.query<UserRow>(
      "SELECT * FROM users WHERE field_ids && $1::uuid[] ORDER BY created_at ASC",
      [fieldIds],
    );
    return rows.map(toUser);
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

  // ===== Faz 6 T6.1 — MFA (TOTP) =====

  async totpSecretByUserId(userId: string): Promise<string | undefined> {
    const row = await this.db.queryOne<{ totp_secret: string | null }>(
      "SELECT totp_secret FROM users WHERE id = $1",
      [userId],
    );
    return row?.totp_secret ?? undefined;
  }

  async setTotpSecret(userId: string, secret: string): Promise<void> {
    await this.db.execute(
      "UPDATE users SET totp_secret = $1, mfa_enabled = FALSE, updated_at = NOW() WHERE id = $2",
      [secret, userId],
    );
  }

  async enableMfa(userId: string): Promise<User> {
    const row = await this.db.queryOne<UserRow>(
      "UPDATE users SET mfa_enabled = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *",
      [userId],
    );
    if (!row) throw new Error(`Failed to enable MFA for user: ${userId}`);
    return toUser(row);
  }

  async disableMfa(userId: string): Promise<User> {
    const row = await this.db.queryOne<UserRow>(
      `UPDATE users SET mfa_enabled = FALSE, totp_secret = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [userId],
    );
    if (!row) throw new Error(`Failed to disable MFA for user: ${userId}`);
    await this.db.execute(
      "DELETE FROM mfa_recovery WHERE user_id = $1",
      [userId],
    );
    return toUser(row);
  }

  async storeRecoveryCodes(userId: string, codeHashes: string[]): Promise<void> {
    await this.db.execute("DELETE FROM mfa_recovery WHERE user_id = $1", [userId]);
    for (const codeHash of codeHashes) {
      await this.db.execute(
        "INSERT INTO mfa_recovery (user_id, code_hash) VALUES ($1, $2)",
        [userId, codeHash],
      );
    }
  }

  async consumeRecoveryCode(userId: string, codeHash: string): Promise<boolean> {
    const result = await this.db.execute(
      `UPDATE mfa_recovery SET used = TRUE
       WHERE user_id = $1 AND code_hash = $2 AND used = FALSE`,
      [userId, codeHash],
    );
    return result > 0;
  }
}
