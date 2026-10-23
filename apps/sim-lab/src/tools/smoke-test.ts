// Uçtan uca duman testi: GD-1 sahasını (veya --site) ayrı portlarda ayağa kaldırır, EMS probu
// ile TÜM cihazları packages/core ModbusDevice üzerinden okur ve bir BSC+PCS dizisinde EMS
// komut zincirini (start → close → PCS start → deşarj → stop) config `commands` ile koşar.
//   bun run apps/sim-lab/src/tools/smoke-test.ts [--site sites/gd1.site.json] [--profile gercek]

import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, "../..");
const i = process.argv.indexOf("--site");
const src = resolve(i >= 0 ? process.argv[i + 1]! : join(appDir, "sites", "gd1.site.json"));
const site = JSON.parse(readFileSync(src, "utf-8")) as Record<string, any>;
site.templatesDir = resolve(dirname(src), site.templatesDir ?? "../../../configs");
site.network = { ...(site.network ?? {}), bindHost: "127.0.0.1", emsHost: "127.0.0.1", containerPortBase: 25000, containerPortStride: 100, fieldPortBase: 31500 };
const pi = process.argv.indexOf("--profile");
site.sim = { ...(site.sim ?? {}), http: { host: "127.0.0.1", port: 18090 }, ...(pi >= 0 ? { profile: process.argv[pi + 1] } : {}) };
const dir = mkdtempSync(join(tmpdir(), "simlab-smoke-"));
const tmpSite = join(dir, "smoke.site.json");
writeFileSync(tmpSite, JSON.stringify(site, null, 2));

const sim = spawn("bun", ["run", join(appDir, "src/main.ts"), "--site", tmpSite], { stdio: ["ignore", "pipe", "pipe"] });
let out = "";
sim.stdout.on("data", (d) => (out += String(d)));
sim.stderr.on("data", (d) => (out += String(d)));

const waitFor = async (re: RegExp, ms: number): Promise<boolean> => {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (re.test(out)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
};

const ok = await waitFor(/Arayüz: http/, 60000);
if (!ok) {
  console.error("[smoke] Sim-Lab başlamadı:\n" + out);
  sim.kill();
  process.exit(1);
}
console.log(out.split("\n").filter((l) => /Modbus sunucusu|adet|✗/.test(l)).join("\n"));

const probe = spawn("bun", ["run", join(here, "ems-probe.ts"), "--site", tmpSite, "--commands", "--json", join(dir, "probe.json")], { stdio: "inherit" });
const code: number = await new Promise((r) => probe.on("exit", (c) => r(c ?? 1)));

// HTTP API kontrolü
const st = (await (await fetch("http://127.0.0.1:18090/api/state")).json()) as { totals: { racks: number }; ems: { requests: number } };
console.log(`[smoke] API: ${st.totals.racks} raf, EMS istekleri ${st.ems.requests}`);
const bulk = (await (await fetch("http://127.0.0.1:18090/api/point", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ selector: "C*.HVAC-*", point: "Current Temp", value: 33.3, mode: "hold", durationS: 30 }) })).json()) as { ok: boolean }[];
console.log(`[smoke] Toplu üstyazım: ${bulk.filter((b) => b.ok).length}/${bulk.length} klima`);

sim.kill("SIGTERM");
console.log(`[smoke] ${code === 0 && bulk.every((b) => b.ok) ? "BAŞARILI" : "BAŞARISIZ"} (rapor: ${join(dir, "probe.json")})`);
process.exit(code === 0 && bulk.every((b) => b.ok) ? 0 : 1);
