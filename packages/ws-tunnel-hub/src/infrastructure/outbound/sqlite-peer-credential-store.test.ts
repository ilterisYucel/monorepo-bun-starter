import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { hashSecret } from "../../domain/secrets";
import { NodeSqliteDatabase } from "../../__test-helpers__/node-sqlite-database";
import { SqlitePeerCredentialStore } from "./sqlite-peer-credential-store";

function input(peerId: string, token: string, expiresAt = 2000) {
  return { peerId, tokenHash: hashSecret(token), expiresAt };
}

function claim(peerId: string, token: string, secret: string, now = 1000) {
  return {
    peerId,
    bootstrapTokenHash: hashSecret(token),
    secretHash: hashSecret(secret),
    now,
  };
}

describe("SqlitePeerCredentialStore", () => {
  let store: SqlitePeerCredentialStore;
  let database: NodeSqliteDatabase;

  beforeEach(() => {
    database = new NodeSqliteDatabase(":memory:");
    store = new SqlitePeerCredentialStore(database);
  });
  afterEach(() => {
    database.close();
  });

  it("AK-2.2: create → claim → kalıcı secret authenticate", async () => {
    await store.createBootstrap(input("p-1", "bootstrap-1"));
    expect(await store.authenticate("secret-1")).toBe(false);
    expect(await store.claim(claim("p-1", "bootstrap-1", "secret-1"))).toBe(true);
    expect(await store.authenticate("secret-1")).toBe(true);
    expect(await store.authenticate("wrong")).toBe(false);
  });

  it("AK-2.3: token tek kullanımlık", async () => {
    await store.createBootstrap(input("p-1", "bootstrap-1"));
    expect(await store.claim(claim("p-1", "bootstrap-1", "secret-1"))).toBe(true);
    expect(await store.claim(claim("p-1", "bootstrap-1", "secret-2"))).toBe(false);
    expect(await store.authenticate("secret-2")).toBe(false);
  });

  it("süresi geçmiş bootstrap reddedilir", async () => {
    await store.createBootstrap(input("p-1", "bootstrap-1", 500));
    expect(await store.claim(claim("p-1", "bootstrap-1", "secret-1", 600))).toBe(false);
  });

  it("yanlış token reddedilir", async () => {
    await store.createBootstrap(input("p-1", "bootstrap-1"));
    expect(await store.claim(claim("p-1", "bootstrap-x", "secret-1"))).toBe(false);
  });

  it("AK-1.3: yeni bootstrap eski token'ı geçersiz kılar", async () => {
    await store.createBootstrap(input("p-1", "old"));
    await store.createBootstrap(input("p-1", "new"));
    expect(await store.claim(claim("p-1", "old", "secret-1"))).toBe(false);
    expect(await store.claim(claim("p-1", "new", "secret-2"))).toBe(true);
    expect(await store.authenticate("secret-2")).toBe(true);
  });

  it("AK-3.1: revoke secret'ı geçersiz kılar, bekleyen bootstrap silinir", async () => {
    await store.createBootstrap(input("p-1", "bootstrap-1"));
    await store.claim(claim("p-1", "bootstrap-1", "secret-1"));
    await store.revoke("p-1");
    expect(await store.authenticate("secret-1")).toBe(false);
    await store.createBootstrap(input("p-1", "bootstrap-2"));
    await store.revoke("p-1");
    expect(await store.claim(claim("p-1", "bootstrap-2", "secret-2"))).toBe(false);
  });
});
