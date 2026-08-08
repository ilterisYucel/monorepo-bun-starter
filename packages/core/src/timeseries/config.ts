import type { PostgresConfig } from "@gd-monorepo/shared-types";

/**
 * TimescaleDB'ye özel konfigürasyon.
 * PostgresConfig'in tüm alanlarını içerir ve TimescaleDB'ye özgü
 * chunk interval, sıkıştırma, retention gibi ayarları ekler.
 *
 * Tüm değerler .env üzerinden override edilebilir.
 * Her deployment tier (container, field, boss, editor) kendi compose dosyasında
 * farklı değerler tanımlayarak aynı kodu kullanabilir.
 *
 * Optimizasyon rehberi: deployment/STORAGE-ESTIMATE.md
 */
export interface TimescaleDBConfig extends PostgresConfig {
  /** Hypertable chunk zaman aralığı.
   *  Küçük chunk = daha iyi sorgu performansı, daha fazla chunk sayısı.
   *  Env: TIMESCALE_CHUNK_INTERVAL (varsayılan: "6 hours")
   *  STORAGE-ESTIMATE §3.1 */
  chunkInterval: string;

  /** Sıkıştırma politikası: bu süreden eski chunk'lar otomatik sıkıştırılır.
   *  Env: TIMESCALE_COMPRESS_AFTER (varsayılan: "1 day")
   *  STORAGE-ESTIMATE §3.2 */
  compressAfter: string;

  /** Retention politikası: bu süreden eski raw veri silinir.
   *  Materialized view'lar etkilenmez, tüm zamanlar için saklanır.
   *  Boş string = retention kapalı (sonsuz saklama).
   *  Env: TIMESCALE_RETENTION_AFTER (varsayılan: "90 days")
   *  STORAGE-ESTIMATE §3.3 */
  retentionAfter: string;

  /** SQL sorgu timeout (ms). Bu süreyi aşan sorgular iptal edilir.
   *  Env: TIMESCALE_STATEMENT_TIMEOUT_MS (varsayılan: 30000) */
  statementTimeoutMs: number;

  /** Boşta kalan bağlantı timeout (ms).
   *  Env: TIMESCALE_IDLE_TIMEOUT_MS (varsayılan: 30000) */
  idleTimeoutMs: number;

  /** Yeni bağlantı timeout (ms).
   *  Env: TIMESCALE_CONNECTION_TIMEOUT_MS (varsayılan: 5000) */
  connectionTimeoutMs: number;
}

/**
 * Varsayılan değerlerle dolu TimescaleDBConfig.
 * STORAGE-ESTIMATE.md §3.1–3.3 optimizasyonları uygulanmıştır:
 *   - chunk_interval: 6 saat (1 gün yerine) → daha küçük chunk, daha hızlı sorgu
 *   - compress_after: 1 gün (7 gün yerine) → raw veri penceresini daraltır
 *   - retention_after: 90 gün (sonsuz yerine) → disk büyümesini sınırlar
 */
const DEFAULT_TIMESCALE_CONFIG: Omit<TimescaleDBConfig, keyof PostgresConfig> = {
  chunkInterval: "6 hours",
  compressAfter: "1 day",
  retentionAfter: "90 days",
  statementTimeoutMs: 30000,
  idleTimeoutMs: 30000,
  connectionTimeoutMs: 5000,
};

/**
 * Ortam değişkenlerinden ve opsiyonel override'lardan TimescaleDBConfig üretir.
 *
 * Öncelik sırası:
 *   1. overrides parametresi (programatik)
 *   2. Ortam değişkenleri (process.env)
 *   3. Varsayılan değerler (yukarıdaki DEFAULT_TIMESCALE_CONFIG)
 *
 * @param overrides — programatik olarak override edilecek alanlar (isteğe bağlı)
 * @returns tamamlanmış TimescaleDBConfig
 *
 * @example
 * // Container tier (varsayılanları kullan):
 * const cfg = buildTimescaleDBConfig();
 *
 * @example
 * // Field tier (küçük disk, kısa retention):
 * const cfg = buildTimescaleDBConfig({ retentionAfter: "30 days" });
 *
 * @example
 * // PG bağlantı bilgilerini ayrı al, TimescaleDB ayarlarını env'den oku:
 * const cfg = buildTimescaleDBConfig({ host: "pg1", port: 5432, ... });
 */
export function buildTimescaleDBConfig(
  overrides?: Partial<TimescaleDBConfig>,
): TimescaleDBConfig {
  const poolSize = Number(process.env.TIMESCALE_POOL_SIZE) || undefined;

  return {
    // PostgresConfig alanları (overrides > env > defaults)
    host: overrides?.host ?? process.env.TIMESCALE_HOST ?? "localhost",
    port: overrides?.port ?? (Number(process.env.TIMESCALE_PORT) || 5432),
    user: overrides?.user ?? process.env.TIMESCALE_USER ?? "postgres",
    password: overrides?.password ?? process.env.TIMESCALE_PASSWORD ?? "",
    database: overrides?.database ?? process.env.TIMESCALE_DATABASE ?? "battery",
    ssl: overrides?.ssl,
    maxConnections:
      overrides?.maxConnections ??
      (poolSize ? poolSize : 5),

    // TimescaleDB'ye özel alanlar (overrides > env > defaults)
    chunkInterval:
      overrides?.chunkInterval ??
      process.env.TIMESCALE_CHUNK_INTERVAL ??
      DEFAULT_TIMESCALE_CONFIG.chunkInterval,

    compressAfter:
      overrides?.compressAfter ??
      process.env.TIMESCALE_COMPRESS_AFTER ??
      DEFAULT_TIMESCALE_CONFIG.compressAfter,

    retentionAfter:
      overrides?.retentionAfter ??
      process.env.TIMESCALE_RETENTION_AFTER ??
      DEFAULT_TIMESCALE_CONFIG.retentionAfter,

    statementTimeoutMs:
      overrides?.statementTimeoutMs ??
      (Number(process.env.TIMESCALE_STATEMENT_TIMEOUT_MS) ||
      DEFAULT_TIMESCALE_CONFIG.statementTimeoutMs),

    idleTimeoutMs:
      overrides?.idleTimeoutMs ??
      (Number(process.env.TIMESCALE_IDLE_TIMEOUT_MS) ||
      DEFAULT_TIMESCALE_CONFIG.idleTimeoutMs),

    connectionTimeoutMs:
      overrides?.connectionTimeoutMs ??
      (Number(process.env.TIMESCALE_CONNECTION_TIMEOUT_MS) ||
      DEFAULT_TIMESCALE_CONFIG.connectionTimeoutMs),
  };
}

/**
 * Varolan TimescaleDB deployment'larına yeni chunk/compression/retention
 * ayarlarını uygulamak için tek seferlik migration SQL'i.
 *
 * Bu script sadece mevcut hypertable'ları günceller.
 * Yeni oluşturulan hypertable'lar buildTimescaleDBConfig()'teki
 * varsayılanları otomatik alır.
 *
 * @example
 * psql -U postgres -d battery -c "$(cat <<SQL
 * DO $$
 * DECLARE r RECORD;
 * BEGIN
 *   FOR r IN SELECT table_name FROM timescaledb_information.hypertables LOOP
 *     EXECUTE format('SELECT set_chunk_time_interval(''%s'', INTERVAL ''6 hours'')', r.table_name);
 *     EXECUTE format('SELECT add_compression_policy(''%s'', INTERVAL ''1 day'', if_not_exists => true)', r.table_name);
 *     EXECUTE format('SELECT add_retention_policy(''%s'', INTERVAL ''90 days'', if_not_exists => true)', r.table_name);
 *   END LOOP;
 * END $$;
 * SQL
 * )"
 */
