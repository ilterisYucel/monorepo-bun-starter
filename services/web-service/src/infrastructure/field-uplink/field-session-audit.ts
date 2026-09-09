import type { ISqlDatabase } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";
import type { IAuditSink, SessionAuditOpenRecord, SessionAuditCloseRecord } from "@gd-monorepo/ws-tunnel";

const DDL = `
  CREATE TABLE IF NOT EXISTS field_session_audit (
    id BIGSERIAL PRIMARY KEY,
    field_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    username TEXT NOT NULL,
    caller_role TEXT NOT NULL,
    peer_role TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    bytes_in BIGINT NOT NULL DEFAULT 0,
    bytes_out BIGINT NOT NULL DEFAULT 0,
    end_reason TEXT,
    remote_ip TEXT
  );
`;

/**
 * FieldSessionAudit — boss tier field oturum denetim kayıtları (Faz 3).
 * Konteyner modelindeki SessionAudit'in birebir karşılığı; boss DB'sinde
 * `fields` FK'sı olmadığından kendi tablosunu kurar. Fail-closed: security
 * logu yazılamazsa oturum AÇILMAZ (throw — SessionGateway'e yayılır).
 */
export class FieldSessionAudit implements IAuditSink {
  constructor(
    private readonly sql: ISqlDatabase,
    private readonly logger: TamperLogger,
  ) {}

  async ensureSchema(): Promise<void> {
    await this.sql.execute(DDL);
  }

  async open(record: SessionAuditOpenRecord): Promise<void> {
    await this.logger.log({
      level: "info",
      category: "security",
      eventCode: "session_open",
      message: "Field oturumu acildi",
      context: {
        fieldId: record.fieldId,
        sessionId: record.sessionId,
        username: record.username,
        callerRole: record.callerRole,
        peerRole: record.peerRole,
      },
    });
    await this.sql.execute(
      `INSERT INTO field_session_audit
         (field_id, session_id, username, caller_role, peer_role, remote_ip)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        record.fieldId,
        record.sessionId,
        record.username,
        record.callerRole,
        record.peerRole,
        record.remoteIp ?? null,
      ],
    );
  }

  async close(record: SessionAuditCloseRecord): Promise<void> {
    await this.logger.log({
      level: "info",
      category: "security",
      eventCode: "session_end",
      message: "Field oturumu kapandi",
      context: {
        sessionId: record.sessionId,
        endReason: record.endReason,
        bytesIn: record.bytesIn,
        bytesOut: record.bytesOut,
      },
    });
    await this.sql.execute(
      `UPDATE field_session_audit
       SET ended_at = NOW(), end_reason = $2, bytes_in = $3, bytes_out = $4
       WHERE session_id = $1`,
      [record.sessionId, record.endReason, record.bytesIn, record.bytesOut],
    );
  }
}
