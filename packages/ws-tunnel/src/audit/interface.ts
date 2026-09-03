import type { TunnelRole } from "../types";

/** Oturum açılış kaydı — audit sink'ine verilir. */
export interface SessionAuditOpenRecord {
  fieldId: string;
  containerId: string;
  sessionId: string;
  username: string;
  fieldRole: TunnelRole;
  containerRole: TunnelRole;
  remoteIp?: string;
}

/** Oturum kapanış kaydı. */
export interface SessionAuditCloseRecord {
  sessionId: string;
  endReason: string;
  bytesIn: number;
  bytesOut: number;
}

/**
 * IAuditSink — oturum denetim kaydı sözleşmesi (fail-closed):
 * `open` hata fırlatırsa oturum AÇILMAZ; `close` kapanışta çağrılır
 * (hata yutulur + logger'a bildirilir).
 * Monorepo implementasyonu: `SessionAudit` (web-service, PG + TamperLogger).
 */
export interface IAuditSink {
  open(record: SessionAuditOpenRecord): Promise<void>;
  close(record: SessionAuditCloseRecord): Promise<void>;
}
