// packages/platform/logging/src/log-types.ts

// GD-PMS log tipleri — generic `tamper-logger`dan BAĞIMSIZ kopya.
// Paket ayrıştırması turu: tamper-logger ayrı ürün olarak taşınır; EMS
// kendi tip sözleşmesini burada tanımlar (tip düzeyinde de dış bağımlılık yok).
// Şekil, tamper-logger girdi/çıktı sözleşmesiyle YAPISAL olarak aynıdır —
// montaj noktalarında atama uyumu korunur.

/**
 * Log seviyeleri — artan şiddet sırasında.
 */
export const LOG_LEVELS = ["debug", "info", "warn", "error", "fatal"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * Log kategorileri:
 * - `app`: uygulama hatası/olayı.
 * - `audit`: kim-ne-yaptı kaydı (fail-closed kanal).
 * - `security`: güvenlik olayı (fail-closed kanal).
 */
export const LOG_CATEGORIES = ["app", "audit", "security"] as const;
export type LogCategory = (typeof LOG_CATEGORIES)[number];

/**
 * Üreticinin doldurduğu log girdisi. `ts` opsiyoneldir — yoksa pipeline doldurur.
 * `seq`, `prevHash`, `signature` alanları üreticide YOKTUR; bunları yalnızca
 * imzalı-log pipeline'ı doldurur (bkz. LogEvent).
 */
export interface LogEventInput {
  level: LogLevel;
  category: LogCategory;
  eventCode: string;
  message: string;
  context?: Record<string, unknown>;
  correlationId?: string;
  service?: string;
  host?: string;
  ts?: string;
}

/**
 * İmzalı log çıktısı — zincir alanları her zaman doludur.
 */
export interface LogEvent extends LogEventInput {
  ts: string;
  seq: number;
  prevHash: string;
  signature: string;
}
