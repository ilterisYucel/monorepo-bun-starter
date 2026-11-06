// GD-PMS Sim-Lab — giriş noktası.
//   bun run apps/sim-lab/src/main.ts [--site sites/gd1.site.json] [--profile uyumlu|gercek]
//                                     [--speed 1] [--http 8090] [--bind 0.0.0.0] [--export]
//
// Site dosyası sahanın şeklini tanımlar (konteyner sayısı, BSC/HVAC/PCS dağılımı, OG fiderleri,
// port şeması); register listeleri kök configs/ şablonlarından gelir. Her cihaz kendi portunda
// gerçek bir Modbus TCP sunucusu olarak çalışır.

import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import {
  BUILTIN_SCENARIOS,
  FaultManager,
  Plant,
  ScenarioEngine,
  expandSite,
  exportEmsConfigs,
  loadSiteSpec,
  type ProfileName,
} from "@gd-monorepo/simulators/physical";
import { startHttp } from "./http/api";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, "..");
const repoRoot = resolve(appDir, "../..");

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const siteFile = resolve(arg("site") ?? join(appDir, "sites", "gd1.site.json"));
if (!existsSync(siteFile)) {
  console.error(`[sim-lab] site dosyası yok: ${siteFile}`);
  process.exit(1);
}
const { spec, baseDir } = loadSiteSpec(siteFile);
if (arg("profile")) spec.sim.profile = arg("profile") as ProfileName;
if (arg("speed")) spec.sim.speed = Number(arg("speed"));
if (arg("http")) spec.sim.http.port = Number(arg("http"));
if (arg("bind")) spec.network.bindHost = arg("bind")!;
if (arg("ems-host")) spec.network.emsHost = arg("ems-host")!;

const model = expandSite(spec, baseDir);
const plant = new Plant(model);
const faults = new FaultManager(plant);
const scenarios = new ScenarioEngine(plant, faults, join(appDir, "scenarios"), BUILTIN_SCENARIOS);
plant.onStep = () => scenarios.step();

if (process.argv.includes("--export")) {
  const r = exportEmsConfigs(model, repoRoot);
  console.log(`[sim-lab] EMS config'leri: ${r.files.length} dosya → ${r.outDir}`);
}

await plant.start();
startHttp(plant, faults, scenarios, { publicDir: join(appDir, "public"), repoRoot, siteFile });

const all = [...plant.devices.values()];
const bad = all.filter((d) => !d.server.stats.listening);
console.log(`[sim-lab] ${spec.name}: ${all.length - bad.length}/${all.length} Modbus sunucusu açık (${spec.network.bindHost})`);
const byType = new Map<string, number[]>();
for (const d of all) {
  const arr = byType.get(d.type) ?? [];
  arr.push(d.server.stats.port);
  byType.set(d.type, arr);
}
for (const [t, ports] of byType) console.log(`  ${t.padEnd(18)} ${String(ports.length).padStart(3)} adet  port ${Math.min(...ports)}–${Math.max(...ports)}`);
for (const d of bad) console.log(`  ✗ ${d.key} ${d.server.stats.port} — ${d.server.stats.bindError ?? "?"}`);
const compat = [...plant.events.compat.values()];
if (compat.length) {
  console.log(`[sim-lab] Açılışta ${compat.length} uyumluluk uyarısı (arayüz → EMS bağlantısı):`);
  for (const c of compat.slice(0, 20)) console.log(`  ⚠ ${c.device}: ${c.msg}`);
}

const shutdown = async (): Promise<void> => {
  console.log("[sim-lab] kapatılıyor...");
  await plant.stop();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());
