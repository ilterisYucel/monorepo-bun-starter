import { DatabaseSync } from "node:sqlite";
import type { SqlDatabase, SqlRunResult } from "../../domain/ports/sql-database";

/**
 * NodeSqliteDatabase — TEST yardımcısı (`node:sqlite`).
 *
 * Vitest Node üzerinde koşar ve `bun:sqlite` yoktur; bu adapter aynı SQL
 * portunu Node 22+ `DatabaseSync` ile uygular. Üretimde KULLANILMAZ.
 */
export class NodeSqliteDatabase implements SqlDatabase {
  private readonly db: DatabaseSync;

  constructor(path: string) {
    this.db = new DatabaseSync(path);
  }

  run(sql: string, ...params: unknown[]): SqlRunResult {
    const result = this.db.prepare(sql).run(...params);
    return { changes: Number(result.changes) };
  }

  all<T>(sql: string, ...params: unknown[]): T[] {
    return this.db.prepare(sql).all(...params) as T[];
  }

  close(): void {
    this.db.close();
  }
}
