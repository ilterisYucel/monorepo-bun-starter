// packages/core/src/sql/interface.ts

/**
 * Düzenli SQL operasyonları için sözleşme.
 * TimescaleDB sözleşmesinden farklıdır — zaman serisi değil, metadata/durum sorguları içindir.
 */
export interface ISqlDatabase {
  /** Bağlantı havuzunu başlat */
  connect(): Promise<void>;

  /** Bağlantı havuzunu kapat */
  disconnect(): Promise<void>;

  /**
   * DDL / INSERT / UPDATE / DELETE çalıştır.
   * Sonuç döndürmez — komut (CQS).
   */
  execute(sql: string, params?: unknown[]): Promise<void>;

  /**
   * SELECT — birden fazla satır.
   * Sonuç döndürür — sorgu (CQS).
   */
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;

  /**
   * SELECT — tek satır veya tanımsız.
   * Sonuç döndürür — sorgu (CQS).
   */
  queryOne<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T | undefined>;

  /** Bağlantı sağlık kontrolü */
  health(): Promise<boolean>;
}
