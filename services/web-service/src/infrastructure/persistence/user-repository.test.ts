import { describe, it, expect, vi } from "vitest";
import { UserRepository } from "./user-repository";
import type { PostgresAdapter } from "@gd-monorepo/core";

/**
 * UserRepository sözleşmesi (2026-08-30 — developer rolü eklenmeden önceki
 * davranışın karakterizasyonu + yeni migration):
 * - `initialize()`: users DDL'i + role CHECK migration'ı — constraint düşürülüp
 *   developer dahil liste ile yeniden eklenir (idempotent).
 * - `create()`: INSERT ... RETURNING *; satır gelmezse hata fırlatır.
 * - `findById()`: yoksa undefined.
 */

function makeDb(overrides: Partial<PostgresAdapter> = {}): PostgresAdapter {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue([]),
    queryOne: vi.fn().mockResolvedValue({
      id: "u-1",
      username: "u",
      password_hash: "h",
      role: "teknik",
      name: "U",
      created_at: "",
      updated_at: "",
    }),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  } as unknown as PostgresAdapter;
}

describe("UserRepository (developer rolü migration — 2026-08-30)", () => {
  it("initialize users DDL'ini oluşturur (developer CHECK dahil)", async () => {
    const db = makeDb();
    const repo = new UserRepository(db);
    await repo.initialize();
    const calls = (db.execute as ReturnType<typeof vi.fn>).mock.calls.map((c) =>
      String(c[0]),
    );
    const createTable = calls.find((s) => s.includes("CREATE TABLE IF NOT EXISTS users"));
    expect(createTable).toBeDefined();
    expect(createTable).toContain("'developer'");
  });

  it("initialize eski kurulumlar için role CHECK constraint'ini yeniler (idempotent)", async () => {
    const db = makeDb();
    const repo = new UserRepository(db);
    await repo.initialize();
    const calls = (db.execute as ReturnType<typeof vi.fn>).mock.calls.map((c) =>
      String(c[0]),
    );
    expect(
      calls.some((s) => s.includes("DROP CONSTRAINT IF EXISTS users_role_check")),
    ).toBe(true);
    const addConstraint = calls.find((s) =>
      s.includes("ADD CONSTRAINT users_role_check"),
    );
    expect(addConstraint).toBeDefined();
    expect(addConstraint).toContain("'developer'");
  });

  it("create satırı döndürür; satır gelmezse hata fırlatır", async () => {
    const db = makeDb();
    const repo = new UserRepository(db);
    const user = await repo.create("u", "h", "developer", "U");
    expect(user.id).toBe("u-1");
    const db404 = makeDb({ queryOne: vi.fn().mockResolvedValue(undefined) });
    const failing = new UserRepository(db404);
    await expect(failing.create("u", "h", "teknik", "U")).rejects.toThrow(
      "Failed to create user",
    );
  });

  it("findById yoksa undefined döner", async () => {
    const db = makeDb({ queryOne: vi.fn().mockResolvedValue(undefined) });
    const repo = new UserRepository(db);
    expect(await repo.findById("yok")).toBeUndefined();
  });
});

describe("UserRepository MFA (T6.1 — 2026-08-30 T1.3 karakterizasyonu)", () => {
  it("totpSecretByUserId: satır yok/null ise undefined", async () => {
    const repo = new UserRepository(
      makeDb({ queryOne: vi.fn().mockResolvedValue({ totp_secret: "SECRET" }) }),
    );
    expect(await repo.totpSecretByUserId("u-1")).toBe("SECRET");

    const repoNull = new UserRepository(
      makeDb({ queryOne: vi.fn().mockResolvedValue({ totp_secret: null }) }),
    );
    expect(await repoNull.totpSecretByUserId("u-1")).toBeUndefined();

    const repoMissing = new UserRepository(
      makeDb({ queryOne: vi.fn().mockResolvedValue(undefined) }),
    );
    expect(await repoMissing.totpSecretByUserId("u-1")).toBeUndefined();
  });

  it("setTotpSecret: yeni sır yazılırken mfa_enabled FALSE'a düşer (yeniden kayıt sözleşmesi)", async () => {
    const db = makeDb();
    const repo = new UserRepository(db);
    await repo.setTotpSecret("u-1", "SIR");
    const [sql, params] = (db.execute as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("totp_secret = $1");
    expect(sql).toContain("mfa_enabled = FALSE");
    expect(params).toEqual(["SIR", "u-1"]);
  });

  it("enableMfa satır döndürür; satır yoksa hata fırlatır", async () => {
    const repo = new UserRepository(makeDb());
    const user = await repo.enableMfa("u-1");
    expect(user.id).toBe("u-1");

    const repoMissing = new UserRepository(
      makeDb({ queryOne: vi.fn().mockResolvedValue(undefined) }),
    );
    await expect(repoMissing.enableMfa("u-1")).rejects.toThrow("Failed to enable MFA");
  });

  it("disableMfa: mfa_enabled FALSE + sır NULL + kurtarma kodları silinir; satır yoksa hata", async () => {
    const db = makeDb();
    const repo = new UserRepository(db);
    await repo.disableMfa("u-1");
    const calls = (db.execute as ReturnType<typeof vi.fn>).mock.calls.map((c) => String(c[0]));
    expect(calls.some((s) => s.includes("DELETE FROM mfa_recovery"))).toBe(true);

    const repoMissing = new UserRepository(
      makeDb({ queryOne: vi.fn().mockResolvedValue(undefined) }),
    );
    await expect(repoMissing.disableMfa("u-1")).rejects.toThrow("Failed to disable MFA");
  });

  it("storeRecoveryCodes: önce tüm eski kodlar silinir, sonra her hash INSERT edilir", async () => {
    const db = makeDb();
    const repo = new UserRepository(db);
    await repo.storeRecoveryCodes("u-1", ["h1", "h2", "h3"]);
    const calls = (db.execute as ReturnType<typeof vi.fn>).mock.calls;
    expect(String(calls[0]?.[0])).toContain("DELETE FROM mfa_recovery");
    const inserts = calls.slice(1).map((c) => String(c[0]));
    expect(inserts).toHaveLength(3);
    for (const sql of inserts) {
      expect(sql).toContain("INSERT INTO mfa_recovery");
    }
  });

  it("consumeRecoveryCode: kullanılmamış kod 1 satır etkiler → true; kullanılmış → false (tek kullanımlık SQL koşulu)", async () => {
    const usedOnce = makeDb({ execute: vi.fn().mockResolvedValue(1) });
    const repo = new UserRepository(usedOnce);
    expect(await repo.consumeRecoveryCode("u-1", "h1")).toBe(true);
    const [sql, params] = (usedOnce.execute as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
    expect(sql).toContain("used = FALSE");
    expect(params).toEqual(["u-1", "h1"]);

    const alreadyUsed = makeDb({ execute: vi.fn().mockResolvedValue(0) });
    const repoUsed = new UserRepository(alreadyUsed);
    expect(await repoUsed.consumeRecoveryCode("u-1", "h1")).toBe(false);
  });
});
