import type { ISqlDatabase } from "@gd-monorepo/core";
import type { DeviceAlarmState, AlarmSeverity } from "@gd-monorepo/shared-types";

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS device_alarms (
    device_id        VARCHAR(255) NOT NULL,
    alarm_name       VARCHAR(255) NOT NULL,
    severity         VARCHAR(20) NOT NULL,
    description      TEXT,
    active           BOOLEAN NOT NULL DEFAULT FALSE,
    started_at       TIMESTAMPTZ,
    ended_at         TIMESTAMPTZ,
    resolved         BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by      TEXT,
    resolved_at      TIMESTAMPTZ,
    last_changed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (device_id, alarm_name)
  );
  CREATE INDEX IF NOT EXISTS idx_device_alarms_active ON device_alarms (active, resolved);
`;

interface AlarmIdentity {
  name: string;
  severity: AlarmSeverity;
  description?: string;
}

/**
 * AlarmStateRepository — `device_alarms` durum tablosu (Faz 0 eki).
 * Tablo imzalı logun türetilmiş projeksiyonudur; geçmiş log_events'te.
 * Yalnızca GEÇİŞLERDE yazılır (yazım amplifikasyonu ~sıfır).
 */
export class AlarmStateRepository {
  constructor(private readonly sql: ISqlDatabase) {}

  async initialize(): Promise<void> {
    await this.sql.execute(CREATE_TABLE);
  }

  /**
   * Aktif geçişi UPSERT eder:
   * - satır yoksa / pasifse: yeni oluşum (started_at=NOW, resolved sıfırlanır),
   * - satır zaten aktifse: başlangıç ve resolved bilgisi KORUNUR.
   */
  async activate(deviceId: string, alarm: AlarmIdentity): Promise<void> {
    await this.sql.execute(
      `INSERT INTO device_alarms (device_id, alarm_name, severity, description, active, started_at, last_changed_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
       ON CONFLICT (device_id, alarm_name) DO UPDATE SET
         severity = EXCLUDED.severity,
         description = EXCLUDED.description,
         active = TRUE,
         started_at = CASE WHEN device_alarms.active THEN device_alarms.started_at ELSE NOW() END,
         ended_at = NULL,
         resolved = CASE WHEN device_alarms.active THEN device_alarms.resolved ELSE FALSE END,
         resolved_by = CASE WHEN device_alarms.active THEN device_alarms.resolved_by ELSE NULL END,
         resolved_at = CASE WHEN device_alarms.active THEN device_alarms.resolved_at ELSE NULL END,
         last_changed_at = NOW()`,
      [deviceId, alarm.name, alarm.severity, alarm.description ?? null],
    );
  }

  /** Düşen kenar — yalnızca aktif satırı kapatır. */
  async deactivate(deviceId: string, alarmName: string): Promise<void> {
    await this.sql.execute(
      `UPDATE device_alarms
       SET active = FALSE, ended_at = NOW(), last_changed_at = NOW()
       WHERE device_id = $1 AND alarm_name = $2 AND active = TRUE`,
      [deviceId, alarmName],
    );
  }

  /**
   * Teknisyen çözüldü işareti (TEIAŞ) — yalnızca AKTİF satırlar.
   * Etkilenen satır yoksa false döner (çağıran 409 üretir).
   */
  async resolve(
    deviceId: string,
    alarmName: string,
    username: string,
  ): Promise<boolean> {
    const row = await this.sql.queryOne<{ alarm_name: string }>(
      `UPDATE device_alarms
       SET resolved = TRUE, resolved_by = $3, resolved_at = NOW(), last_changed_at = NOW()
       WHERE device_id = $1 AND alarm_name = $2 AND active = TRUE
       RETURNING alarm_name`,
      [deviceId, alarmName, username],
    );
    return row !== undefined;
  }

  /** Restart sonrası bayat aktif satırları kapatır. */
  async resetAll(deviceIds: string[]): Promise<void> {
    if (deviceIds.length === 0) return;
    await this.sql.execute(
      `UPDATE device_alarms
       SET active = FALSE,
           ended_at = COALESCE(ended_at, NOW()),
           last_changed_at = NOW()
       WHERE device_id = ANY($1::varchar[])`,
      [deviceIds],
    );
  }

  /** Aktif alarmlar — çözülmemişler önce. */
  async listActive(): Promise<DeviceAlarmState[]> {
    const rows = await this.sql.query<Record<string, unknown>>(
      `SELECT * FROM device_alarms
       WHERE active = TRUE
       ORDER BY resolved ASC, started_at DESC NULLS LAST`,
    );
    return rows.map((row) => this.toState(row));
  }

  /** Son kapanan alarmlar (UI geçmişi). */
  async recentEnded(limit: number): Promise<DeviceAlarmState[]> {
    const rows = await this.sql.query<Record<string, unknown>>(
      `SELECT * FROM device_alarms
       WHERE active = FALSE AND ended_at IS NOT NULL
       ORDER BY ended_at DESC
       LIMIT $1`,
      [limit],
    );
    return rows.map((row) => this.toState(row));
  }

  private toState(row: Record<string, unknown>): DeviceAlarmState {
    const text = (key: string): string | undefined => {
      const value = row[key];
      return typeof value === "string" && value.length > 0 ? value : undefined;
    };
    return {
      deviceId: String(row.device_id),
      alarmName: String(row.alarm_name),
      severity: String(row.severity) as AlarmSeverity,
      description: text("description"),
      active: row.active === true,
      startedAt: text("started_at"),
      endedAt: text("ended_at"),
      resolved: row.resolved === true,
      resolvedBy: text("resolved_by"),
      resolvedAt: text("resolved_at"),
      lastChangedAt: String(row.last_changed_at ?? ""),
    };
  }
}
