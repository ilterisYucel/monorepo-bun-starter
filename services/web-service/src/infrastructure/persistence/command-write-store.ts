import type { ISqlDatabase } from "@gd-monorepo/core";

/**
 * CommandWriteStore — Modbus yazma izi (Admin › Modbus trace, İş 1).
 *
 * Web-service başarıyla yürüttüğü her komutun çözülen yazımlarını
 * (`telemetries` + config `registerAddress`) bu tabloya yazar. Kayıt
 * best-effort'tur (komut zaten çalışmıştır) — hata çağıran tarafta yutulur.
 */
export interface CommandWriteInput {
  deviceId: string;
  command: string;
  label?: string;
  name: string;
  registerAddress?: number;
  registerTableType?: string;
  value: string;
  success: boolean;
}

export interface CommandWriteRow {
  ts: string;
  deviceId: string;
  command: string;
  label: string | null;
  name: string;
  registerAddress: number | null;
  registerTableType: string | null;
  value: string;
  success: boolean;
}

export class CommandWriteStore {
  constructor(private readonly db: ISqlDatabase) {}

  async initialize(): Promise<void> {
    await this.db.execute(`
      CREATE TABLE IF NOT EXISTS command_writes (
        id BIGSERIAL PRIMARY KEY,
        ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        device_id VARCHAR(255) NOT NULL,
        command VARCHAR(200) NOT NULL,
        label VARCHAR(255),
        name VARCHAR(255) NOT NULL,
        register_address INTEGER,
        register_table_type VARCHAR(40),
        value TEXT NOT NULL,
        success BOOLEAN NOT NULL DEFAULT TRUE
      )
    `);
    await this.db.execute(
      "CREATE INDEX IF NOT EXISTS idx_command_writes_ts ON command_writes (ts DESC)",
    );
  }

  async record(entries: CommandWriteInput[]): Promise<void> {
    if (entries.length === 0) return;
    const values: unknown[] = [];
    const tuples = entries.map((e, i) => {
      const b = i * 8;
      values.push(
        e.deviceId,
        e.command,
        e.label ?? null,
        e.name,
        e.registerAddress ?? null,
        e.registerTableType ?? null,
        e.value,
        e.success,
      );
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7}, $${b + 8})`;
    });
    await this.db.execute(
      `INSERT INTO command_writes
         (device_id, command, label, name, register_address, register_table_type, value, success)
       VALUES ${tuples.join(", ")}`,
      values,
    );
  }

  async list(limit = 100, deviceId?: string): Promise<CommandWriteRow[]> {
    const capped = Math.min(Math.max(1, limit), 500);
    const rows = deviceId
      ? await this.db.query<Record<string, unknown>>(
          `SELECT ts, device_id, command, label, name, register_address, register_table_type, value, success
           FROM command_writes WHERE device_id = $1 ORDER BY ts DESC LIMIT $2`,
          [deviceId, capped],
        )
      : await this.db.query<Record<string, unknown>>(
          `SELECT ts, device_id, command, label, name, register_address, register_table_type, value, success
           FROM command_writes ORDER BY ts DESC LIMIT $1`,
          [capped],
        );
    return rows.map((r) => ({
      ts: new Date(r.ts as string).toISOString(),
      deviceId: String(r.device_id),
      command: String(r.command),
      label: (r.label as string | null) ?? null,
      name: String(r.name),
      registerAddress: (r.register_address as number | null) ?? null,
      registerTableType: (r.register_table_type as string | null) ?? null,
      value: String(r.value),
      success: Boolean(r.success),
    }));
  }
}
