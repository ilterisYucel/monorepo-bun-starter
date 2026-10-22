#!/usr/bin/env bun
/**
 * hub-image-parity.mjs — hub-servis DOCKER İMAJI ile uçtan uca parity (P4 UC-3a).
 *
 * İmajı çalıştırır (sqlite), bootstrap ile peer kimliği üretir; mini
 * device-app (REST+WS) + consumer-app süreçlerini imaja karşı koşturur.
 * Loopback'ten farkı: gerçek imaj + gerçek TCP.
 *
 * Kullanım: bun tools/hub-image-parity.mjs   (imaj: HUB_IMAGE ?? ws-tunnel-hub:local)
 */

import { resolve } from "node:path";

const IMAGE = process.env.HUB_IMAGE ?? "ws-tunnel-hub:local";
const PORT = Number(process.env.HUB_PARITY_PORT ?? 5091);
const CONSUMER_TOKEN = "parity-consumer-token";
const PEER_ID = "parity-peer";
const SERVICE_ID = "local-admin";
const CONTAINER = `hub-parity-${Date.now()}`;
const examplesDir = resolve(
  import.meta.dir,
  "../packages/ws-tunnel-hub/examples",
);

let failures = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}
async function sh(cmd) {
  const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" });
  const code = await proc.exited;
  return { code, out: await new Response(proc.stdout).text() };
}
const waitFor = async (fn, timeoutMs = 15000) => {
  const start = Date.now();
  while (!(await fn())) {
    if (Date.now() - start > timeoutMs) return false;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  return true;
};

// İmaj var mı? Yoksa derle.
const inspect = await sh(["docker", "image", "inspect", IMAGE]);
if (inspect.code !== 0) {
  console.log(`[parity] imaj yok, derleniyor: ${IMAGE}`);
  const build = await sh([
    "docker",
    "build",
    "-f",
    "packages/ws-tunnel-hub/Dockerfile",
    "-t",
    IMAGE,
    ".",
  ]);
  check("imaj derlendi", build.code === 0);
  if (build.code !== 0) process.exit(1);
}

const hubUrl = `http://127.0.0.1:${PORT}`;
try {
  const run = await sh([
    "docker",
    "run",
    "-d",
    "--name",
    CONTAINER,
    "-p",
    `${PORT}:5003`,
    "-e",
    `CONSUMER_TOKEN=${CONSUMER_TOKEN}`,
    "-e",
    "HUB_DB_PATH=/data/hub.db",
    IMAGE,
  ]);
  check("imaj çalıştı", run.code === 0, run.out.trim());

  const healthy = await waitFor(async () => {
    try {
      return (await fetch(`${hubUrl}/health`)).ok;
    } catch {
      return false;
    }
  });
  check("imaj /health", healthy);

  // Bootstrap → claim
  const issued = await (
    await fetch(`${hubUrl}/admin/peers`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${CONSUMER_TOKEN}`,
        "content-type": "application/json",
      },
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
  check("imaj bootstrap → claim", Boolean(claimed.peerSecret));

  // device-app imaja bağlanır
  const device = Bun.spawn(["bun", resolve(examplesDir, "device-app.mjs")], {
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
  check("device-app imaja kaydoldu", registered);

  // consumer-app imaja karşı REST + WS
  const consumer = Bun.spawn(["bun", resolve(examplesDir, "consumer-app.mjs")], {
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
  check("consumer-app imaja karşı PASS", consumerExit === 0, `exit=${consumerExit}`);

  device.kill();
  await device.exited;
} finally {
  await sh(["docker", "rm", "-f", CONTAINER]);
}

console.log(failures === 0 ? "\nUC-3a (imaj parity): TÜM KONTROLLER GEÇTİ" : `\nUC-3a: ${failures} KONTROL BAŞARISIZ`);
process.exit(failures === 0 ? 0 : 1);
