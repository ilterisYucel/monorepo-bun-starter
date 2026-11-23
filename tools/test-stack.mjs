#!/usr/bin/env bun
/**
 * Test stack — 1 site + 4 konteyner + sim-lab (boss YOK).
 *
 * SPEC: BAGIMLILIK-YONU-VE-TEST-DUZENI / UC-4. Üç app klasörü de kendi kendine
 * yeter (AGENTS-DEPLOYMENT): `container/`, `site/`, `sim/`. Cihaz config'leri
 * sim-lab exporter'ından `stack/` altına üretilir (gitignore'lu).
 *
 *   bun tools/test-stack.mjs up|down|ready|export|reset
 *
 * Portlar dev stack ile aynıdır (8088 site UI, 5002 site API, 5001 container-1);
 * aynı anda yalnız biri ayakta olmalı.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const STACK = resolve(ROOT, "deployment/test-stack");
const STACK_DIRS = resolve(STACK, "stack");
const SIM_COMPOSE = resolve(STACK, "sim/docker-compose.yml");
const SIM_HOST_PORTS = resolve(STACK, "sim/docker-compose.host-ports.yml");
const SITE_COMPOSE = resolve(STACK, "site/docker-compose.yml");
const CONTAINER_COMPOSE = resolve(STACK, "container/docker-compose.yml");

/** 4 tier; container-1 portu entegrasyon/e2e varsayılanıyla (5001) uyumlu. */
const TIERS = [
  { id: "container-1", port: 5001, token: "5c43ecfee98cea5d86e2e08b50ce11de6cf4c322481add7db5b7c09ea5fb604e" },
  { id: "container-2", port: 5502, token: "140db3e00704614d3f6581b13a6f3000c103ff70f4900bd50f51f3ce0e9d71f8" },
  { id: "container-3", port: 5503, token: "0f0f9f5d5f2f4c8bb7d1a6c2e9b4331e2f7a8c1d4e6b9a3c5d7f1e2a4b6c8d0e" },
  { id: "container-4", port: 5504, token: "1a2b3c4d5e6f708192a3b4c5d6e7f8091a2b3c4d5e6f708192a3b4c5d6e7f809" },
];

/** Sağlık uçları — sim → konteynerler → site. */
const HEALTH = [
  "http://localhost:8090/compat/c1/health",
  ...TIERS.map((t) => `http://localhost:${t.port}/health`),
  "http://localhost:5002/health",
];

function run(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", env: { ...process.env, ...env } });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")} → ${r.status}`);
}

/** Ağ yoksa oluşturur (varsa sessiz geçer). */
function ensureNetwork(name) {
  spawnSync("docker", ["network", "create", name], { cwd: ROOT, stdio: "ignore" });
}

/** Env dosyası yoksa şablonundan üretir. */
function ensureEnv(dir) {
  const target = resolve(STACK, dir, ".env");
  if (!existsSync(target)) {
    copyFileSync(`${target}.example`, target);
    console.log(`[test-stack] ${dir}/.env oluşturuldu (.example'dan)`);
  }
  return target;
}

/**
 * FIELD_ID zorunlu ve SABİT olmalı: site-web imajı bu değerle derlenir,
 * DB de bu kimlikle seed edilir. Değiştirirsen `test-stack:reset` + `--build` gerekir.
 */
function ensureFieldId(envPath) {
  if (!/^FIELD_ID=\S+/m.test(readFileSync(envPath, "utf-8"))) {
    throw new Error(`[test-stack] ${envPath} içinde FIELD_ID yok (örnek: .env.example)`);
  }
}

/**
 * Saha tier'inin `service.json`'una `field_id` tag'ini basar.
 *
 * Exporter saha kimliğini bilmez (generik şablon yazar); değer `.env.site`'tadır ve
 * site-web imajının bake ettiği FIELD_ID ile aynı olmak zorundadır.
 */
function stampSiteTags(envSite) {
  const fieldId = /^FIELD_ID=(\S+)/m.exec(readFileSync(envSite, "utf-8"))?.[1];
  if (fieldId === undefined) throw new Error("[test-stack] .env.site içinde FIELD_ID yok");
  const servicePath = resolve(STACK_DIRS, "site/device-configs/service.json");
  const service = JSON.parse(readFileSync(servicePath, "utf-8"));
  service.tags = { ...(service.tags ?? {}), field_id: fieldId };
  writeFileSync(servicePath, JSON.stringify(service, null, 2) + "\n");
}

function exportConfigs(envSite) {
  mkdirSync(STACK_DIRS, { recursive: true });
  run("bun", [
    "run",
    "apps/sim-lab/src/tools/export-ems-config.ts",
    "--site",
    "deployment/test-stack/sim/site.json",
    "--out",
    "deployment/test-stack/stack",
  ]);
  stampSiteTags(envSite);
}

function up(build = false) {
  const envSim = ensureEnv("sim");
  const envContainer = ensureEnv("container");
  const envSite = ensureEnv("site");
  ensureFieldId(envSite);
  // Üretim her açılışta tazelenir (100 dosya, <1 s) — tag'ler dahil tek kaynak.
  exportConfigs(envSite);

  // Ham protokol probları (1502, 15501, 20201…) host portu ister → overlay dahil.
  run("docker", ["compose", "--env-file", envSim, "-f", SIM_COMPOSE, "-f", SIM_HOST_PORTS, "up", "-d", "--build"]);
  // Ortak köprü ağı: sim (gd-simnet) + tier'ler (test-bridge).
  ensureNetwork("test-bridge");
  for (const tier of TIERS) {
    run(
      "docker",
      [
        "compose",
        "-p",
        `test-${tier.id}`,
        "--env-file",
        envContainer,
        "-f",
        CONTAINER_COMPOSE,
        "up",
        "-d",
        ...(build ? ["--build"] : []),
      ],
      {
        TIER: tier.id,
        WEB_PORT: String(tier.port),
        TIER_DIR: resolve(STACK_DIRS, tier.id),
        CONTAINER_ID: tier.id,
        CONTAINER_TOKEN: tier.token,
      },
    );
  }
  run(
    "docker",
    [
      "compose",
      "-p",
      "test-site",
      "--env-file",
      envSite,
      "-f",
      SITE_COMPOSE,
      "up",
      "-d",
      ...(build ? ["--build"] : []),
    ],
    {
      SITE_DIR: resolve(STACK_DIRS, "site"),
    },
  );
  return ready();
}

async function ready(timeoutMs = 240_000) {
  const deadline = Date.now() + timeoutMs;
  const pending = new Set(HEALTH);
  while (Date.now() < deadline && pending.size > 0) {
    await Promise.all(
      [...pending].map(async (url) => {
        const ok = await fetch(url)
          .then((r) => r.ok)
          .catch(() => false);
        if (ok) {
          pending.delete(url);
          console.log(`[test-stack] hazır: ${url}`);
        }
      }),
    );
    if (pending.size > 0) await new Promise((r) => setTimeout(r, 2000));
  }
  if (pending.size > 0) throw new Error(`[test-stack] hazır değil: ${[...pending].join(", ")}`);
}

function down() {
  const envSim = resolve(STACK, "sim/.env");
  const envContainer = resolve(STACK, "container/.env");
  const envSite = resolve(STACK, "site/.env");
  run("docker", ["compose", "-p", "test-site", "--env-file", envSite, "-f", SITE_COMPOSE, "down"], {
    SITE_DIR: resolve(STACK_DIRS, "site"),
  });
  for (const tier of [...TIERS].reverse()) {
    run(
      "docker",
      ["compose", "-p", `test-${tier.id}`, "--env-file", envContainer, "-f", CONTAINER_COMPOSE, "down", "--remove-orphans"],
      { TIER: tier.id, WEB_PORT: String(tier.port), TIER_DIR: resolve(STACK_DIRS, tier.id) },
    );
  }
  run("docker", ["compose", "--env-file", envSim, "-f", SIM_COMPOSE, "-f", SIM_HOST_PORTS, "down"]);
}

/** Proje volume'larını siler (taze DB: yalnız test stack'te). */
function resetVolumes() {
  for (const project of ["test-site", ...TIERS.map((t) => `test-${t.id}`)]) {
    const ls = spawnSync(
      "docker",
      ["volume", "ls", "-q", "--filter", `label=com.docker.compose.project=${project}`],
      { cwd: ROOT, encoding: "utf-8" },
    );
    const names = (ls.stdout ?? "").trim().split("\n").filter(Boolean);
    if (names.length > 0) spawnSync("docker", ["volume", "rm", ...names], { cwd: ROOT, stdio: "ignore" });
  }
}

const command = process.argv[2] ?? "up";
if (command === "export") {
  exportConfigs(ensureEnv("site"));
} else if (command === "ready") {
  await ready();
} else if (command === "down") {
  down();
} else if (command === "reset") {
  down();
  resetVolumes();
  console.log("[test-stack] volume'lar silindi — `test-stack:up` ile taze kurulum");
} else if (command === "up") {
  await up(process.argv.includes("--build"));
} else {
  console.error(`Bilinmeyen komut: ${command} (up|down|ready|export|reset)`);
  process.exit(2);
}
