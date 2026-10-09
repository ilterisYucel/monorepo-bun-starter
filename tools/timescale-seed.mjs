#!/usr/bin/env bun
/**
 * timescale-seed — uzun-menzil downsampled benchmark'ları için sentetik geçmiş veri üretir.
 *
 * Simülatör yalnız gerçek-zamanlı veri üretir; 1g/1hafta/90g senaryolarını saniyeler
 * içinde test edebilmek için doğrudan TimescaleDB'ye geriye dönük satır basar.
 *
 * Kullanım:
 *   bun tools/timescale-seed.mjs --device BSC-1 --names SOC,SOH --days 7 --interval 60
 *   (bağlantı: TIMESCALE_* veya PG* env — varsayılan localhost:5432/battery)
 *
 * NOT: Yalnız geliştirme/test amaçlıdır. Üretim DB'sine çalıştırmayın.
 */

import { Pool } from "pg";

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

const device = arg("device", "BSC-1");
const names = arg("names", "SOC,SOH").split(",").map((s) => s.trim()).filter(Boolean);
const days = Number(arg("days", "1"));
const intervalSec = Number(arg("interval", "60"));
const rack = arg("rack", undefined); // verilirse tags.rack_id
const vMin = Number(arg("value-min", "0"));
const vMax = Number(arg("value-max", "100"));
const rowsPerName = Math.floor((days * 86400) / intervalSec);

const tableName = `device_${device.replace(/[^a-zA-Z0-9_]/g, "_")}`;

const pool = new Pool({
  host: process.env.TIMESCALE_HOST ?? process.env.PGHOST ?? "localhost",
  port: Number(process.env.TIMESCALE_PORT ?? process.env.PGPORT ?? 5432),
  user: process.env.TIMESCALE_USER ?? process.env.PGUSER ?? "postgres",
  password: process.env.TIMESCALE_PASSWORD ?? process.env.PGPASSWORD ?? "",
  database: process.env.TIMESCALE_DATABASE ?? process.env.PGDATABASE ?? "battery",
});

const DDL = `
  CREATE TABLE IF NOT EXISTS ${tableName} (
    name VARCHAR(100) NOT NULL, value DOUBLE PRECISION NOT NULL, unit VARCHAR(50),
    description TEXT, quality INTEGER DEFAULT 1, tags JSONB, timestamp TIMESTAMPTZ NOT NULL
  );
  SELECT create_hypertable('${tableName}', 'timestamp', if_not_exists => TRUE, chunk_time_interval => INTERVAL '6 hours');
  CREATE INDEX IF NOT EXISTS idx_${tableName}_name ON ${tableName} (name, timestamp DESC);
`;

const BATCH = 1000;

async function seed() {
  console.error(
    `[seed] ${device}: ${names.length} isim × ${rowsPerName} satır × ${intervalSec}s ` +
      `(~${((names.length * rowsPerName) / 1e6).toFixed(1)}M satır)`,
  );
  await pool.query(DDL);

  const now = Date.now();
  const tags = rack ? JSON.stringify({ rack_id: rack, device_id: device }) : JSON.stringify({ device_id: device });
  let inserted = 0;

  for (const name of names) {
    let values = [];
    let params = [];
    for (let i = 0; i < rowsPerName; i++) {
      const ts = new Date(now - (rowsPerName - i) * intervalSec * 1000);
      const value = vMin + Math.random() * (vMax - vMin);
      const b = params.length;
      values.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},1,$${b + 5}::jsonb,$${b + 6})`);
      params.push(name, value, "", `seed ${name}`, tags, ts);
      if (values.length >= BATCH) {
        await pool.query(
          `INSERT INTO ${tableName} (name,value,unit,description,quality,tags,timestamp) VALUES ${values.join(",")}`,
          params,
        );
        inserted += values.length;
        values = [];
        params = [];
      }
    }
    if (values.length) {
      await pool.query(
        `INSERT INTO ${tableName} (name,value,unit,description,quality,tags,timestamp) VALUES ${values.join(",")}`,
        params,
      );
      inserted += values.length;
    }
    console.error(`[seed] ${name} basıldı`);
  }
  console.error(`[seed] tamam — ${inserted} satır`);
}

seed()
  .then(() => pool.end())
  .catch((err) => {
    console.error("[seed] HATA:", err.message);
    process.exit(1);
  });
