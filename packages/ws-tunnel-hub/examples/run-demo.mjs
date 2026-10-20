#!/usr/bin/env bun
/**
 * run-demo.mjs — iki mini web uygulamasının hub üzerinden testi (P4 UC-2).
 *
 * Process-içi hub-servis (sqlite) kurar; bootstrap ile peer kimliği üretir;
 * `device-app.mjs` (sahte cihaz, REST+WS) ve `consumer-app.mjs` (opak REST+WS)
 * süreçlerini başlatır. Offline peer → 503 yolunu da doğrular.
 *
 * Kullanım: bun packages/ws-tunnel-hub/examples/run-demo.mjs
 */

import { rmSync } from "node:fs";
import { resolve } from "node:path";
import { createHub } from "../src/main.ts";
import { BunSqliteDatabase } from "../src/infrastructure/outbound/bun-sqlite-database.ts";

const CONSUMER_TOKEN = "demo-consumer-token";
const PEER_ID = "dev-1";
const SERVICE_ID = "local-admin";
const dir = import.meta.dir;

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}
const waitFor = async (fn, timeoutMs = 8000) => {
  const start = Date.now();
  while (!(await fn())) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return true;
};

const dbPath = `/tmp/opencode/hub-examples-${Date.now()}.db`;
const composition = await createHub(
  {
    host: "127.0.0.1",
    port: 0,
    authMode: "sqlite",
    consumerToken: CONSUMER_TOKEN,
    dbPath,
    cookieName: "tunnel_session",
    staleTimeoutMs: 45_000,
    sweepIntervalMs: 1_000,
    pathAllowlist: {
      allowedPrefixes: ["/", "/api/", "/ws/", "/assets/"],
      blockedPrefixes: [],
    },
  },
  { createDatabase: (path) => new BunSqliteDatabase(path) },
);
await composition.server.listen({ host: "127.0.0.1", port: 0 });
const hubUrl = `http://127.0.0.1:${composition.server.addresses()[0].port}`;
const adminHeaders = {
  authorization: `Bearer ${CONSUMER_TOKEN}`,
  "content-type": "application/json",
};

let device;
try {
  // Bootstrap → claim
  const issued = await (
    await fetch(`${hubUrl}/admin/peers`, {
      method: "POST",
      headers: adminHeaders,
      body: JSON.stringify({ peerId: PEER_ID }),
    })
  ).json();
  const claimed = await (
    await fetch(`${hubUrl}/peers/bootstrap/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ peerId: PEER_ID, bootstrapToken: issued.bootstrapToken }),
    })
  ).json();

  // device-app'i başlat
  device = Bun.spawn(["bun", resolve(dir, "device-app.mjs")], {
    env: {
      ...process.env,
      HUB_URL: hubUrl,
      PEER_ID,
      PEER_SECRET: claimed.peerSecret,
      SERVICE_ID,
    },
    stdout: "inherit",
    stderr: "inherit",
  });
  const registered = await waitFor(async () => {
    const peers = await (await fetch(`${hubUrl}/peers`)).json();
    return peers.peers?.some((p) => p.peerId === PEER_ID && p.status === "connected");
  });
  check("device-app hub'a kaydoldu", registered);

  // consumer-app'i koştur
  const consumer = Bun.spawn(["bun", resolve(dir, "consumer-app.mjs")], {
    env: {
      ...process.env,
      HUB_URL: hubUrl,
      CONSUMER_TOKEN,
      PEER_ID,
      SERVICE_ID,
    },
    stdout: "inherit",
    stderr: "inherit",
  });
  const consumerExit = await consumer.exited;
  check("consumer-app tüm kontrolleri geçti", consumerExit === 0, `exit=${consumerExit}`);

  // Erişilemeyen peer: kapalıysa kayıt düşer (404), stale ise 503 — her ikisi
  // de fail-closed'dır (200 DÖNMEZ).
  device.kill();
  await device.exited;
  let offlineStatus = 0;
  const offline = await waitFor(async () => {
    const response = await fetch(
      `${hubUrl}/peers/${PEER_ID}/services/${SERVICE_ID}/api/status`,
      {
        headers: {
          authorization: `Bearer ${CONSUMER_TOKEN}`,
          "x-tunnel-user-id": "u-1",
          "x-tunnel-user-username": "operator",
          "x-tunnel-user-role": "operator",
        },
      },
    );
    offlineStatus = response.status;
    return response.status === 404 || response.status === 503;
  });
  check("erişilemeyen peer → fail-closed (404/503)", offline, `status=${offlineStatus}`);
} finally {
  device?.kill();
  await composition.stop();
  rmSync(dbPath, { force: true });
}

console.log(failures === 0 ? "\nUC-2: TÜM KONTROLLER GEÇTİ" : `\nUC-2: ${failures} KONTROL BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
