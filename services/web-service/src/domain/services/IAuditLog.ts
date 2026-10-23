/**
 * Denetim/olay log'u portu (domain).
 *
 * SPEC WEB-SERVICE-KATMANLAMA K12: framework/I-O'lu somut logger sınıfı
 * (TamperLogger) application katmanına GİRMEZ; use-case'ler bu portu tüketir.
 * Somut adaptör infrastructure'dadır (`TamperLoggerAdapter`).
 */

export const AUDIT_LEVELS = ["debug", "info", "warn", "error", "fatal"] as const;
export type AuditLevel = (typeof AUDIT_LEVELS)[number];

export const AUDIT_CATEGORIES = ["app", "audit", "security"] as const;
export type AuditCategory = (typeof AUDIT_CATEGORIES)[number];

/** Log girdisi — üretici alanları (ts/seq/imza pipeline'da dolar). */
export interface AuditLogEntry {
  level: AuditLevel;
  category: AuditCategory;
  eventCode: string;
  message: string;
  context?: Record<string, unknown>;
  correlationId?: string;
  service?: string;
  host?: string;
  ts?: string;
}

/**
 * Sözleşme:
 * - `log(entry)` komuttur (Promise<void>); hata fırlatabilir (çağıran karar verir:
 *   fail-closed audit vs best-effort log).
 */
export interface IAuditLog {
  log(entry: AuditLogEntry): Promise<void>;
}
