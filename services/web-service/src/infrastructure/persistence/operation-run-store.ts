// OperationRunStore — operation_runs kalıcılığı (PG adaptörü).
// Kaynak tasarım: KOMUT-MANEVRA-OPERASYON-MIMARISI.md §8.

import type { ISqlDatabase } from "@gd-monorepo/core";
import type {
  IOperationRunStore,
  OperationRunDraft,
  OperationRunRecord,
  OperationRunStatus,
} from "@gd-monorepo/platform-commands";

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS operation_runs (
    id           UUID PRIMARY KEY,
    kind         TEXT NOT NULL CHECK (kind IN ('maneuver', 'operation')),
    name         TEXT NOT NULL,
    trigger      TEXT NOT NULL,
    status       TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed', 'rolled_back')),
    steps        JSONB NOT NULL,
    started_at   TIMESTAMPTZ NOT NULL,
    finished_at  TIMESTAMPTZ,
    created_by   TEXT NOT NULL,
    trace_id     TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_operation_runs_started ON operation_runs (started_at DESC);
  CREATE INDEX IF NOT EXISTS idx_operation_runs_status ON operation_runs (status);
`;

const INSERT_RUN = `
  INSERT INTO operation_runs
    (id, kind, name, trigger, status, steps, started_at, created_by, trace_id)
  VALUES ($1, $2, $3, $4, 'running', $5, $6, $7, $8)
`;

const UPDATE_STATUS = `
  UPDATE operation_runs SET status = $2, finished_at = $3 WHERE id = $1
`;

const SELECT_COLUMNS = `
  SELECT id, kind, name, trigger, status, steps, started_at, finished_at, created_by, trace_id
  FROM operation_runs
`;

interface RunRow {
  id: string;
  kind: "maneuver" | "operation";
  name: string;
  trigger: string;
  status: OperationRunRecord["status"];
  steps: unknown;
  started_at: string | Date;
  finished_at: string | Date | null;
  created_by: string;
  trace_id: string | null;
}

function mapRow(row: RunRow): OperationRunRecord {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    trigger: row.trigger,
    status: row.status,
    steps: row.steps,
    startedAt: new Date(row.started_at).toISOString(),
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : null,
    createdBy: row.created_by,
    traceId: row.trace_id,
  };
}

/**
 * OperationRunStore — `operation_runs` PG adaptörü (§8).
 *
 * Sözleşme (test: operation-run-store.test.ts):
 * - `begin`: running satırı INSERT — hata THROW (fail-closed; yürütücü
 *   rejected'e düşer).
 * - `finish`: terminal durum UPDATE — hata THROW (çağıran best-effort).
 * - `findById` / `listRecent`: okuma sorguları; yoksa undefined / boş liste.
 * - `initialize`: DDL oluşturur (idempotent).
 */
export class OperationRunStore implements IOperationRunStore {
  constructor(private readonly db: ISqlDatabase) {}

  /** Komut — tabloyu oluşturur (idempotent). */
  async initialize(): Promise<void> {
    await this.db.execute(CREATE_TABLE);
  }

  /** Komut — koşuyu running olarak yazar; hata → throw (fail-closed §8). */
  async begin(run: OperationRunDraft): Promise<void> {
    await this.db.execute(INSERT_RUN, [
      run.id,
      run.kind,
      run.name,
      run.trigger,
      JSON.stringify(run.steps),
      run.startedAt,
      run.createdBy,
      run.traceId ?? null,
    ]);
  }

  /** Komut — koşuyu terminal duruma taşır; hata → throw (best-effort çağıran). */
  async finish(
    id: string,
    status: OperationRunStatus,
    finishedAt: string,
  ): Promise<void> {
    await this.db.execute(UPDATE_STATUS, [id, status, finishedAt]);
  }

  /** Sorgu — tek koşu; yoksa undefined. */
  async findById(id: string): Promise<OperationRunRecord | undefined> {
    const row = await this.db.queryOne<RunRow>(`${SELECT_COLUMNS} WHERE id = $1`, [id]);
    if (!row) return undefined;
    return mapRow(row);
  }

  /** Sorgu — en yeni koşular (startedAt DESC). */
  async listRecent(limit: number): Promise<OperationRunRecord[]> {
    const rows = await this.db.query<RunRow>(
      `${SELECT_COLUMNS} ORDER BY started_at DESC LIMIT $1`,
      [limit],
    );
    return rows.map(mapRow);
  }
}
