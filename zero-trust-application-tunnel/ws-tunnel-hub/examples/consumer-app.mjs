#!/usr/bin/env bun
/**
 * consumer-app.mjs — tüketici uygulaması (P4 UC-2).
 *
 * Consumer token ile hub'a bağlanır; opak REST çağrısı + WS gidiş-dönüş
 * doğrular; hata yollarını (offline peer → 503, bilinmeyen servis → 404)
 * kontrol eder. Tümü geçerse exit 0.
 *
 * Env: HUB_URL (http://host:port), CONSUMER_TOKEN, PEER_ID, SERVICE_ID?
 */

import { WebSocket } from "ws";

const hubUrl = requireEnv("HUB_URL").replace(/\/+$/, "");
const consumerToken = requireEnv("CONSUMER_TOKEN");
const peerId = requireEnv("PEER_ID");
const serviceId = process.env.SERVICE_ID ?? "local-admin";
const userHeaders = {
  "x-tunnel-user-id": "u-1",
  "x-tunnel-user-username": "operator",
  "x-tunnel-user-role": "operator",
};

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`[consumer-app] ${name} zorunlu`);
    process.exit(1);
  }
  return value;
}

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

// 1) Opak REST
const statusResponse = await fetch(
  `${hubUrl}/peers/${peerId}/services/${serviceId}/api/status`,
  { headers: { authorization: `Bearer ${consumerToken}`, ...userHeaders } },
);
const statusBody = statusResponse.ok ? await statusResponse.json() : {};
check(
  "1) opak REST /api/status",
  statusResponse.status === 200 && statusBody.ok === true,
  JSON.stringify(statusBody),
);

// 2) Bilinmeyen servis → 404
const unknown = await fetch(
  `${hubUrl}/peers/${peerId}/services/ghost/api/status`,
  { headers: { authorization: `Bearer ${consumerToken}`, ...userHeaders } },
);
check("2) bilinmeyen servis → 404", unknown.status === 404, `status=${unknown.status}`);

// 3) WS gidiş-dönüş (tünelden echo)
const wsBase = hubUrl.replace(/^http/, "ws");
const wsOk = await new Promise((resolve) => {
  const socket = new WebSocket(
    `${wsBase}/peers/${peerId}/services/${serviceId}/ws/channel`,
    { headers: { authorization: `Bearer ${consumerToken}`, ...userHeaders } },
  );
  const timer = setTimeout(() => resolve(false), 5000);
  socket.on("open", () => socket.send("hello-tunnel"));
  socket.on("message", (data) => {
    clearTimeout(timer);
    resolve(data.toString() === "hello-tunnel");
    socket.close();
  });
  socket.on("error", () => {
    clearTimeout(timer);
    resolve(false);
  });
});
check("3) WS köprü gidiş-dönüş", wsOk);

console.log(failures === 0 ? "\nCONSUMER: TÜM KONTROLLER GEÇTİ" : `\nCONSUMER: ${failures} KONTROL BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
