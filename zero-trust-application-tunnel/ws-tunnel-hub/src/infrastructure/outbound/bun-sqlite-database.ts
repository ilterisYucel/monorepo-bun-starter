import { Database } from "bun:sqlite";
import type { SQLQueryBindings } from "bun:sqlite";
import type { SqlDatabase, SqlRunResult } from "../../domain/ports/sql-database";

/** BunSqliteDatabase — üretim sqlite adapter'ı (`bun:sqlite`). */
export class BunSqliteDatabase implements SqlDatabase {
  private readonly db: Database;

  constructor(path: string) {
    this.db = new Database(path, { create: true });
  }

  run(sql: string, ...params: unknown[]): SqlRunResult {
    const result = this.db.run(sql, params as SQLQueryBindings[]);
    return { changes: Number(result.changes) };
  }

  all<T>(sql: string, ...params: unknown[]): T[] {
    return this.db.query(sql).all(...(params as SQLQueryBindings[])) as T[];
  }

  close(): void {
    this.db.close();
  }
}
