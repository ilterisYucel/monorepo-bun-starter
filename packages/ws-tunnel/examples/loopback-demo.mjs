#!/usr/bin/env bun
/**
 * loopback-demo.mjs — ws-tunnel paket içi gözle doğrulama demosu.
 *
 * Monorepo'ya hiç değmez (ContainerProxy/Fastify/PG YOKTUR):
 *   A. FieldConnector → FieldHarness register (paket içi field ucu).
 *   B. open-session → konteyner JWT → ack.
 *   C. Tünel HTTP: GET / → SPA HTML akar (FIN ile biter).
 *   D. Tünel HTTP: GET /api/data/latest → JSON akar.
 *   E. Tünel WS: /ws/echo köprüsü çift yönlü mesaj taşır.
 *
 * Kullanım: bun packages/ws-tunnel/examples/loopback-demo.mjs
 * Çıktı: her kontrol için PASS/FAIL; tümü geçerse exit 0.
 */

import http from "node:http";
import { WebSocketServer } from "ws";

import {
  FieldConnector,
  WsSocketClientFactory,
  ReconnectDelay,
  TunnelClient,
  ContainerSessionStore,
  ContainerSessionServer,
  FieldSessionStore,
  ContainerSessionGateway,
  TunnelProxy,
} from "../src/index.ts";
import { FieldHarness } from "../src/demo/field-harness.ts";
import { JoseSignerForTests } from "../src/session/__test-helpers__/jose-signer.ts";

const CONTAINER_ID = "container-demo-loop";
const TOKEN = "loopback-demo-token-0123456789abcd";

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

// --- upstream: SPA HTML + API JSON + WS echo (aynı portta) ---
const httpServer = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "content-type": "text/html" });
    res.end("<html><body>KONTEYNER-SPA</body></html>");
  } else if (req.url?.startsWith("/api/data/latest")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end('{"voltage":750}');
  } else {
    res.writeHead(404);
    res.end("not found");
  }
});
const echoWss = new WebSocketServer({ server: httpServer });
echoWss.on("connection", (socket) => {
  socket.on("message", (raw, isBinary) => socket.send(raw, { binary: isBinary }));
});
await new Promise((r) => httpServer.listen(0, r));
const upstreamPort = httpServer.address().port;
const base = `http://127.0.0.1:${upstreamPort}`;

// --- field ucu (paket içi) ---
const harness = new FieldHarness({ registerAckDelayMs: 5 });
const fieldPort = await harness.start();
const fieldStore = new FieldSessionStore();
const audit = {
  open: async () => {},
  close: async () => {},
};
const gateway = new ContainerSessionGateway(harness, fieldStore, audit, undefined, {
  ackTimeoutMs: 3000,
});
gateway.initialize();
const tunnelProxy = new TunnelProxy(harness, fieldStore, undefined);
tunnelProxy.initialize();

// --- konteyner ucu ---
const connector = new FieldConnector(
  {
    wsUrls: [`ws://127.0.0.1:${fieldPort}/ws/container`],
    token: TOKEN,
    containerId: CONTAINER_ID,
    heartbeatIntervalMs: 200,
    telemetryIntervalMs: 200,
    registerTimeoutMs: 3000,
    livenessTimeoutMs: 60000,
  },
  new WsSocketClientFactory(),
  { snapshot: async () => [] },
  new ReconnectDelay({ baseMs: 50, maxMs: 200, jitterSpanMs: 0, jitter: () => 0 }),
);
const sessionStore = new ContainerSessionStore(
  new JoseSignerForTests("container-secret-loopback-demo-012345678"),
);
const sessionServer = new ContainerSessionServer(connector, sessionStore, undefined);
sessionServer.start();
const tunnelClient = TunnelClient.create({ webServiceUrl: base, staticUrl: base });
tunnelClient.attach(connector);

await connector.start();
check("A: konteyner field'a kaydoldu", await waitFor(() => connector.fieldConnected()), `state=${connector.state()}`);

const outcome = await gateway.openSession({
  fieldId: "f-demo",
  containerId: CONTAINER_ID,
  user: { id: "u-1", username: "operator", role: "teknik" },
});
check("B: open-session → konteyner JWT", outcome.isOk(), outcome.isOk() ? `expiresInSec=${outcome.unwrap().expiresInSec}` : "");
const session = fieldStore.byToken(outcome.isOk() ? outcome.unwrap().token : "");

const htmlChunks = [];
const htmlSink = {
  status: () => {},
  write: (c) => htmlChunks.push(Buffer.from(c)),
  end: () => {},
  destroy: () => {},
  onClose: () => {},
};
await tunnelProxy.startHttpStream({ session, method: "GET", path: "/", headers: {}, raw: htmlSink });
check("C: GET / → HTML akar", await waitFor(() => htmlChunks.length > 0), Buffer.concat(htmlChunks).toString().trim());

const apiChunks = [];
const apiSink = {
  status: () => {},
  write: (c) => apiChunks.push(Buffer.from(c)),
  end: () => {},
  destroy: () => {},
  onClose: () => {},
};
await tunnelProxy.startHttpStream({ session, method: "GET", path: "/api/data/latest", headers: {}, raw: apiSink });
check("D: GET /api/data/latest → JSON", await waitFor(() => apiChunks.length > 0), Buffer.concat(apiChunks).toString().trim());

const received = [];
const browserSocket = { send: (d) => received.push(Buffer.from(d)), close: () => {} };
const streamId = await tunnelProxy.startWsBridge({ session, path: "/ws/echo", browserSocket });
check("E: /ws köprüsü açıldı (101)", streamId !== undefined, `streamId=${streamId}`);
if (streamId !== undefined) {
  tunnelProxy.sendWsToContainer(streamId, Buffer.from("subscribe"), false);
  const echoed = await waitFor(() => received.length === 1);
  check("E: /ws çift yönlü mesaj", echoed, echoed ? received[0].toString() : "hata");
  tunnelProxy.closeWs(streamId, "demo-end");
}

await connector.stop();
tunnelClient.stop();
gateway.stop();
tunnelProxy.stop();
await harness.close();
await new Promise((r) => echoWss.close(() => httpServer.close(() => r())));

console.log(failures === 0 ? "\nTÜM KONTROLLER GEÇTİ" : `\n${failures} KONTROL BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
