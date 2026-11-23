#!/usr/bin/env bun
/**
 * Sim-protokol çalışma zamanı — SPEC v2 / UC-3 T-2.
 *
 * Sim katmanı yalnız **sim-lab + container tier** (device-service + web-service +
 * Timescale + Redis) gerektirir; hub/site/ws-tunnel/container2 YOK. Bu, dosya
 * başına `normalizeStack` ihtiyacını azaltır (hedefli reset yeter).
 *
 * Kullanım:
 *   bun tools/sim-runtime.mjs up     # sim-lab + container tier (idempotent) + hazır bekle
 *   bun tools/sim-runtime.mjs down   # yalnız bu ikisini durdurur
 *   bun tools/sim-runtime.mjs ready  # hazır mı (8090 meta + 5001 health)
 *
 * Kapsam dışı: site tier, container2, hub, e2e UI'ları (test-stack).
 */

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const COMPOSES = [
  [
    "--env-file", "deployment/v2/dev/simulator-app/.env",
    "-f", "deployment/v2/dev/simulator-app/docker-compose.yml",
    "-f", "deployment/v2/dev/simulator-app/docker-compose.host-ports.yml",
  ],
  [
    "--env-file", "deployment/v2/dev/container/.env",
    "-f", "deployment/v2/dev/container/docker-compose.yml",
  ],
];

const ENDPOINTS = ["http://localhost:8090/api/meta", "http://localhost:5001/health"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const composeFileOf = (args) => args[args.indexOf("-f") + 1];

function compose(args, verb) {
  const file = composeFileOf(args);
  if (!existsSync(join(ROOT, file))) {
    console.warn(`[sim-runtime] compose yok, atlandı: ${file}`);
    return;
  }
  execSync(`docker compose ${args.join(" ")} ${verb}`, { cwd: ROOT, stdio: "inherit" });
}

async function ready() {
  const results = await Promise.all(
    ENDPOINTS.map((u) =>
      fetch(u)
        .then((r) => r.ok)
        .catch(() => false),
    ),
  );
  return results.every(Boolean);
}

async function waitReady(timeoutMs = 180_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await ready()) {
      console.log("[sim-runtime] hazır");
      return;
    }
    await sleep(3000);
  }
  console.error("[sim-runtime] zaman aşımı — sim-lab/container tier hazır değil");
  process.exit(1);
}

const cmd = process.argv[2] ?? "up";
if (cmd === "up") {
  for (const c of COMPOSES) compose(c, "up -d");
  await waitReady();
} else if (cmd === "down") {
  for (const c of [...COMPOSES].reverse()) compose(c, "down");
} else if (cmd === "ready") {
  const ok = await ready();
  console.log(ok ? "[sim-runtime] hazır" : "[sim-runtime] hazır değil");
  process.exit(ok ? 0 : 1);
} else {
  console.error(`[sim-runtime] bilinmeyen komut: ${cmd} (up|down|ready)`);
  process.exit(2);
}
