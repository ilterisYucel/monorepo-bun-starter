#!/usr/bin/env bun
/**
 * downsampled-bench — downsampled sorgu şekli benchmark'ı (Faz-1 önce/sonra).
 *
 * Aynı senaryo için ESKİ şekil (`GROUP BY bucket, tags` + `AVG(CASE…)` sütunları) ile
 * YENİ şekli (`GROUP BY bucket, name, tags->>'rack_id'`) EXPLAIN ANALYZE eder ve
 * planlama/yürütme sürelerini + grup sayılarını raporlar.
 *
 * Kullanım:
 *   bun tools/downsampled-bench.mjs --device BSC-1 --names Fault,Warning --range-min 60 --points 120
 *   bun tools/downsampled-bench.mjs --device SOC --names SOC --rack 1 --range-min 1440
 *
 * Bağlantı: TIMESCALE_* veya PG* env (varsayılan localhost:5432/battery).
 * Çıktı: tablo (senaryo başına eski/yeni süre). Warm-up + tekrar ortalaması alınır.
 */

import { Pool } from "pg";

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : def;
}

const device = arg("device", "BSC-1");
const names = arg("names", "SOC").split(",").map((s) => s.trim()).filter(Boolean);
const rangeMin = Number(arg("range-min", "60"));
const points = Number(arg("points", "120"));
const rack = arg("rack", undefined);
const repeats = Number(arg("repeats", "3"));

const tableName = `device_${device.replace(/[^a-zA-Z0-9_]/g, "_")}`;
const pool = new Pool({
  host: process.env.TIMESCALE_HOST ?? process.env.PGHOST ?? "localhost",
  port: Number(process.env.TIMESCALE_PORT ?? process.env.PGPORT ?? 5432),
  user: process.env.TIMESCALE_USER ?? process.env.PGUSER ?? "postgres",
  password: process.env.TIMESCALE_PASSWORD ?? process.env.PGPASSWORD ?? "",
  database: process.env.TIMESCALE_DATABASE ?? process.env.PGDATABASE ?? "battery",
});

const to = new Date();
const from = new Date(to.getTime() - rangeMin * 60_000);
const bucketSec = Math.max(1, Math.floor((rangeMin * 60) / points));
const toInterval = (s) =>
  s < 60 ? `${s} seconds` : s < 3600 ? `${Math.floor(s / 60)} minutes` : `${Math.floor(s / 3600)} hours`;
const bucket = toInterval(bucketSec);

function oldSql() {
  const caseCols = names
    .map((n) => `AVG(CASE WHEN name = '${n.replace(/'/g, "''")}' THEN value::numeric END) AS "${n}"`)
    .join(", ");
  const where = [`timestamp >= '${from.toISOString()}'`, `timestamp <= '${to.toISOString()}'`];
  if (rack) where.push(`tags->>'rack_id' = '${rack}'`);
  return `SELECT time_bucket('${bucket}', timestamp, '${from.toISOString()}'::timestamptz) AS bucket, tags, ${caseCols}
          FROM ${tableName} WHERE ${where.join(" AND ")} GROUP BY bucket, tags ORDER BY bucket ASC`;
}

function newSql() {
  const where = [`timestamp >= '${from.toISOString()}'`, `timestamp <= '${to.toISOString()}'`];
  if (rack) where.push(`tags->>'rack_id' = '${rack}'`);
  return `SELECT time_bucket('${bucket}', timestamp, '${from.toISOString()}'::timestamptz) AS bucket, name, tags->>'rack_id' AS rack_id, AVG(value) AS avg
          FROM ${tableName} WHERE ${where.join(" AND ")} GROUP BY bucket, name, tags->>'rack_id' ORDER BY bucket ASC`;
}

async function measure(sql) {
  // warm-up
  await pool.query(`EXPLAIN ANALYZE ${sql}`);
  const times = [];
  let rows = 0;
  for (let i = 0; i < repeats; i++) {
    const res = await pool.query(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`);
    const plan = res.rows[0]["QUERY PLAN"][0];
    times.push(plan["Execution Time"]);
    rows = plan["Plan"]["Actual Rows"] ?? rows;
  }
  times.sort((a, b) => a - b);
  return { medianMs: times[Math.floor(times.length / 2)], rows };
}

const result = {};
result.old = await measure(oldSql());
result.new = await measure(newSql());
await pool.end();

console.log(`\nDownsampled benchmark — ${device} | names=[${names.join(",")}] | rack=${rack ?? "-"} | ` +
  `${rangeMin} dk | bucket=${bucket} | points=${points}`);
console.log(`| Şekil | Median (ms) | Sonuç satırı |`);
console.log(`|:------|------------:|-------------:|`);
console.log(`| ESKİ (GROUP BY tags + CASE) | ${result.old.medianMs.toFixed(1)} | ${result.old.rows} |`);
console.log(`| YENİ (GROUP BY name+rack_id) | ${result.new.medianMs.toFixed(1)} | ${result.new.rows} |`);
const speedup = result.new.medianMs > 0 ? result.old.medianMs / result.new.medianMs : 0;
console.log(`\nHızlanma: ~${speedup.toFixed(1)}×`);
