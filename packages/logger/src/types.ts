// packages/logger/src/types.ts
//
// Genel logger sözleşmeleri — `@gd-monorepo/logger`.
//
// Bu paket, imzalı/zincirli denetim logger'ının (ayrı ürün) YERİNE GEÇMEZ ve ona
// bağımlılık/referans VERMEZ: imzasız, hafif, sink-pluggable genel amaçlı
// logger'dır. Önemli/denetlenebilir kayıtlar (alarm, audit, security, hata
// geçişleri) imzalı logger'da kalır; operasyonel/bilgi kayıtları bu pakete
// aittir (kategori sınırı tüketicide).
//
// JENERİK: GD-PMS'ye özgü kavram (eventCode, tier, service adları) GİRMEZ;
// `service`/`component` serbest string'dir.

/**
 * Desteklenen log seviyeleri — artan şiddet sırasında:
 * `debug < info < warn < error`. Eşiğin altındaki kayıt sink'e ULAŞMAZ.
 */
export const LOG_LEVELS = ["debug", "info", "warn", "error"] as const;

/** Log seviyesi birleşim tipi. */
export type LogLevel = (typeof LOG_LEVELS)[number];

/**
 * Logger yapılandırması (DI kuralı 3 — primitif yerine tek konfig obje).
 *
 * - `service`: Zorunlu, boş olamaz (boş verilirse constructor `Error` atar).
 * - `level`: Opsiyonel; verilmezse `"info"` kabul edilir.
 */
export interface LoggerConfig {
  readonly service: string;
  readonly level?: LogLevel;
}

/**
 * Sink'lere teslim edilen tek log kaydı (JSON satırının sözleşme görünümü).
 *
 * - `ts`: ISO-8601 zaman damgası.
 * - `level`: `LogLevel`.
 * - `service`: Logger'ın hizmet adı (parent'tan devralınır).
 * - `component`: Opsiyonel bileşen etiketi (`child` ile eklenir).
 * - `message`: İnsan-okur mesaj.
 * - `context`: Opsiyonel yapısal bağlam; JSON-safe olmayan alanlar (fonksiyon,
 *   sembol) ve döngüsel referanslar güvenli biçimde elenir/`[Circular]` ile
 *   temsil edilir — kayıt üretimi throw ETMEZ.
 */
export interface LogRecord {
  readonly ts: string;
  readonly level: LogLevel;
  readonly service: string;
  readonly component?: string;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Log sink sözleşmesi. Uygulamalar kaydı kendi hedefine yazar
 * (console, dosya, test toplayıcı...).
 *
 * Sözleşme:
 * - `write` senkron `void` veya `Promise<void>` dönebilir.
 * - Bir sink'in `write` hatası diğer sink'leri ve çağıranı ETKİLEMEZ
 *   (fail-open — Logger hatayı yutar).
 * - `close` opsiyoneldir; Logger `close()` çağrısında tüm sink'leri kapatır,
 *   kapatma hatası yutulur.
 */
export interface ILogSink {
  write(record: LogRecord): void | Promise<void>;
  close?(): void | Promise<void>;
}
