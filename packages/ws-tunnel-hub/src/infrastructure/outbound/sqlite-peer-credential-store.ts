import type { SqlDatabase } from "../../domain/ports/sql-database";
import type { IPeerCredentialsStore } from "../../domain/ports/peer-credentials-store";
import type {
  BootstrapRecordInput,
  ClaimBootstrapRecord,
  IPeerBootstrapRepository,
} from "../../domain/ports/peer-bootstrap-repository";
import { createHash } from "node:crypto";

/**
 * SqlitePeerCredentialStore — kalıcı peer kimliği + bootstrap.
 *
 * Veritabanı porttan enjekte edilir (prod: `bun:sqlite`, test: `node:sqlite`);
 * bu adapter SQL bilir, runtime bilmez.
 */
export class SqlitePeerCredentialStore
  implements IPeerCredentialsStore, IPeerBootstrapRepository
{
  constructor(private readonly db: SqlDatabase) {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS peer_credentials (
        peer_id    TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL,
        revoked    INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS peer_bootstrap (
        peer_id    TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        used       INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }

  async authenticate(token: string): Promise<boolean> {
    if (token.length === 0) return false;
    const hash = sha256(token);
    const rows = this.db.all<{ token_hash: string }>(
      "SELECT token_hash FROM peer_credentials WHERE token_hash = ? AND revoked = 0 LIMIT 1",
      hash,
    );
    return rows.length > 0;
  }

  async createBootstrap(input: BootstrapRecordInput): Promise<void> {
    this.db.run(
      `INSERT INTO peer_bootstrap (peer_id, token_hash, expires_at, used)
       VALUES (?, ?, ?, 0)
       ON CONFLICT(peer_id) DO UPDATE SET
         token_hash = excluded.token_hash,
         expires_at = excluded.expires_at,
         used = 0`,
      input.peerId,
      input.tokenHash,
      input.expiresAt,
    );
  }

  async claim(input: ClaimBootstrapRecord): Promise<boolean> {
    const consumed = this.db.run(
      `UPDATE peer_bootstrap SET used = 1
       WHERE peer_id = ? AND token_hash = ? AND used = 0 AND expires_at > ?`,
      input.peerId,
      input.bootstrapTokenHash,
      input.now,
    );
    if (consumed.changes === 0) return false;

    this.db.run(
      `INSERT INTO peer_credentials (peer_id, token_hash, revoked)
       VALUES (?, ?, 0)
       ON CONFLICT(peer_id) DO UPDATE SET
         token_hash = excluded.token_hash,
         revoked = 0`,
      input.peerId,
      input.secretHash,
    );
    return true;
  }

  async revoke(peerId: string): Promise<void> {
    this.db.run(
      "UPDATE peer_credentials SET revoked = 1 WHERE peer_id = ?",
      peerId,
    );
    this.db.run("DELETE FROM peer_bootstrap WHERE peer_id = ?", peerId);
  }
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
