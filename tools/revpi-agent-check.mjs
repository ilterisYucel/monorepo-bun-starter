#!/usr/bin/env bun
/**
 * revpi-agent-check.mjs — Aşama 4 tek çalıştırılabilir kontrol.
 *
 * Self-signed HTTPS "dashboard" (kök-mutlak asset + Basic-auth login, Cockpit
 * benzeri) + hub (env-modu, A2 host-map, TLS mount) + gerçek `peer-agent.mjs`
 * süreci + `revpi-viewer.mjs` süreci. TLS bypass, path-modu tünel, A2 kök-montaj
 * (https), kök-mutlak asset, Basic-auth login + Secure cookie, header sızıntı
 * kontrolü ve viewer cookie akışı kanıtlanır. Tümü geçerse exit 0.
 *
 * Kullanım: bun tools/revpi-agent-check.mjs
 */

import { spawnSync, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import { WebSocket } from "ws";

// Self-signed mount TLS'i fetch için kabul et (Bun NODE_TLS_REJECT_UNAUTHORIZED'ı onurlandırır).
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import { attachExtraPorts, createHub } from "../packages/ws-tunnel-hub/src/main.ts";
import { loadTlsMaterial } from "../packages/ws-tunnel-hub/src/infrastructure/outbound/tls-material.ts";

const PEER_ID = "revpi-1";
const SERVICE_ID = "revpi-dashboard";
const CONSUMER_TOKEN = "check-consumer-token";
const PEER_TOKEN = "check-peer-token";
const CERT = "/tmp/opencode/revpi-check-c.pem";
const KEY = "/tmp/opencode/revpi-check-k.pem";
const BASIC = `Basic ${Buffer.from("pi:pw").toString("base64")}`;

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};
const waitFor = async (fn, timeoutMs = 8000) => {
  const start = Date.now();
  while (!(await fn())) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((r) => setTimeout(r, 50));
  }
  return true;
};
const freePort = () =>
  new Promise((resolve) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const port = s.address().port;
      s.close(() => resolve(port));
    });
  });

if (!existsSync(CERT)) {
  spawnSync("openssl", [
    "req", "-x509", "-newkey", "rsa:2048", "-keyout", KEY, "-out", CERT,
    "-days", "1", "-nodes", "-subj", "/CN=revpi.local",
  ]);
}

// --- Self-signed HTTPS dashboard: kök-mutlak asset + Basic-auth login (Cockpit benzeri) ---
const upstream = Bun.serve({
  port: 0,
  tls: { key: Bun.file(KEY), cert: Bun.file(CERT) },
  websocket: {
    message(ws, message) {
      ws.send(message);
    },
  },
  fetch(request, server) {
    const url = new URL(request.url);
    if (url.pathname === "/") {
      return new Response(
        '<html><head><script src="/cockpit-revpi/cockpit/static/login.js"></script>' +
          '<link rel="stylesheet" href="/cockpit-revpi/cockpit/static/login.css"></head>' +
          "<body>REVPI-LOGIN</body></html>",
        { headers: { "content-type": "text/html" } },
      );
    }
    if (url.pathname === "/cockpit-revpi/cockpit/static/login.js") {
      return new Response("console.log('login');", {
        headers: { "content-type": "application/javascript" },
      });
    }
    if (url.pathname === "/cockpit-revpi/cockpit/static/login.css") {
      return new Response(
        "body{background:url(/cockpit-revpi/cockpit/static/branding.png)}",
        { headers: { "content-type": "text/css" } },
      );
    }
    // Basic-auth login: authorization header yoksa 401 (tünel header iletimi kanıtı).
    if (url.pathname === "/cockpit-revpi/cockpit/login") {
      if (request.headers.get("authorization") !== BASIC) {
        return new Response("Unauthorized", { status: 401 });
      }
      return new Response("ok", {
        headers: {
          "set-cookie": "cockpit=sess-1; Secure; HttpOnly; SameSite=Strict; Path=/",
          "csrf-token": "csrf-abc",
        },
      });
    }
    // Korumalı endpoint: cockpit cookie'si gerekir (Secure cookie akışı kanıtı).
    if (url.pathname === "/cockpit-revpi/cockpit/data") {
      const cookie = request.headers.get("cookie") ?? "";
      if (!cookie.includes("cockpit=sess-1")) {
        return new Response("Unauthorized", { status: 401 });
      }
      return Response.json({ ok: true });
    }
    // Header iletim deneyi: upstream'in gördüğü authorization'ı döner.
    if (url.pathname === "/api/echo-auth") {
      return Response.json({ auth: request.headers.get("authorization") });
    }
    // WS kanalı: cockpit cookie'si, `cockpit1` subprotocol'ü ve Origin↔Host
    // eşleşmesi zorunlu (gerçek cockpit-ws davranışı). Eksik/uyuşmazsa 403.
    if (url.pathname === "/cockpit-revpi/cockpit/channel") {
      const cookie = request.headers.get("cookie") ?? "";
      const protocol = request.headers.get("sec-websocket-protocol") ?? "";
      const origin = request.headers.get("origin") ?? "";
      const host = request.headers.get("host") ?? "";
      if (!cookie.includes("cockpit=sess-1")) {
        return new Response("Unauthorized", { status: 401 });
      }
      if (!protocol.split(",").map((p) => p.trim()).includes("cockpit1")) {
        return new Response("Protocol Required", { status: 400 });
      }
      if (origin === "" || new URL(origin).host !== host) {
        return new Response("Forbidden", { status: 403 });
      }
      if (server.upgrade(request)) return undefined;
      return new Response("upgrade failed", { status: 400 });
    }
    return new Response("not found", { status: 404 });
  },
});
const localTarget = `https://127.0.0.1:${upstream.port}`;

const mountPort = await freePort();
const hostMap = new Map([
  [`127.0.0.1:${mountPort}`, { peerId: PEER_ID, serviceId: SERVICE_ID }],
]);

const composition = await createHub(
  {
    host: "127.0.0.1",
    port: 0,
    authMode: "env",
    peerToken: PEER_TOKEN,
    consumerToken: CONSUMER_TOKEN,
    cookieName: "tunnel_session",
    staleTimeoutMs: 45_000,
    sweepIntervalMs: 1_000,
    pathAllowlist: { allowedPrefixes: ["/", "/api/", "/ws/", "/assets/"], blockedPrefixes: [] },
    hostMap,
  },
  {},
);
await composition.server.listen({ host: "127.0.0.1", port: 0 });
const hubBase = `http://127.0.0.1:${composition.server.addresses()[0].port}`;
const tlsMaterial = loadTlsMaterial({
  selfSigned: true,
  host: "localhost",
  dir: "/tmp/opencode/hub-check-tls",
});
const extraServers = attachExtraPorts(composition.server, [mountPort], tlsMaterial);

const agent = spawn("bun", ["tools/peer-agent.mjs"], {
  env: {
    ...process.env,
    HUB_URL: hubBase,
    PEER_ID,
    SERVICE_ID,
    LOCAL_TARGET: localTarget,
    PEER_TOKEN,
  },
  stdio: ["ignore", "inherit", "inherit"],
});

let viewer;
const wsSockets = [];
const rootBase = `https://127.0.0.1:${mountPort}`;
try {
  const connected = await waitFor(async () => {
    try {
      const r = await (await fetch(`${hubBase}/peers`)).json();
      return r.peers?.[0]?.status === "connected";
    } catch {
      return false;
    }
  });
  check("1) agent register (connected)", connected);

  const sessionRes = await fetch(`${hubBase}/sessions`, {
    method: "POST",
    headers: { authorization: `Bearer ${CONSUMER_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify({ peerId: PEER_ID, user: { id: "u", username: "u", role: "operator" } }),
  });
  const { token } = await sessionRes.json();
  const cookie = `tunnel_session=${token}`;

  // 2) Path-modu (geriye dönük) + TLS bypass
  const pathDash = await fetch(`${hubBase}/peers/${PEER_ID}/services/${SERVICE_ID}/`, {
    headers: { cookie },
  });
  check(
    "2) path-modu + TLS-bypass (geriye dönük)",
    pathDash.status === 200 && (await pathDash.text()).includes("REVPI-LOGIN"),
    `status=${pathDash.status}`,
  );

  // 3) A2 kök-montaj (https): HTML + kök-mutlak JS/CSS
  const rootDash = await fetch(`${rootBase}/`, { headers: { cookie } });
  const rootHtml = await rootDash.text();
  const jsRes = await fetch(`${rootBase}/cockpit-revpi/cockpit/static/login.js`, { headers: { cookie } });
  const cssRes = await fetch(`${rootBase}/cockpit-revpi/cockpit/static/login.css`, { headers: { cookie } });
  check(
    "3) A2 kök-montaj (https) + kök-mutlak JS/CSS",
    rootDash.status === 200 &&
      rootHtml.includes("/cockpit-revpi/cockpit/static/login.js") &&
      jsRes.status === 200 &&
      cssRes.status === 200,
    `html=${rootDash.status} js=${jsRes.status} css=${cssRes.status}`,
  );

  // 4) Basic-auth login (authorization iletimi) + Secure cookie
  const loginRes = await fetch(`${rootBase}/cockpit-revpi/cockpit/login`, {
    headers: { cookie, authorization: BASIC },
  });
  const setCookie = loginRes.headers.get("set-cookie") ?? "";
  const dataRes = await fetch(`${rootBase}/cockpit-revpi/cockpit/data`, {
    headers: { cookie: `${cookie}; cockpit=sess-1` },
  });
  const dataNoCookie = await fetch(`${rootBase}/cockpit-revpi/cockpit/data`, {
    headers: { cookie },
  });
  check(
    "4) Basic-auth login → 200 + Secure cookie; korumalı endpoint cookie ile 200",
    loginRes.status === 200 &&
      /cockpit=.*secure/i.test(setCookie) &&
      dataRes.status === 200 &&
      dataNoCookie.status === 401,
    `login=${loginRes.status} secure=${/secure/i.test(setCookie)} data=${dataRes.status} noCookie=${dataNoCookie.status}`,
  );

  // 5) Header iletim/ sızıntı kontrolü: cookie yolunda authorization gider,
  //    consumer-token yolunda gitmez.
  const forwarded = await (
    await fetch(`${hubBase}/peers/${PEER_ID}/services/${SERVICE_ID}/api/echo-auth`, {
      headers: { cookie, authorization: BASIC },
    })
  ).json();
  const notLeaked = await (
    await fetch(`${hubBase}/peers/${PEER_ID}/services/${SERVICE_ID}/api/echo-auth`, {
      headers: {
        authorization: `Bearer ${CONSUMER_TOKEN}`,
        "x-tunnel-user-id": "u",
        "x-tunnel-user-username": "u",
        "x-tunnel-user-role": "operator",
      },
    })
  ).json();
  check(
    "5) authorization: cookie yolunda gider, consumer yolunda sızmaz",
    forwarded.auth === BASIC && notLeaked.auth === null,
    `cookie=${forwarded.auth} consumer=${notLeaked.auth}`,
  );
  // 6) WS köprüsü (https kök-montaj): cockpit cookie + cockpit1 subprotocol
  //    ile bağlanır; cookie veya subprotocol eksikse upstream reddeder.
  const wsResult = await new Promise((resolve) => {
    const socket = new WebSocket(
      `${rootBase.replace("https", "wss")}/cockpit-revpi/cockpit/channel`,
      ["cockpit1"],
      { headers: { cookie: `${cookie}; cockpit=sess-1` } },
    );
    wsSockets.push(socket);
    const timer = setTimeout(() => resolve("timeout"), 4000);
    socket.on("open", () => socket.send("ping-cockpit"));
    socket.on("message", (data) => {
      clearTimeout(timer);
      resolve(data.toString() === "ping-cockpit" ? "ok" : "bad-echo");
      socket.close();
    });
    socket.on("error", (err) => {
      clearTimeout(timer);
      resolve(`error:${err.message}`);
    });
  });
  const wsClosed = (protocols, cookieValue) =>
    new Promise((resolve) => {
      const socket = new WebSocket(
        `${rootBase.replace("https", "wss")}/cockpit-revpi/cockpit/channel`,
        protocols,
        { headers: cookieValue ? { cookie: cookieValue } : {} },
      );
      wsSockets.push(socket);
      // Bun 1.4.3: upstream 4xx → agent `unexpected-response` ile gerçek
      // statusCode'u ack'ler; hub tarayıcıyı anında kapatır (hızlı-fail).
      const timer = setTimeout(() => resolve("stayed-open"), 5000);
      socket.on("close", () => {
        clearTimeout(timer);
        resolve("rejected");
      });
      socket.on("error", () => {
        clearTimeout(timer);
        resolve("rejected");
      });
    });
  const wsNoProtocol = await wsClosed([], `${cookie}; cockpit=sess-1`);
  const wsNoCookie = await wsClosed(["cockpit1"], cookie);
  check(
    "6) WS kanalı: cookie+subprotocol ile echo; eksiklerde red",
    wsResult === "ok" && wsNoProtocol === "rejected" && wsNoCookie === "rejected",
    `ok=${wsResult} noProto=${wsNoProtocol} noCookie=${wsNoCookie}`,
  );

  // 7) Viewer: cookie + DASHBOARD_URL (kök-montaj https)
  viewer = spawn("bun", ["tools/revpi-viewer.mjs"], {
    env: {
      ...process.env,
      HUB_URL: hubBase,
      CONSUMER_TOKEN,
      PEER_ID,
      SERVICE_ID,
      PORT: "18080",
      DASHBOARD_URL: `${rootBase}/`,
    },
    stdio: ["ignore", "inherit", "inherit"],
  });
  const viewerUp = await waitFor(async () => {
    try {
      return (await fetch("http://127.0.0.1:18080/")).ok;
    } catch {
      return false;
    }
  });
  const openRes = await fetch("http://127.0.0.1:18080/open", { method: "POST" });
  const openBody = await openRes.json();
  check(
    "7) viewer /open → tunnel_session cookie + kök-montaj https url",
    viewerUp && openRes.status === 200 &&
      (openRes.headers.get("set-cookie") ?? "").includes("tunnel_session=") &&
      openBody.url === `${rootBase}/`,
    openBody.url,
  );
} finally {
  viewer?.kill("SIGTERM");
  agent.kill("SIGTERM");
  for (const socket of wsSockets) socket.terminate?.();
  await Promise.all(
    extraServers.map(
      (s) =>
        new Promise((r) => {
          s.closeAllConnections?.();
          s.close(() => r());
        }),
    ),
  );
  await composition.stop();
  upstream.stop(true);
}

console.log(failures === 0 ? "\nTÜM KONTROLLER GEÇTİ" : `\n${failures} KONTROL BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
