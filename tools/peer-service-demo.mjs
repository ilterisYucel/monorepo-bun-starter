#!/usr/bin/env bun
/**
 * peer-service-demo.mjs — OPAK peer servis keşfi + erişimi gözle doğrulama demosu
 * (WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md §6, SC-1).
 *
 * Monorepo'ya değmez (Fastify/PG YOKTUR): sahte "RevPi" upstream + paket içi hub
 * adaptörü + HubPeerRegistry + SessionGateway + TunnelProxy + TunnelConnector/Client.
 *
 *   A. Peer (device) hub'a register olur → servis duyurusu HubPeerRegistry'ye yazılır.
 *   B. Keşif: servicesOf + peers() duyuruyu döner.
 *   C. open-session → kalıcı oturum (JWT).
 *   D. Opak erişim: GET /assets/app.js tünelden akar (upstream'den).
 *
 * Kullanım: bun tools/peer-service-demo.mjs   (tümü geçerse exit 0)
 */

import http from "node:http";
import { WebSocketServer } from "ws";

import {
  TunnelConnector,
  WsSocketClientFactory,
  ReconnectDelay,
  TunnelClient,
  ClientSessionStore,
  ClientSessionServer,
  HubSessionStore,
  SessionGateway,
  TunnelProxy,
  HubPeerRegistry,
} from "../packages/ws-tunnel/src/index.ts";
import { JoseSignerForTests } from "../packages/ws-tunnel/src/session/__test-helpers__/jose-signer.ts";

const PEER_ID = "revpi-001";
const SERVICE_ID = "local-admin";
const TOKEN = "peer-service-demo-token-0123456789";

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}
const waitFor = (fn, timeoutMs = 5000) =>
  new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (fn()) return resolve(true);
      if (Date.now() - start > timeoutMs) return resolve(false);
      setTimeout(tick, 10);
    };
    tick();
  });

// --- Sahte RevPi dashboard upstream'i (dokunamadığımız yabancı uygulama) ---
const httpServer = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<html><body>REVPI-DASHBOARD</body></html>");
  } else if (req.url?.startsWith("/assets/")) {
    res.writeHead(200, { "content-type": "application/javascript" });
    res.end("console.log('revpi-admin');");
  } else {
    res.writeHead(404);
    res.end("not found");
  }
});
await new Promise((r) => httpServer.listen(0, r));
const base = `http://127.0.0.1:${httpServer.address().port}`;

// --- Hub adaptörü (IHubChannel) — register duyurusunu kayda yazar ---
class DemoHub {
  constructor() {
    this.wss = new WebSocketServer({ port: 0 });
    this.sockets = new Map();
    this.controlSubs = new Set();
    this.binarySubs = new Set();
    this.onRegister = null;
  }
  start() {
    return new Promise((resolve) => {
      this.wss.on("connection", (ws) => {
        let peerId;
        ws.on("message", (raw, isBinary) => {
          if (isBinary) {
            this.binarySubs.forEach((cb) => cb(peerId, raw));
            return;
          }
          let msg;
          try {
            msg = JSON.parse(raw.toString());
          } catch {
            return;
          }
          if (msg.type === "register") {
            peerId = msg.peerId;
            this.sockets.set(peerId, ws);
            this.onRegister?.(peerId, msg);
            ws.send(
              JSON.stringify({ type: "register-ack", status: "ok", serverTime: new Date().toISOString() }),
            );
            return;
          }
          this.controlSubs.forEach((cb) => cb(peerId, msg));
        });
        ws.on("close", () => {
          if (peerId) this.sockets.delete(peerId);
        });
      });
      this.wss.on("listening", () => resolve(this.wss.address().port));
    });
  }
  sendControl(peerId, message) {
    this.sockets.get(peerId)?.send(JSON.stringify(message));
  }
  sendBinary(peerId, data) {
    this.sockets.get(peerId)?.send(data);
  }
  onControlMessage(sub) {
    this.controlSubs.add(sub);
    return () => this.controlSubs.delete(sub);
  }
  onBinaryFrame(sub) {
    this.binarySubs.add(sub);
    return () => this.binarySubs.delete(sub);
  }
  isConnected(peerId) {
    return this.sockets.has(peerId);
  }
  async close() {
    await new Promise((r) => this.wss.close(() => r()));
  }
}

const hub = new DemoHub();
const hubPort = await hub.start();
const registry = new HubPeerRegistry();
hub.onRegister = (peerId, msg) =>
  registry.register({ peerId, peerType: msg.peerType, services: msg.services ?? [] });

const hubStore = new HubSessionStore();
const audit = { open: async () => {}, close: async () => {} };
const gateway = new SessionGateway(hub, hubStore, audit, undefined, { ackTimeoutMs: 3000 });
gateway.initialize();
const tunnelProxy = new TunnelProxy(hub, hubStore, undefined);
tunnelProxy.initialize();

// --- Peer ucu (device) — servisini duyurur ---
const connector = new TunnelConnector(
  {
    wsUrls: [`ws://127.0.0.1:${hubPort}/ws/field`],
    token: TOKEN,
    peerId: PEER_ID,
    peerType: "device",
    services: [{ id: SERVICE_ID, meta: { title: "RevPi Admin" } }],
    heartbeatIntervalMs: 200,
    registerTimeoutMs: 3000,
    livenessTimeoutMs: 60000,
  },
  new WsSocketClientFactory(),
  new ReconnectDelay({ baseMs: 50, maxMs: 200, jitterSpanMs: 0, jitter: () => 0 }),
);
const sessionStore = new ClientSessionStore(
  new JoseSignerForTests("peer-service-demo-secret-0123456789"),
);
new ClientSessionServer(connector, sessionStore, undefined).start();
const tunnelClient = TunnelClient.create({ webServiceUrl: base, staticUrl: base });
tunnelClient.attach(connector);

await connector.start();
check("A: peer hub'a kaydoldu (device)", await waitFor(() => connector.connected()), `state=${connector.state()}`);

const announced = registry.servicesOf(PEER_ID);
check(
  "B: servis duyurusu HubPeerRegistry'ye yazıldı",
  announced.length === 1 && announced[0].id === SERVICE_ID,
  JSON.stringify(announced),
);
check(
  "B: keşif peer'ı device tipiyle listeler",
  registry.peers().some((p) => p.peerId === PEER_ID && p.peerType === "device"),
);

const outcome = await gateway.openSession({
  fieldId: PEER_ID,
  peerId: PEER_ID,
  user: { id: "u-1", username: "operator", role: "teknik" },
});
check("C: open-session → kalıcı oturum (JWT)", outcome.isOk());
const session = hubStore.byToken(outcome.isOk() ? outcome.unwrap().token : "");

const chunks = [];
const sink = {
  status: () => {},
  write: (c) => chunks.push(Buffer.from(c)),
  end: () => {},
  destroy: () => {},
  onClose: () => {},
};
await tunnelProxy.startHttpStream({
  session,
  method: "GET",
  path: "/assets/app.js",
  headers: {},
  raw: sink,
});
check(
  "D: opak erişim GET /assets/app.js tünelden aktı",
  await waitFor(() => chunks.length > 0),
  Buffer.concat(chunks).toString().trim(),
);

await connector.stop();
tunnelClient.stop();
gateway.stop();
tunnelProxy.stop();
await hub.close();
await new Promise((r) => httpServer.close(() => r()));

console.log(failures === 0 ? "\nTÜM KONTROLLER GEÇTİ" : `\n${failures} KONTROL BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
