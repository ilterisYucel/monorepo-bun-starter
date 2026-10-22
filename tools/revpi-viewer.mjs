#!/usr/bin/env bun
/**
 * revpi-viewer.mjs — basit web app: butona tıkla → RevPi dashboard açılır.
 *
 * Hub ile AYNI host'ta servis edilmeli (cookie host'a bağlı, porttan bağımsız):
 * varsayılan 127.0.0.1. Akış: POST /open → hub /sessions → `tunnel_session`
 * cookie (Path=/) → tarayıcı hub'a `/peers/...` isteği atar (cookie gider).
 *
 * Env: HUB_URL (http://127.0.0.1:5003), CONSUMER_TOKEN, PEER_ID, SERVICE_ID,
 *      HOST?, PORT? (8080), USER_ID?/USER_NAME?/USER_ROLE?,
 *      DASHBOARD_URL? (A2 kök-montaj: http://127.0.0.1:5101/)
 */

const hubUrl = process.env.HUB_URL ?? "http://127.0.0.1:5003";
const consumerToken = process.env.CONSUMER_TOKEN ?? "dev-hub-consumer-token";
const peerId = process.env.PEER_ID ?? "revpi-1";
const serviceId = process.env.SERVICE_ID ?? "revpi-dashboard";
const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 8080);
const user = {
  id: process.env.USER_ID ?? "viewer",
  username: process.env.USER_NAME ?? "viewer",
  role: process.env.USER_ROLE ?? "operator",
};

// A2 kök-montaj verilirse onu kullan; yoksa path-modu (geriye dönük).
const dashboardUrl =
  process.env.DASHBOARD_URL ?? `${hubUrl}/peers/${peerId}/services/${serviceId}/`;

const page = `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<title>RevPi Viewer</title></head>
<body style="font-family:system-ui;padding:2rem">
<h1>RevPi Dashboard</h1>
<button id="open" style="font-size:1.2rem;padding:.6rem 1.2rem">Dashboard'ı Aç</button>
<p id="msg"></p>
<script>
document.getElementById("open").onclick = async () => {
  const r = await fetch("/open", { method: "POST" });
  const data = await r.json();
  if (data.url) window.open(data.url, "_blank");
  else document.getElementById("msg").textContent = data.error ?? "hata";
};
</script></body></html>`;

const server = Bun.serve({
  hostname: host,
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(page, { headers: { "content-type": "text/html; charset=utf-8" } });
    }
    if (url.pathname === "/open" && request.method === "POST") {
      const response = await fetch(`${hubUrl}/sessions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${consumerToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ peerId, user }),
      });
      if (!response.ok) {
        return Response.json(
          { error: `hub /sessions ${response.status}` },
          { status: 502 },
        );
      }
      const { token } = await response.json();
      return Response.json(
        { url: dashboardUrl },
        {
          headers: {
            // cookie adı hub'ın beklediği ad; Path=/ tüm dashboard asset'lerini kapsar.
            "set-cookie": `tunnel_session=${token}; Path=/; SameSite=Lax; HttpOnly`,
          },
        },
      );
    }
    return new Response("not found", { status: 404 });
  },
});

console.log(`[revpi-viewer] http://${host}:${server.port}/  → ${dashboardUrl}`);
