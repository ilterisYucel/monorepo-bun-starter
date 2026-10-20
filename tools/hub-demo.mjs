#!/usr/bin/env bun
/**
 * hub-demo.mjs — hub-servis loopback doğrulaması (P4 UC-1, docker'sız).
 *
 * Tek süreçte: process-içi hub-servis (sqlite) + sahte cihaz peer'i
 * (TunnelConnector/TunnelClient) + consumer akışları. Adım adım PASS/FAIL;
 * tümü geçerse exit 0.
 *
 * Kullanım: bun tools/hub-demo.mjs
 */

import http from "node:http";
import { rmSync } from "node:fs";
import { WebSocket, WebSocketServer } from "ws";

import {
  ClientSessionServer,
  ClientSessionStore,
  ReconnectDelay,
  TunnelClient,
  TunnelConnector,
  WsSocketClientFactory,
} from "../packages/ws-tunnel/src/index.ts";
import { createHub } from "../packages/ws-tunnel-hub/src/main.ts";
import { BunSqliteDatabase } from "../packages/ws-tunnel-hub/src/infrastructure/outbound/bun-sqlite-database.ts";
import { JoseSignerForTests } from "../packages/ws-tunnel/src/session/__test-helpers__/jose-signer.ts";

const CONSUMER_TOKEN = "demo-consumer-token";
const PEER_ID = "revpi-1";
const SERVICE_ID = "local-admin";
const USER = { id: "u-1", username: "operator", role: "operator" };
const USER_HEADERS = {
  "x-tunnel-user-id": USER.id,
  "x-tunnel-user-username": USER.username,
  "x-tunnel-user-role": USER.role,
};

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}
const waitFor = async (fn, timeoutMs = 5000) => {
  const start = Date.now();
  while (!(await fn())) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return true;
};

// --- Sahte cihaz upstream'i (REST + WS echo) ---
const upstream = http.createServer((request, response) => {
  if (request.url === "/") {
    response.writeHead(200, { "content-type": "text/html" });
    response.end("<html><body>DEVICE-UI</body></html>");
    return;
  }
  if (request.url?.startsWith("/api/status")) {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true, uptimeSec: 123 }));
    return;
  }
  if (request.url?.startsWith("/assets/")) {
    response.writeHead(200, { "content-type": "application/javascript" });
    response.end("console.log('device-asset');");
    return;
  }
  response.writeHead(404);
  response.end("not found");
});
const upstreamWss = new WebSocketServer({ server: upstream });
upstreamWss.on("connection", (socket) => {
  socket.on("message", (raw, isBinary) => socket.send(raw, { binary: isBinary }));
});
await new Promise((resolve) => upstream.listen(0, "127.0.0.1", resolve));
const upstreamPort = upstream.address().port;
const upstreamBase = `http://127.0.0.1:${upstreamPort}`;

// --- Hub-servis (process-içi, sqlite) ---
const dbPath = `/tmp/opencode/hub-demo-${Date.now()}.db`;
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
const hubPort = composition.server.addresses()[0].port;
const hubBase = `http://127.0.0.1:${hubPort}`;
const adminHeaders = {
  authorization: `Bearer ${CONSUMER_TOKEN}`,
  "content-type": "application/json",
};

let connector;
let tunnelClient;
let sessionServer;
let consumerSocket;
try {
  // 1) Bootstrap → claim → kalıcı kimlik
  const createResponse = await fetch(`${hubBase}/admin/peers`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ peerId: PEER_ID }),
  });
  const issued = await createResponse.json();
  const claimResponse = await fetch(`${hubBase}/peers/bootstrap/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ peerId: PEER_ID, bootstrapToken: issued.bootstrapToken }),
  });
  const claimed = await claimResponse.json();
  check(
    "1) bootstrap → claim → peerSecret",
    createResponse.status === 201 && claimResponse.status === 200 && Boolean(claimed.peerSecret),
  );

  // 2) Peer register
  connector = new TunnelConnector(
    {
      wsUrls: [`ws://127.0.0.1:${hubPort}/ws/peer`],
      token: claimed.peerSecret,
      peerId: PEER_ID,
      peerType: "device",
      services: [{ id: SERVICE_ID }],
      heartbeatIntervalMs: 500,
      registerTimeoutMs: 3000,
      livenessTimeoutMs: 60_000,
    },
    new WsSocketClientFactory(),
    new ReconnectDelay({ baseMs: 100, maxMs: 500, jitterSpanMs: 0, jitter: () => 0 }),
  );
  sessionServer = new ClientSessionServer(
    connector,
    new ClientSessionStore(new JoseSignerForTests("hub-demo-secret-0123456789")),
    undefined,
  );
  sessionServer.start();
  tunnelClient = TunnelClient.create({
    webServiceUrl: upstreamBase,
    staticUrl: upstreamBase,
  });
  tunnelClient.attach(connector);
  await connector.start();
  check("2) peer register (connected)", await waitFor(() => connector.connected()));

  // 3) Keşif
  const peers = await (await fetch(`${hubBase}/peers`)).json();
  const services = await (
    await fetch(`${hubBase}/peers/${PEER_ID}/services`)
  ).json();
  check(
    "3) keşif (peers + services)",
    peers.peers?.[0]?.status === "connected" &&
      services.services?.[0]?.id === SERVICE_ID,
  );

  // 4) Opak REST (consumer token + user başlıkları)
  const restResponse = await fetch(
    `${hubBase}/peers/${PEER_ID}/services/${SERVICE_ID}/api/status`,
    { headers: { authorization: `Bearer ${CONSUMER_TOKEN}`, ...USER_HEADERS } },
  );
  const restBody = await restResponse.json();
  check(
    "4) opak REST (/api/status)",
    restResponse.status === 200 && restBody.ok === true,
    JSON.stringify(restBody),
  );

  // 5) Oturum + cookie front-door
  const sessionResponse = await fetch(`${hubBase}/sessions`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ peerId: PEER_ID, user: USER }),
  });
  const session = await sessionResponse.json();
  const cookieResponse = await fetch(
    `${hubBase}/peers/${PEER_ID}/services/${SERVICE_ID}/assets/app.js`,
    { headers: { cookie: `tunnel_session=${session.token}` } },
  );
  check(
    "5) oturum + cookie erişimi (asset)",
    sessionResponse.status === 201 &&
      cookieResponse.status === 200 &&
      (await cookieResponse.text()).includes("device-asset"),
  );

  // 6) WS köprü (tünelden opak WS)
  const wsEcho = await new Promise((resolve) => {
    const socket = new WebSocket(
      `ws://127.0.0.1:${hubPort}/peers/${PEER_ID}/services/${SERVICE_ID}/ws/channel`,
      { headers: { authorization: `Bearer ${CONSUMER_TOKEN}`, ...USER_HEADERS } },
    );
    const timer = setTimeout(() => resolve(false), 4000);
    socket.on("open", () => socket.send("ping-tunnel"));
    socket.on("message", (data) => {
      clearTimeout(timer);
      resolve(data.toString() === "ping-tunnel");
      socket.close();
    });
    socket.on("error", () => {
      clearTimeout(timer);
      resolve(false);
    });
  });
  check("6) WS köprü (tünelden echo)", wsEcho);

  // 7) Control gönderimi + consumer relay (çift yön)
  const receivedOnPeer = [];
  connector.onMessage((message) => receivedOnPeer.push(message));
  const controlResponse = await fetch(`${hubBase}/control/${PEER_ID}`, {
    method: "POST",
    headers: adminHeaders,
    body: JSON.stringify({ type: "telemetry-query", queryId: "q-1" }),
  });
  const peerGotControl = await waitFor(() =>
    receivedOnPeer.some((m) => m?.type === "telemetry-query"),
  );

  const consumerMessages = [];
  consumerSocket = new WebSocket(
    `ws://127.0.0.1:${hubPort}/ws/consumer`,
    { headers: { authorization: `Bearer ${CONSUMER_TOKEN}` } },
  );
  await new Promise((resolve) => consumerSocket.once("open", resolve));
  consumerSocket.on("message", (data) => consumerMessages.push(data.toString()));
  connector.sendControl({ type: "event", eventId: "e-1" });
  const consumerGotRelay = await waitFor(() => consumerMessages.length > 0);
  const relayed = consumerGotRelay ? JSON.parse(consumerMessages[0]) : {};
  check(
    "7) control → peer + peer event → consumer relay",
    controlResponse.status === 200 &&
      peerGotControl &&
      relayed.peerId === PEER_ID &&
      relayed.message?.eventId === "e-1",
  );
} finally {
  consumerSocket?.close();
  if (connector) await connector.stop();
  tunnelClient?.stop();
  sessionServer?.stop();
  await composition.stop();
  upstreamWss.close();
  upstream.closeAllConnections?.();
  await new Promise((resolve) => upstream.close(resolve));
  rmSync(dbPath, { force: true });
}

console.log(failures === 0 ? "\nTÜM KONTROLLER GEÇTİ" : `\n${failures} KONTROL BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
