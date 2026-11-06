// EMS probu — device-service'in okuma sınıfıyla (packages/core ModbusDevice) çalışan bir
// Sim-Lab'a bağlanır ve her cihazın config'teki TÜM telemetrisini gerçek Modbus TCP ile okur.
// --commands verilirse config `commands` bölümünü EMS'in yaptığı gibi yazar ve `validate`
// koşulunu zaman aşımı içinde bekler (BSC start/close, PCS start/discharge …).
//
//   bun run apps/sim-lab/src/tools/ems-probe.ts [--site sites/gd1.site.json] [--host 127.0.0.1]
//        [--only "C1.*,PCS-1,PCS-2"] [--commands] [--json rapor.json]
//
// Çıkış kodu: okunamayan cihaz veya başarısız komut varsa 1.

import { writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ModbusDevice } from "@gd-monorepo/core";
import type { ModbusTelemetryData, TelemetryData } from "@gd-monorepo/shared-types";
import { expandSite, loadSiteSpec, type SiteDevice } from "@gd-monorepo/simulators/physical";

const here = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(here, "../..");
const arg = (n: string): string | undefined => {
  const i = process.argv.indexOf(`--${n}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const host = arg("host") ?? "127.0.0.1";
const { spec, baseDir } = loadSiteSpec(resolve(arg("site") ?? join(appDir, "sites", "gd1.site.json")));
const model = expandSite(spec, baseDir);
const only = arg("only");
const globs = only ? only.split(",").map((g) => new RegExp(`^${g.trim().replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`)) : null;
const pick = (d: SiteDevice) => !globs || globs.some((re) => re.test(d.key));

export function emsDevice(d: SiteDevice, portOverride?: number, telemetry = d.config.telemetry): ModbusDevice {
  const telemetryList = telemetry.map((t) => ({ ...t, value: 0, timestamp: new Date().toISOString(), deviceId: d.deviceId }) as unknown as ModbusTelemetryData);
  return new ModbusDevice({
    id: d.key,
    name: d.name,
    manufacturer: "probe",
    model: d.config.model ?? "probe",
    connection: { ...d.config.connection, host, port: portOverride ?? d.port, timeout: 3000 } as never,
    telemetryList,
    ...(d.config.bitfieldConfigs ? { bitfieldConfigs: d.config.bitfieldConfigs as never } : {}),
  } as never);
}

interface ProbeRow {
  key: string;
  type: string;
  port: number;
  ok: boolean;
  ms: number;
  points: number;
  read: number;
  dropped: string[];
  error?: string;
}

async function probe(d: SiteDevice): Promise<ProbeRow> {
  const t0 = performance.now();
  const dev = emsDevice(d);
  try {
    await dev.connect();
    const rows = await dev.read();
    const got = new Set(rows.map((r) => r.name));
    const dropped = d.config.telemetry.map((t) => t.name).filter((n) => !got.has(n));
    return { key: d.key, type: d.type, port: d.port, ok: true, ms: Math.round(performance.now() - t0), points: d.config.telemetry.length, read: rows.length, dropped };
  } catch (e) {
    return { key: d.key, type: d.type, port: d.port, ok: false, ms: Math.round(performance.now() - t0), points: d.config.telemetry.length, read: 0, dropped: [], error: String((e as Error).message ?? e) };
  } finally {
    await dev.disconnect().catch(() => undefined);
  }
}

// ───────────────────────── komut yürütücü (EMS CommandJob benzeri) ─────────────────────────

interface CommandSpec {
  telemetries: { name: string; value: number | string }[];
  timeoutMs?: number;
  validate?: { reads: { name: string; expect: number | string; accept?: number[] }[]; minWaitMs?: number };
  finalize?: { telemetry: string; value: number };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function matches(v: number, e: number | string, accept?: number[]): boolean {
  if (accept?.includes(v)) return true;
  if (e === "nonzero") return v !== 0;
  if (e === "negative") return v < 0;
  if (e === "positive") return v > 0;
  if (e === "zero") return v === 0;
  return v === Number(e);
}

async function runCommand(d: SiteDevice, name: string, params: Record<string, number> = {}): Promise<{ ok: boolean; ms: number; detail: string }> {
  const cmd = (d.config.commands as Record<string, CommandSpec> | undefined)?.[name];
  if (!cmd) return { ok: false, ms: 0, detail: `komut yok: ${name}` };
  const dev = emsDevice(d);
  const t0 = Date.now();
  try {
    await dev.connect();
    const byName = new Map(d.config.telemetry.map((t) => [t.name, t]));
    const writes = cmd.telemetries.map((w) => {
      const t = byName.get(w.name);
      if (!t) throw new Error(`telemetri yok: ${w.name}`);
      const v = typeof w.value === "string" ? Number(w.value.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(params[k] ?? 0))) : w.value;
      return { ...t, value: v, timestamp: new Date().toISOString(), deviceId: d.deviceId } as unknown as TelemetryData;
    });
    await dev.write(writes);
    const reads = cmd.validate?.reads ?? [];
    const deadline = t0 + (cmd.timeoutMs ?? 3000);
    await sleep(cmd.validate?.minWaitMs ?? 0);
    let last = "";
    let done = reads.length === 0;
    while (!done && Date.now() < deadline) {
      const rows = await dev.read(reads.map((r) => ({ ...byName.get(r.name)!, value: 0, timestamp: "", deviceId: d.deviceId }) as unknown as TelemetryData));
      done = reads.every((r) => {
        const row = rows.find((x) => x.name === r.name);
        last = `${r.name}=${row?.value ?? "?"}`;
        return row !== undefined && matches(Number(row.value), r.expect, r.accept);
      });
      if (!done) await sleep(200);
    }
    if (cmd.finalize) {
      const t = byName.get(cmd.finalize.telemetry);
      if (t) await dev.write([{ ...t, value: cmd.finalize.value, timestamp: new Date().toISOString(), deviceId: d.deviceId } as unknown as TelemetryData]);
    }
    return { ok: done, ms: Date.now() - t0, detail: done ? last : `zaman aşımı (${cmd.timeoutMs ?? 3000} ms) — son: ${last}` };
  } catch (e) {
    return { ok: false, ms: Date.now() - t0, detail: String((e as Error).message ?? e) };
  } finally {
    await dev.disconnect().catch(() => undefined);
  }
}

async function main(): Promise<void> {
  const devs = model.devices.filter(pick);
  console.log(`[ems-probe] ${spec.name}: ${devs.length} cihaz okunuyor (host ${host})…`);
  const rows: ProbeRow[] = [];
  // aynı anda en fazla 16 bağlantı
  for (let i = 0; i < devs.length; i += 16) rows.push(...(await Promise.all(devs.slice(i, i + 16).map(probe))));
  const bad = rows.filter((r) => !r.ok);
  const byType = new Map<string, ProbeRow[]>();
  for (const r of rows) byType.set(r.type, [...(byType.get(r.type) ?? []), r]);
  for (const [t, rs] of byType) {
    const okN = rs.filter((r) => r.ok).length;
    const avg = Math.round(rs.reduce((s, r) => s + r.ms, 0) / rs.length);
    const drops = [...new Set(rs.flatMap((r) => r.dropped))];
    console.log(`  ${okN === rs.length ? "✓" : "✗"} ${t.padEnd(18)} ${okN}/${rs.length} cihaz · ${rs[0]!.points} nokta · ort. ${avg} ms${drops.length ? ` · sentinel (veri yok): ${drops.slice(0, 6).join(", ")}${drops.length > 6 ? "…" : ""}` : ""}`);
  }
  for (const r of bad) console.log(`    ✗ ${r.key} :${r.port} — ${r.error}`);

  const cmdResults: { device: string; command: string; ok: boolean; ms: number; detail: string }[] = [];
  if (process.argv.includes("--commands")) {
    const bsc = model.devices.find((d) => d.type === "bsc" && pick(d));
    const pcs = bsc?.pair ? model.devices.find((d) => d.key === bsc.pair) : undefined;
    if (bsc) {
      console.log(`[ems-probe] Komut zinciri (EMS config 'commands'): ${bsc.key} → ${pcs?.key ?? "PCS yok"}`);
      const step = async (d: SiteDevice, c: string, p?: Record<string, number>) => {
        const r = await runCommand(d, c, p);
        cmdResults.push({ device: d.key, command: c, ...r });
        console.log(`  ${r.ok ? "✓" : "✗"} ${d.key.padEnd(10)} ${c.padEnd(20)} ${String(r.ms).padStart(6)} ms  ${r.detail}`);
        return r.ok;
      };
      await step(bsc, "start");
      // Normal'i bekle (EMS FL-01 akışı gibi 30036 izlenir)
      const st = model.devices.find((d) => d.key === bsc.key)!;
      const stateDev = emsDevice(st, undefined, st.config.telemetry.filter((t) => t.name === "BSC State"));
      await stateDev.connect();
      for (let i = 0; i < 60; i++) {
        const r = await stateDev.read();
        if (Number(r.find((x) => x.name === "BSC State")?.value) === 3) break;
        await sleep(1000);
      }
      await stateDev.disconnect();
      await step(bsc, "close_contactors");
      if (pcs) {
        await step(pcs, "set_command_source");
        await step(pcs, "start");
        await step(pcs, "discharge", { powerKw: 500 });
        await step(pcs, "set_power_zero");
        await step(pcs, "stop");
      }
      await sleep(1500);
      await step(bsc, "open_contactors");
      await sleep(2000);
      await step(bsc, "stop");
    }
  }
  const out = arg("json");
  if (out) writeFileSync(out, JSON.stringify({ site: spec.name, host, at: new Date().toISOString(), devices: rows, commands: cmdResults }, null, 2));
  const fail = bad.length + cmdResults.filter((c) => !c.ok).length;
  console.log(`[ems-probe] ${rows.length - bad.length}/${rows.length} cihaz okundu${cmdResults.length ? `, ${cmdResults.filter((c) => c.ok).length}/${cmdResults.length} komut başarılı` : ""}.`);
  process.exit(fail ? 1 : 0);
}

if (import.meta.main) void main();
