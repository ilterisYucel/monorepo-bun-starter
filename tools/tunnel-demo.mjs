#!/usr/bin/env bun
/**
 * tunnel-demo.mjs — Faz 3 gözle doğrulama demosu (K3.1/K3.2/K3.3).
 *
 * Senaryo (gerçek WS + gerçek HTTP upstream'leri, tek kanal üzerinde):
 *   A. Field ContainerProxy ↔ konteyner FieldConnector register (Faz 2 kanıtı).
 *   B. open-session → konteyner JWT üretimi → open-session-ack → session_audit
 *      INSERT + imzalı session_open security logu (K3.3).
 *   C. Tünel HTTP: GET / → konteyner nginx(SPA) upstream'inden HTML akar (K3.1).
 *   D. Tünel HTTP: GET /api/data/latest → JSON akar (K3.2).
 *   E. Tünel WS: /ws/telemetry köprüsü çift yönlü mesaj taşır (K3.2).
 *
 * Kullanım: bun tools/tunnel-demo.mjs
 * Çıktı: her kontrol için PASS/FAIL; tümü geçerse exit 0.
 */

import http from "node:http";
import { WebSocketServer } from "ws";
import { TamperLogger } from "../packages/tamper-logger/src/index.ts";
import { FieldConnector, WsSocketClientFactory, ReconnectDelay, ContainerSessionStore, ContainerSessionServer, TunnelClient } from "../packages/ws-tunnel/src/index.ts";
import { ContainerProxy } from "../services/web-service/src/infrastructure/container-proxy/container-proxy.ts";
import { FieldSessionStore, ContainerSessionGateway, TunnelProxy } from "../packages/ws-tunnel/src/index.ts";
import { SessionAudit } from "../services/web-service/src/infrastructure/container-session/session-audit.ts";
import { ContainerProxyFieldChannel } from "../services/web-service/src/infrastructure/container-proxy/container-proxy-field-channel.ts";
import { JoseTokenSigner } from "../services/web-service/src/infrastructure/auth/jose-token-signer.ts";
import { sha256Hex } from "../services/web-service/src/infrastructure/auth/service-token.ts";

const TOKEN = "demo-tunnel-token-0123456789abcdef";
const CONTAINER_ID = "container-demo";

let failures = 0;
function check(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
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

// --- upstream'ler: HTTP (SPA + /api) + WS echo (aynı port) ---
const upstreamWs = new WebSocketServer({ noServer: true });
const upstreamHttp = http.createServer((req, res) => {
  if (req.url.startsWith("/api/data/latest")) {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ voltage: 750 }));
  } else {
    res.setHeader("content-type", "text/html");
    res.end("<html><body>KONTEYNER-SPA</body></html>");
  }
});
upstreamHttp.on("upgrade", (req, socket, head) => {
  upstreamWs.handleUpgrade(req, socket, head, (ws) => upstreamWs.emit("connection", ws, req));
});
await new Promise((r) => upstreamHttp.listen(0, "127.0.0.1", r));
const upstreamPort = upstreamHttp.address().port;
upstreamWs.on("connection", (socket) => {
  socket.on("message", (data, isBinary) => socket.send(data, { binary: isBinary }));
});

// --- logger (imzalı security kanalı) + audit kayıtları ---
const securityEvents = [];
const sink = {
  name: () => "memory",
  write: async (events) => {
    for (const event of events) {
      if (event.category === "security") securityEvents.push(event.eventCode);
    }
  },
  close: async () => {},
};
const logger = new TamperLogger({
  signingKey: "demo-signing-key-0123456789abcdef",
  service: "field",
  sinks: [sink],
  batchSize: 1,
});

const auditInserts = [];
const fakeSql = {
  execute: async (sql, params) => {
    if (sql.includes("INSERT INTO session_audit")) auditInserts.push({ sql, params });
  },
  query: async () => [],
  queryOne: async (sql) => {
    if (sql.includes("FROM field_containers")) {
      return { container_url: "http://container:80", token_hash: sha256Hex(TOKEN) };
    }
    return undefined;
  },
  connect: async () => {},
  disconnect: async () => {},
  health: async () => true,
};

// --- field: ContainerProxy + Gateway + TunnelProxy ---
const fieldWss = new WebSocketServer({ port: 0, host: "127.0.0.1" });
await new Promise((r) => fieldWss.on("listening", r));
const fieldPort = fieldWss.address().port;
const fieldProxy = new ContainerProxy(fakeSql);
fieldWss.on("connection", (socket) => {
  void fieldProxy.registerContainer(CONTAINER_ID, socket, TOKEN);
});
const fieldStore = new FieldSessionStore();
const gatewayChannel = new ContainerProxyFieldChannel(fieldProxy);
const gateway = new ContainerSessionGateway(gatewayChannel, fieldStore, new SessionAudit(fakeSql, logger), logger, { ackTimeoutMs: 3000 });
gateway.initialize();
const proxyChannel = new ContainerProxyFieldChannel(fieldProxy);
const tunnelProxy = new TunnelProxy(proxyChannel, fieldStore, logger);
tunnelProxy.initialize();

// --- konteyner: FieldConnector + SessionServer + TunnelClient ---
const store = new ContainerSessionStore(new JoseTokenSigner("container-secret-demo-0123456789"));
const connector = new FieldConnector(
  {
    wsUrls: [`ws://127.0.0.1:${fieldPort}`],
    token: TOKEN,
    containerId: CONTAINER_ID,
    heartbeatIntervalMs: 1000,
    telemetryIntervalMs: 1000,
    registerTimeoutMs: 2000,
    livenessTimeoutMs: 10000,
  },
  new WsSocketClientFactory(),
  { snapshot: async () => [] },
  new ReconnectDelay({ baseMs: 200, maxMs: 500, jitterSpanMs: 0, jitter: () => 0 }),
);
const sessionServer = new ContainerSessionServer(connector, store, logger);
sessionServer.start();
const tunnelClient = TunnelClient.create({
  webServiceUrl: `http://127.0.0.1:${upstreamPort}`,
  staticUrl: `http://127.0.0.1:${upstreamPort}`,
});
tunnelClient.attach(connector);

void connector.start();
check("A: konteyner field'a kaydoldu (Faz 2 kanalı)", await waitFor(() => connector.fieldConnected(), 5000), `state=${connector.state()}`);

// --- B: oturum açılışı (K3.3) ---
const user = {
  id: "u-1", username: "operator", role: "teknik", name: "Operator",
  fieldIds: ["f-1"], mustChangePassword: false, createdAt: "", updatedAt: "",
};
const outcome = await gateway.openSession({ fieldId: "f-1", containerId: CONTAINER_ID, user });
check("B: open-session → konteyner JWT (K3.3)", outcome.isOk(), outcome.isOk() ? `expiresInSec=${outcome.unwrap().expiresInSec}` : "hata");
const session = outcome.isOk() ? outcome.unwrap() : undefined;
fieldStore.register({
  sessionId: session.sessionId, containerId: CONTAINER_ID, token: session.token,
  user, containerRole: session.containerRole, createdAt: 0, lastActivityAt: 0, bytesIn: 0, bytesOut: 0,
});
check("B: session_audit INSERT (K3.3)", auditInserts.length === 1 && auditInserts[0].sql.includes("INSERT INTO session_audit"));
check("B: imzalı session_open security logu (K3.3)", securityEvents.includes("session_open"), securityEvents.join(","));

// --- C: tünel HTTP — SPA HTML (K3.1) ---
const htmlChunks = [];
const htmlRaw = {
  status: () => {},
  write: (chunk) => htmlChunks.push(Buffer.from(chunk)),
  end: () => {},
  destroy: () => {},
  onClose: () => {},
};
await tunnelProxy.startHttpStream({ session: fieldStore.byToken(session.token), method: "GET", path: "/", headers: {}, raw: htmlRaw });
check("C: GET / → HTML akar (K3.1)", await waitFor(() => htmlChunks.length > 0, 5000), Buffer.concat(htmlChunks).toString().trim());

// --- D: tünel HTTP — API JSON (K3.2) ---
const apiChunks = [];
const apiRaw = {
  status: () => {},
  write: (chunk) => apiChunks.push(Buffer.from(chunk)),
  end: () => {},
  destroy: () => {},
  onClose: () => {},
};
await tunnelProxy.startHttpStream({ session: fieldStore.byToken(session.token), method: "GET", path: "/api/data/latest", headers: {}, raw: apiRaw });
const apiOk = await waitFor(() => apiChunks.length > 0, 5000);
check("D: GET /api/data/latest → JSON (K3.2)", apiOk, apiOk ? Buffer.concat(apiChunks).toString().trim() : "hata");

// --- E: tünel WS köprüsü (K3.2) ---
const browserReceived = [];
const browserSocket = {
  send: (data) => browserReceived.push(Buffer.from(data).toString()),
  close: () => {},
};
const streamId = await tunnelProxy.startWsBridge({ session: fieldStore.byToken(session.token), path: "/ws/telemetry", browserSocket });
check("E: /ws köprüsü açıldı (101)", streamId !== undefined, `streamId=${streamId}`);
if (streamId !== undefined) {
  tunnelProxy.sendWsToContainer(streamId, Buffer.from("subscribe"), false);
  const echoOk = await waitFor(() => browserReceived.length >= 1, 5000);
  check("E: /ws çift yönlü mesaj (K3.2)", echoOk, browserReceived.join(","));
}

// --- kapanış ---
// Not: bun+ws sunucu close() callback'i bazı ortamlarda tetiklenmez (demo
// quirk'i); kanıt akışı vitest spec'te graceful kapanışla doğruludur. Demo
// kontroller tamamlandıktan sonra doğrudan çıkar.
sessionServer.stop();
tunnelClient.stop();
await connector.stop();
gateway.stop();
tunnelProxy.stop();
await logger.close();

console.log(failures === 0 ? "\nTÜM KONTROLLER GEÇTİ" : `\n${failures} KONTROL BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
