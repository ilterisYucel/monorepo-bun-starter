// packages/platform/logging/src/log-events-ddl.ts

// `log_events` tablosu DDL — EMS (GD-PMS) şemasıdır.
// Generic `tamper-logger` paketi tablo şeması TAŞIMAZ (K9: jenerik, proje
// kavramı içermez). Servis init'lerinde bu sabit çalıştırılır; hypertable
// dönüşümü migrasyonla yapılır.
export const LOG_EVENTS_DDL = `
CREATE TABLE IF NOT EXISTS log_events (
  ts             TIMESTAMPTZ NOT NULL,
  level          TEXT NOT NULL,
  category       TEXT NOT NULL,
  event_code     TEXT NOT NULL,
  message        TEXT NOT NULL,
  context        JSONB DEFAULT '{}',
  correlation_id TEXT,
  service        TEXT,
  host           TEXT,
  seq            BIGINT NOT NULL,
  prev_hash      TEXT NOT NULL,
  signature      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_log_events_ts ON log_events (ts DESC);
CREATE INDEX IF NOT EXISTS idx_log_events_corr ON log_events (correlation_id);
`;
