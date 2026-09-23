// OperationDefStore — operation_defs kalıcılığı (PG adaptörü, admin tanım
// yönetimi §11.1-§11.2).
// Kaynak tasarım: KOMUT-MANEVRA-OPERASYON-MIMARISI.md §11.

import type { ISqlDatabase } from "@gd-monorepo/core";
import type {
  IOperationDefinitionStore,
  OperationDefinition,
} from "@gd-monorepo/platform-commands";

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS operation_defs (
    name        TEXT NOT NULL,
    kind        TEXT NOT NULL CHECK (kind IN ('maneuver', 'operation')),
    definition  JSONB NOT NULL,
    enabled     BOOLEAN NOT NULL DEFAULT TRUE,
    updated_by  TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (kind, name)
  );
`;

const SELECT_COLUMNS = `
  SELECT name, kind, definition, enabled, updated_by, updated_at, created_at
  FROM operation_defs
`;

interface DefRow {
  name: string;
  kind: "maneuver" | "operation";
  definition: unknown;
  enabled: boolean;
  updated_by: string;
  updated_at: string | Date;
  created_at: string | Date;
}

function mapRow(row: DefRow): OperationDefinition {
  return {
    name: row.name,
    kind: row.kind,
    definition: row.definition,
    enabled: row.enabled,
    updatedBy: row.updated_by,
    updatedAt: new Date(row.updated_at).toISOString(),
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/**
 * OperationDefStore — `operation_defs` PG adaptörü (§11.1).
 *
 * Sözleşme (test: operation-def-store.test.ts):
 * - `findByKindAndName` / `listByKind`: okuma eşlemesi (IOperationDefSource).
 * - `create`: yeni kayıt; (kind, name) VARSA THROW ("already_exists" — rota
 *   409 üretir).
 * - `update`: upsert (PUT ek kısıt getirmez — §11.2).
 * - `setEnabled`: yumuşak silme/devre dışı; kayıt YOKSA THROW.
 * - `initialize`: DDL oluşturur (idempotent).
 */
export class OperationDefStore implements IOperationDefinitionStore {
  constructor(private readonly db: ISqlDatabase) {}

  /** Komut — tabloyu oluşturur (idempotent). */
  async initialize(): Promise<void> {
    await this.db.execute(CREATE_TABLE);
  }

  /** Sorgu — (kind, name) kaydı; yoksa undefined. */
  async findByKindAndName(
    kind: "maneuver" | "operation",
    name: string,
  ): Promise<OperationDefinition | undefined> {
    const row = await this.db.queryOne<DefRow>(
      `${SELECT_COLUMNS} WHERE kind = $1 AND name = $2`,
      [kind, name],
    );
    if (!row) return undefined;
    return mapRow(row);
  }

  /** Sorgu — türdeki tüm kayıtlar. */
  async listByKind(kind: "maneuver" | "operation"): Promise<OperationDefinition[]> {
    const rows = await this.db.query<DefRow>(
      `${SELECT_COLUMNS} WHERE kind = $1 ORDER BY created_at ASC`,
      [kind],
    );
    return rows.map(mapRow);
  }

  /** Komut — yeni kayıt; (kind, name) varsa THROW (rota 409). */
  async create(
    kind: "maneuver" | "operation",
    definition: unknown,
    updatedBy: string,
  ): Promise<void> {
    const name = (definition as { name?: unknown }).name;
    if (typeof name !== "string" || name.length === 0) {
      throw new Error("invalid_definition");
    }
    const existing = await this.findByKindAndName(kind, name);
    if (existing) {
      throw new Error("already_exists");
    }
    const now = new Date().toISOString();
    await this.db.execute(
      `INSERT INTO operation_defs
        (name, kind, definition, enabled, updated_by, updated_at, created_at)
       VALUES ($1, $2, $3, TRUE, $4, $5, $5)`,
      [name, kind, JSON.stringify(definition), updatedBy, now],
    );
  }

  /** Komut — upsert güncelleme (PUT ek kısıt getirmez — §11.2). */
  async update(
    kind: "maneuver" | "operation",
    name: string,
    definition: unknown,
    updatedBy: string,
  ): Promise<void> {
    const now = new Date().toISOString();
    await this.db.execute(
      `INSERT INTO operation_defs
        (name, kind, definition, enabled, updated_by, updated_at, created_at)
       VALUES ($1, $2, $3, TRUE, $4, $5, $5)
       ON CONFLICT (kind, name) DO UPDATE SET
        definition = EXCLUDED.definition,
        enabled = TRUE,
        updated_by = EXCLUDED.updated_by,
        updated_at = EXCLUDED.updated_at`,
      [name, kind, JSON.stringify(definition), updatedBy, now],
    );
  }

  /** Komut — yumuşak silme/devre dışı; kayıt YOKSA THROW. */
  async setEnabled(
    kind: "maneuver" | "operation",
    name: string,
    enabled: boolean,
    updatedBy: string,
  ): Promise<void> {
    const existing = await this.findByKindAndName(kind, name);
    if (!existing) {
      throw new Error("not_found");
    }
    await this.db.execute(
      `UPDATE operation_defs
       SET enabled = $3, updated_by = $4, updated_at = $5
       WHERE kind = $1 AND name = $2`,
      [kind, name, enabled, updatedBy, new Date().toISOString()],
    );
  }
}
