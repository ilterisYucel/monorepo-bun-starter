#!/usr/bin/env bun
/**
 * device-config-drift — kök `configs/` (source of truth) ile deployment kopyalarını denetler.
 *
 * Kullanım:
 *   bun tools/device-config-drift.mjs [--root configs] [--deploy deployment]
 *
 * Kural (AGENTS-DEVICE-CONFIG.md): register listesi/bitfield/alarm/canonical kökten
 * DEĞİŞMEZ; deployment yalnız proje değişkeni (deviceId/name/connection/transport) taşır.
 * - Eksik girdi → HATA.
 * - Fazla girdi → allowlist'te ise UYARI (ör. demo-only setpoint), değilse HATA.
 *
 * Çıkış kodu: HATA varsa 1.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { compareDeviceConfig } from "@gd-monorepo/shared-utils";

const args = process.argv.slice(2);
const rootDir = readDirArg("--root") ?? "configs";
const deployDir = readDirArg("--deploy") ?? "deployment";
const allowPath = "tools/device-config-drift.allow.json";

function readDirArg(flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
}

function loadJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

/** Dizindeki cihaz config'lerini (deviceId'li .json) yükler. */
function loadDeviceConfigs(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".json") || entry.startsWith("service.")) continue;
    const full = join(dir, entry);
    if (!statSync(full).isFile()) continue;
    const cfg = loadJson(full);
    if (cfg && typeof cfg.deviceId === "string") out.push({ path: full, cfg });
  }
  return out;
}

/** deployment altındaki `*device-configs` dizinlerini bulur. */
function findDeployConfigDirs(base) {
  const dirs = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (!statSync(full).isDirectory()) continue;
      if (entry === "device-configs" || entry.endsWith("-device-configs")) {
        dirs.push(full);
      } else {
        walk(full);
      }
    }
  };
  walk(base);
  return dirs;
}

const allowlist = loadJson(allowPath) ?? {};
const rootConfigs = loadDeviceConfigs(rootDir);
const rootByType = new Map();
for (const { cfg } of rootConfigs) {
  const type = cfg.type ?? cfg.deviceId;
  if (!rootByType.has(type)) rootByType.set(type, cfg);
}

const issues = [];
for (const dir of findDeployConfigDirs(deployDir)) {
  for (const { cfg } of loadDeviceConfigs(dir)) {
    const type = cfg.type ?? cfg.deviceId;
    const root = rootByType.get(type);
    if (!root) {
      issues.push(["warn", `${dir}/${cfg.deviceId}`, `kök config yok (type=${type})`]);
      continue;
    }
    for (const issue of compareDeviceConfig(root, cfg, allowlist)) {
      issues.push([
        issue.level,
        `${dir}/${cfg.deviceId}`,
        `${issue.kind}: ${issue.key}`,
      ]);
    }
  }
}

for (const [level, where, msg] of issues) {
  console.log(`${level === "error" ? "HATA " : "UYARI"} ${where} — ${msg}`);
}

const errors = issues.filter(([l]) => l === "error").length;
console.log(
  `\ndevice-config-drift: ${errors} hata, ${issues.length - errors} uyarı — ` +
    `${rootConfigs.length} kök config, ${rootByType.size} tip`,
);
process.exit(errors > 0 ? 1 : 0);
