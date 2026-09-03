#!/usr/bin/env bun
/**
 * field-connector-demo.mjs — Faz 2 gözle doğrulama demosu (K2.1/K2.2/T2.5).
 *
 * Senaryo (gerçek `ws` sunucusu + gerçek FieldConnector/ContainerProxy):
 *   A. FieldConnector → ContainerProxy tam tur: register → register-ack →
 *      connected. K2.1 kanıtı: start()→connected süresi ölçülür (< 5 sn).
 *   B. Heartbeat akışı: lastSeenAt tazelenir (ContainerProxy sorgusu).
 *   C. K2.2 mekanizması: raw client kayıtlı, TEK heartbeat sonrası sessiz —
 *      kısaltılmış eşik (3 sn) ile "stale" gözlemlenir. (Üretim eşiği 45 sn'dir;
 *      tam 45 sn zamanlaması fake-timer unit testinde sabitlidir.)
 *   D. T2.5: ContainerProxy.pushConfigUpdate → heartbeat aralığı canlı değişir
 *      (1.2 sn sessizlik), restart yok.
 *   E. stop() → offline; yeniden bağlanma yok.
 *
 * Kullanım: bun tools/field-connector-demo.mjs
 * Çıktı: her kontrol için PASS/FAIL + ölçümler; tümü geçerse exit 0.
 */

import { WebSocketServer, WebSocket } from "ws";
import { FieldConnector, WsSocketClientFactory, ReconnectDelay } from "../packages/ws-tunnel/src/index.ts";
import { ContainerProxy } from "../services/web-service/src/infrastructure/container-proxy/container-proxy.ts";
import { sha256Hex } from "../services/web-service/src/infrastructure/auth/service-token.ts";

const TOKEN = "demo-service-token-0123456789abcdef";
const CONTAINER_ID = "container-1";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

function fakeSql(rows) {
  return {
    connect: async () => {},
    disconnect: async () => {},
    execute: async () => {},
    query: async () => [],
    queryOne: async (sql) => {
      if (sql.includes("SELECT 1 AS n")) return rows.anyToken ? { n: 1 } : undefined;
      if (sql.includes("FROM field_containers")) {
        if (rows.byContainer) return { container_url: rows.byContainer.container_url ?? null, token_hash: rows.byContainer.token_hash ?? null };
        return undefined;
      }
      return undefined;
    },
    health: async () => true,
  };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const waitFor = async (cond, timeoutMs) => {
  const start = Date.now();
  while (!cond()) {
    if (Date.now() - start > timeoutMs) return false;
    await sleep(20);
  }
  return true;
};

// ---------------------------------------------------------------------------
// A + B + D + E: FieldConnector ↔ ContainerProxy tam tur
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ port: 0 });
await new Promise((resolve) => wss.on("listening", resolve));
const port = wss.address().port;

const heartbeats = [];
const proxy = new ContainerProxy(
  fakeSql({ byContainer: { container_url: "http://container:80", token_hash: sha256Hex(TOKEN) } }),
  undefined,
  { staleTimeoutMs: 3000 },
);

wss.on("connection", (ws) => {
  void proxy.registerContainer(CONTAINER_ID, ws, TOKEN);
});

const connector = new FieldConnector(
  {
    wsUrls: [`ws://127.0.0.1:${port}`],
    token: TOKEN,
    containerId: CONTAINER_ID,
    heartbeatIntervalMs: 500,
    telemetryIntervalMs: 500,
    registerTimeoutMs: 2000,
    livenessTimeoutMs: 10000,
  },
  new WsSocketClientFactory(),
  { snapshot: async () => [{ deviceId: "bsc-1", name: "Voltage", value: 750, description: "", unit: "V", timestamp: new Date().toISOString() }] },
  new ReconnectDelay({ baseMs: 500, maxMs: 2000, jitterSpanMs: 0, jitter: () => 0 }),
);

const t0 = Date.now();
void connector.start();
const connected = await waitFor(() => connector.fieldConnected(), 5000);
const elapsed = Date.now() - t0;
check("A: start() → connected (K2.1 hedefi < 5000 ms)", connected, `${elapsed} ms`);

const seenAtRegister = proxy.lastSeenAt(CONTAINER_ID);
check("B: register lastSeenAt kuruldu", seenAtRegister !== undefined, `t=${seenAtRegister}`);

await sleep(1600);
check("B: heartbeat akışı (1.6 sn / 500 ms) lastSeenAt'i tazeledi", proxy.lastSeenAt(CONTAINER_ID) > seenAtRegister, `lastSeenAt=${proxy.lastSeenAt(CONTAINER_ID)}`);
check("B: bağlantı durumu connected", proxy.connectionStatus().get(CONTAINER_ID) === "connected", proxy.connectionStatus().get(CONTAINER_ID));

// D: config-update → heartbeat aralığı 100 sn'ye çıkar (yalnızca ilk heartbeat kalır)
proxy.pushConfigUpdate(CONTAINER_ID, { heartbeatIntervalMs: 100000 });
const hbAfterConfig = proxy.lastSeenAt(CONTAINER_ID);
await sleep(1200);
const quiet = proxy.lastSeenAt(CONTAINER_ID) === hbAfterConfig;
check("D: config-update heartbeat'i durdurdu (restart'sız — T2.5)", quiet, `lastSeenAt sabit: ${hbAfterConfig}`);

// E: stop
await connector.stop();
check("E: stop() → offline", connector.state() === "offline", connector.state());

// ---------------------------------------------------------------------------
// C: stale mekanizması (kısaltılmış eşik 3 sn; üretim 45 sn)
// ---------------------------------------------------------------------------
const staleProxy = new ContainerProxy(
  fakeSql({ byContainer: { container_url: "http://container:80", token_hash: sha256Hex(TOKEN) } }),
  undefined,
  { staleTimeoutMs: 3000 },
);
const staleWss = new WebSocketServer({ port: 0 });
await new Promise((resolve) => staleWss.on("listening", resolve));
const stalePort = staleWss.address().port;

staleWss.on("connection", (ws) => {
  void staleProxy.registerContainer("container-stale", ws, TOKEN);
});
const raw = new WebSocket(`ws://127.0.0.1:${stalePort}`);
await new Promise((resolve) => raw.on("open", resolve));
// register-ack'i bekleyip TEK heartbeat gönder
await waitFor(() => staleProxy.connectionStatus().get("container-stale") === "connected", 2000);
raw.send(JSON.stringify({ type: "heartbeat", ts: Date.now() }));
check("C: tek heartbeat → connected", staleProxy.connectionStatus().get("container-stale") === "connected");
await sleep(3500);
check("C: 3 sn sessizlik → stale (K2.2 mekanizması; üretim eşiği 45 sn)", staleProxy.connectionStatus().get("container-stale") === "stale", staleProxy.connectionStatus().get("container-stale"));
raw.send(JSON.stringify({ type: "heartbeat", ts: Date.now() }));
await waitFor(() => staleProxy.connectionStatus().get("container-stale") === "connected", 1000);
check("C: stale → heartbeat → connected geri döner", staleProxy.connectionStatus().get("container-stale") === "connected");

raw.close();
staleWss.close();
wss.close();

console.log(failures === 0 ? "\nTÜM KONTROLLER GEÇTİ" : `\n${failures} KONTROL BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
