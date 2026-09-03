import type { ISqlDatabase } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";


import type { IAuditSink } from "@gd-monorepo/ws-tunnel";


/** session_audit DDL — tasarım §5.6 (birebir). */
export const SESSION_AUDIT_DDL = `
  CREATE TABLE IF NOT EXISTS session_audit (
    id BIGSERIAL PRIMARY KEY,
    field_id UUID REFERENCES fields(id),
    container_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    username TEXT NOT NULL,
    field_role TEXT NOT NULL,
    container_role TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    bytes_in BIGINT NOT NULL DEFAULT 0,
    bytes_out BIGINT NOT NULL DEFAULT 0,
    end_reason TEXT,
    remote_ip TEXT
  )
`;

interface OpenSessionRecord {
  fieldId: string;
  containerId: string;
  sessionId: string;
  username: string;
  fieldRole: string;
  containerRole: string;
  remoteIp?: string;
}

interface CloseSessionRecord {
  sessionId: string;
  endReason: string;
  bytesIn: number;
  bytesOut: number;
}

/**
 * SessionAudit — oturum başlangıç/bitiş kayıtları (tasarım §5.6, T3.4).
 * K0.5: audit olayları `security` kanalından geçer (TamperLogger) + DB satırı
 * yazılır; **fail-closed** — security logu yazılamazsa oturum AÇILMAZ (throw).
 */
export class SessionAudit implements IAuditSink {
  constructor(
    private readonly sql: ISqlDatabase,
    private readonly logger: TamperLogger,
  ) {}

  /** Şemayı kurar (komut) — web-service init'inde çağrılır. */
  async ensureSchema(): Promise<void> {
    await this.sql.execute(SESSION_AUDIT_DDL);
  }

  /**
   * Oturum açılışını kaydeder (komut) — DB INSERT + imzalı security logu.
   * Logger hatası yukarı fırlar (fail-closed — çağıran oturumu açmaz).
   */
  async open(record: OpenSessionRecord): Promise<void> {
    await this.logger.log({
      level: "info",
      category: "security",
      eventCode: "session_open",
      message: "Konteyner oturumu acildi",
      context: {
        containerId: record.containerId,
        sessionId: record.sessionId,
        username: record.username,
        fieldRole: record.fieldRole,
        containerRole: record.containerRole,
      },
    });
    await this.sql.execute(
      `INSERT INTO session_audit
         (field_id, container_id, session_id, username, field_role, container_role, remote_ip)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        record.fieldId,
        record.containerId,
        record.sessionId,
        record.username,
        record.fieldRole,
        record.containerRole,
        record.remoteIp ?? null,
      ],
    );
  }

  /** Oturum kapanışını kaydeder (komut) — UPDATE + imzalı security logu. */
  async close(record: CloseSessionRecord): Promise<void> {
    await this.logger.log({
      level: "info",
      category: "security",
      eventCode: "session_end",
      message: "Konteyner oturumu kapandi",
      context: {
        sessionId: record.sessionId,
        endReason: record.endReason,
        bytesIn: record.bytesIn,
        bytesOut: record.bytesOut,
      },
    });
    await this.sql.execute(
      `UPDATE session_audit
       SET ended_at = NOW(), end_reason = $2, bytes_in = $3, bytes_out = $4
       WHERE session_id = $1`,
      [record.sessionId, record.endReason, record.bytesIn, record.bytesOut],
    );
  }
}
