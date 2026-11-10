#!/usr/bin/env bun
/**
 * device-app.mjs — sahte cihaz uygulaması (P4 UC-2).
 *
 * Saf REST (/api/status, /api/actions/reboot) + WS echo sunar; peer agent
 * (TunnelConnector + TunnelClient) ile hub'a bağlanıp `local-admin` servisini
 * duyurur. Domain yok, TLS yok.
 *
 * Env: HUB_URL (http://host:port), PEER_ID, PEER_SECRET, SERVICE_ID?, PORT?
 */

import http from "node:http";
import { WebSocketServer } from "ws";
import {
  ClientSessionServer,
  ClientSessionStore,
  ReconnectDelay,
  TunnelClient,
  TunnelConnector,
  WsSocketClientFactory,
} from "../ws-tunnel/src/index.ts";
import { JoseSignerForTests } from "../ws-tunnel/src/session/__test-helpers__/jose-signer.ts";

const hubUrl = requireEnv("HUB_URL");
const peerId = requireEnv("PEER_ID");
const peerSecret = requireEnv("PEER_SECRET");
const serviceId = process.env.SERVICE_ID ?? "local-admin";
const port = Number(process.env.PORT ?? 0);

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[device-app] ${name} zorunlu`);
    process.exit(1);
  }
  return value;
}

// --- Sahte cihaz REST + WS upstream ---
const server = http.createServer((request, response) => {
  if (request.url === "/") {
    response.writeHead(200, { "content-type": "text/html" });
    response.end("<html><body>DEVICE-UI</body></html>");
    return;
  }
  if (request.url?.startsWith("/api/status")) {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, uptimeSec: 42 }));
    return;
  }
  if (request.url?.startsWith("/api/actions/reboot")) {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ accepted: true }));
    return;
  }
  response.writeHead(404);
  response.end("not found");
});
const wss = new WebSocketServer({ server });
wss.on("connection", (socket) => {
  socket.on("message", (raw, isBinary) => socket.send(raw, { binary: isBinary }));
});
await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
const upstreamBase = `http://127.0.0.1:${server.address().port}`;
console.log(`[device-app] upstream ${upstreamBase}`);

// --- Peer agent ---
const wsBase = hubUrl.replace(/^http/, "ws");
const connector = new TunnelConnector(
  {
    wsUrls: [`${wsBase}/ws/peer`],
    token: peerSecret,
    peerId,
    peerType: "device",
    services: [{ id: serviceId }],
    heartbeatIntervalMs: 1000,
    registerTimeoutMs: 5000,
    livenessTimeoutMs: 60_000,
  },
  new WsSocketClientFactory(),
  new ReconnectDelay({ baseMs: 200, maxMs: 2000, jitterSpanMs: 0, jitter: () => 0 }),
);
const tunnelClient = TunnelClient.create({
  webServiceUrl: upstreamBase,
  staticUrl: upstreamBase,
});
tunnelClient.attach(connector);
// open-session/session-end frame'lerini yanıtlar (hub oturum açabilir).
const sessionServer = new ClientSessionServer(
  connector,
  new ClientSessionStore(new JoseSignerForTests("device-app-secret-0123456789")),
  undefined,
);
sessionServer.start();
await connector.start();
console.log(`[device-app] peer '${peerId}' baglaniyor (servis: ${serviceId})`);

const shutdown = async () => {
  sessionServer.stop();
  await connector.stop();
  tunnelClient.stop();
  wss.close();
  server.closeAllConnections?.();
  await new Promise((resolve) => server.close(resolve));
  process.exit(0);
};
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
