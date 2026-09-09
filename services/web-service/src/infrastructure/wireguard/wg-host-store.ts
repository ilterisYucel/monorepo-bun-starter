import type { ISqlDatabase } from "@gd-monorepo/core";

const DDL = `
  CREATE TABLE IF NOT EXISTS wg_hosts (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    endpoint   TEXT NOT NULL,
    public_key TEXT NOT NULL,
    psk        TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
  );
`;

/** WG host satırı — `psk` READ yanıtlarına GİRMEZ (write-only secret). */
export interface WgHostRow {
  id: string;
  name: string;
  endpoint: string;
  public_key: string;
  psk: string;
  created_at: string;
  updated_at: string;
}

/** Dışarı çıkan görünüm — PSK'sız. */
export interface WgHost {
  id: string;
  name: string;
  endpoint: string;
  publicKey: string;
  createdAt: string;
  updatedAt: string;
}

/** Host girdisi — PSK yalnızca yazılır, asla okunmaz/loglanmaz. */
export interface WgHostInput {
  name: string;
  endpoint: string;
  publicKey: string;
  psk: string;
}

const toDto = (row: WgHostRow): WgHost => ({
  id: row.id,
  name: row.name,
  endpoint: row.endpoint,
  publicKey: row.public_key,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/**
 * WgHostStore — boss WG host kayıt defteri (Faz 4, BOSS-UYGULAMA-MIMARISI.md §7.5).
 * PSK DB'de tutulur ama sorgu yanıtlarından DÜŞÜRÜLÜR (write-only).
 */
export class WgHostStore {
  constructor(private readonly sql: ISqlDatabase) {}

  async ensureSchema(): Promise<void> {
    await this.sql.execute(DDL);
  }

  /** Tüm hostlar (sorgu — PSK'sız). */
  async list(): Promise<WgHost[]> {
    const rows = await this.sql.query<WgHostRow>(
      "SELECT * FROM wg_hosts ORDER BY created_at ASC",
    );
    return rows.map(toDto);
  }

  /** Host kaydını PSK'sıyla bulur (sorgu — yalnızca bağlantı kurarken). */
  async byIdWithPsk(id: string): Promise<WgHostRow | undefined> {
    return this.sql.queryOne<WgHostRow>(
      "SELECT * FROM wg_hosts WHERE id = $1",
      [id],
    );
  }

  /** Host kaydeder (komut) — oluşturulan satırın PSK'sız görünümünü döner. */
  async create(input: WgHostInput): Promise<WgHost> {
    const row = await this.sql.queryOne<WgHostRow>(
      `INSERT INTO wg_hosts (name, endpoint, public_key, psk)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [input.name, input.endpoint, input.publicKey, input.psk],
    );
    return toDto(row!);
  }

  /** Host günceller (komut) — güncellenmiş satırın PSK'sız görünümü. */
  async update(id: string, input: Partial<WgHostInput>): Promise<WgHost | undefined> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;
    if (input.name !== undefined) {
      sets.push(`name = $${i++}`);
      params.push(input.name);
    }
    if (input.endpoint !== undefined) {
      sets.push(`endpoint = $${i++}`);
      params.push(input.endpoint);
    }
    if (input.publicKey !== undefined) {
      sets.push(`public_key = $${i++}`);
      params.push(input.publicKey);
    }
    if (input.psk !== undefined) {
      sets.push(`psk = $${i++}`);
      params.push(input.psk);
    }
    if (sets.length === 0) {
      const row = await this.sql.queryOne<WgHostRow>(
        "SELECT * FROM wg_hosts WHERE id = $1",
        [id],
      );
      return row ? toDto(row) : undefined;
    }
    sets.push(`updated_at = NOW()`);
    params.push(id);
    const row = await this.sql.queryOne<WgHostRow>(
      `UPDATE wg_hosts SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      params,
    );
    return row ? toDto(row) : undefined;
  }

  /** Host siler (komut). */
  async remove(id: string): Promise<void> {
    await this.sql.execute("DELETE FROM wg_hosts WHERE id = $1", [id]);
  }
}
