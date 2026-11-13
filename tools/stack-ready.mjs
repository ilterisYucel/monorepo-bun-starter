#!/usr/bin/env bun
/**
 * stack-ready — docker stack kalktıktan sonra hazır-olma beklemesi (T-20/S12).
 *
 * `start:demo-integration` / `dev:stack:up` sonunda çalışır: sim-lab god-mode,
 * compat sağlık uçları ve tier health'leri 200 olana kadar bekler. Böylece
 * testler soğuk başlangıçta (hub/telemetri oturumu kurulmadan) başlamaz.
 */

const urls = [
  "http://localhost:8090/api/meta",
  "http://localhost:8090/compat/c1/health",
  "http://localhost:8090/compat/c2/health",
  "http://localhost:8090/compat/field/health",
  "http://localhost:5001/health",
  "http://localhost:5002/health",
];

const timeoutMs = Number(process.env.STACK_READY_TIMEOUT_MS ?? 180_000);
const deadline = Date.now() + timeoutMs;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

while (Date.now() < deadline) {
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        return (await fetch(url)).ok;
      } catch {
        return false;
      }
    }),
  );
  if (results.every(Boolean)) {
    console.log(`[stack-ready] hazır — ${urls.length} uç 200`);
    process.exit(0);
  }
  await sleep(2000);
}

console.error(`[stack-ready] zaman aşımı (${timeoutMs} ms) — uçlar hazır değil`);
process.exit(1);
