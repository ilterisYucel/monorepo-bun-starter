// packages/tamper-logger/src/types.ts

// TamperLogger girdi/çıktı sözleşmesi — JENERİK (proje-bağımsız).
// Not: `eventCode` SERBEST string'dir. Proje kendi olay sözlüğünü
// `TamperLoggerConfig.eventCodeValidator` ile enjekte eder (fail-closed) —
// bkz. GD-PMS tarafı: packages/platform/logging `LOG_EVENT_CODES`.

/**
 * Log seviyeleri — artan şiddet sırasında.
 */
export const LOG_LEVELS = ["debug", "info", "warn", "error", "fatal"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * Log kategorileri:
 * - `app`: uygulama hatası/olayı (güvenilmez kaynaktan — frontend — da gelebilir).
 * - `audit`: kim-ne-yaptı kaydı (fail-closed kanal).
 * - `security`: güvenlik olayı (fail-closed kanal; SIEM'e birebir taşınır).
 */
export const LOG_CATEGORIES = ["app", "audit", "security"] as const;
export type LogCategory = (typeof LOG_CATEGORIES)[number];

/**
 * Üreticinin doldurduğu log girdisi. `ts` opsiyoneldir — yoksa pipeline doldurur.
 * `seq`, `prevHash` ve `signature` alanları üreticide YOKTUR; bunları yalnızca
 * TamperLogger pipeline'ı doldurur (bkz. LogEvent çıktısı).
 *
 * `eventCode` serbest string'dir; geçerlilik kararı projeye aittir
 * (`eventCodeValidator` enjeksiyonu).
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
 * TamperLogger çıktısı — zincir alanları her zaman doludur.
 */
export interface LogEvent extends LogEventInput {
  ts: string;
  seq: number;
  prevHash: string;
  signature: string;
}

/** Çalışma zamanı doğrulaması: verilen string geçerli bir log seviyesi mi? */
export function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value);
}

/** Çalışma zamanı doğrulaması: verilen string geçerli bir kategori mi? */
export function isLogCategory(value: string): value is LogCategory {
  return (LOG_CATEGORIES as readonly string[]).includes(value);
}
