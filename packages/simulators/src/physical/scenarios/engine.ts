// Senaryo motoru — zaman çizelgeli adımlar (simülasyon saniyesi) + kabul kontrolleri.
// Senaryolar JSON'dur; arayüzden düzenlenip apps/sim-lab/scenarios/*.json olarak kaydedilir.
// Hedefler saha anahtarlarıdır: "C1.BSC-1/R3", "C2.HVAC-5", "PCS-7", "SITE"; toplu adımlar seçici alır.

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Plant } from "../site/plant";
import type { SeriesRow } from "../registers/register-series";
import type { FaultManager } from "../faults/catalog";
import type { Realism } from "../core/profile";

export type Step =
  | { at: number; do: "inject"; fault: string; target: string; params?: Record<string, unknown> }
  | { at: number; do: "clear"; fault: string; target?: string }
  | { at: number; do: "clearAll" }
  | { at: number; do: "speed"; value: number }
  | { at: number; do: "realism"; patch: Partial<Realism> }
  | { at: number; do: "write"; device: string; address?: number; point?: string; value: number }
  | { at: number; do: "hold"; device: string; point: string; value: number; durationS?: number }
  | { at: number; do: "release"; device: string; point?: string }
  | { at: number; do: "injectMany"; fault: string; selector: string; params?: Record<string, unknown> }
  | { at: number; do: "series"; name: string; rows: SeriesRow[]; timeBase?: "sim" | "wall"; interp?: "step" | "linear"; loop?: boolean }
  | { at: number; do: "autostart"; powerKw?: number; pcs?: string[] }
  | { at: number; do: "setpoint"; pcs: string; kw: number }
  | { at: number; do: "log"; msg: string }
  | { at: number; do: "expect"; label: string; probe: Probe; within?: number };

export type Probe =
  | { kind: "rackDiag"; target: string; code: string; equals: boolean }
  | { kind: "bscDiag"; target: string; code: string; equals: boolean }
  | { kind: "bscState"; target: string; equals: number }
  | { kind: "bscOnline"; target: string; lt?: number; gt?: number; equals?: number }
  | { kind: "bscLimit"; target: string; dir: "chg" | "dis"; lt?: number; gt?: number }
  | { kind: "pcsOp"; target: string; equals: number }
  | { kind: "pcsFaultBit"; target: string; word: number; bit: number; equals: boolean }
  | { kind: "pcsPower"; target: string; lt?: number; gt?: number }
  | { kind: "rackTemp"; target: string; gt?: number; lt?: number }
  | { kind: "hvacStatus"; target: string; equals: number }
  | { kind: "zoneTemp"; target: string; gt?: number; lt?: number }
  | { kind: "point"; target: string; point: string; gt?: number; lt?: number; equals?: number };

export interface Scenario {
  id: string;
  name: string;
  description: string;
  /** Önerilen simülasyon hızı. */
  speed?: number;
  /** false değilse başlangıçta tesis taban duruma alınır (arızalar temiz, PCS stop, BSC Not Initialized, SOC/sıcaklık başlangıç). */
  baseline?: boolean | { soc?: number; tempC?: number };
  steps: Step[];
}

export interface ExpectResult {
  label: string;
  status: "bekliyor" | "geçti" | "kaldı";
  at?: number;
  detail?: string;
}

export interface RunState {
  scenario: Scenario;
  startedSimT: number;
  startedWall: number;
  next: number;
  expects: (ExpectResult & { step: Step & { do: "expect" }; deadline: number })[];
  done: boolean;
}

function rackOf(p: Plant, target: string) {
  const i = target.lastIndexOf("/");
  return p.bscs.get(target.slice(0, i))?.racks[Number(target.slice(i + 1).replace(/\D/g, "")) - 1];
}

export class ScenarioEngine {
  run: RunState | null = null;
  private readonly pointCache = new Map<string, number>();
  readonly history: { id: string; name: string; at: number; results: ExpectResult[] }[] = [];

  constructor(
    private readonly plant: Plant,
    private readonly faults: FaultManager,
    private readonly dir: string,
    private readonly builtins: Scenario[],
  ) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  list(): (Scenario & { builtin: boolean })[] {
    const user: Scenario[] = [];
    for (const f of readdirSync(this.dir)) {
      if (!f.endsWith(".json")) continue;
      try {
        user.push(JSON.parse(readFileSync(join(this.dir, f), "utf-8")) as Scenario);
      } catch {
        /* bozuk dosya atlanır */
      }
    }
    return [...this.builtins.map((s) => ({ ...s, builtin: true })), ...user.map((s) => ({ ...s, builtin: false }))];
  }

  save(s: Scenario): void {
    const id = s.id.replace(/[^a-zA-Z0-9_-]/g, "_");
    writeFileSync(join(this.dir, `${id}.json`), JSON.stringify({ ...s, id }, null, 2));
  }

  start(id: string): void {
    const sc = this.list().find((s) => s.id === id);
    if (!sc) throw new Error(`Senaryo yok: ${id}`);
    this.stop();
    if (sc.baseline !== false) this.baseline(typeof sc.baseline === "object" ? sc.baseline : {});
    const steps = [...sc.steps].sort((a, b) => a.at - b.at);
    this.run = { scenario: { ...sc, steps }, startedSimT: this.plant.simT, startedWall: Date.now(), next: 0, expects: [], done: false };
    if (sc.speed) this.plant.speed = sc.speed;
    this.plant.events.push("cmd", "SENARYO", `▶ ${sc.name}`);
  }

  /** Tesisi bilinen bir başlangıç durumuna getirir (önceki senaryonun izleri kalmasın). */
  baseline(o: { soc?: number; tempC?: number }): void {
    const p = this.plant;
    this.faults.clearAll();
    p.setProfile(p.realism.profile);
    p.grid.override = {};
    p.weather.offsetC = 0;
    const soc = o.soc ?? p.spec.initial.soc;
    const tempC = o.tempC ?? p.spec.initial.tempC;
    p.series.stop("taban durum");
    for (const d of p.devices.values()) d.overlay.releaseAll();
    for (const pcs of p.pcss.values()) {
      pcs.writeSetting(0x0e19, 0);
      if (pcs.phase === "fault") pcs.cmdReset();
      pcs.cmdStop("senaryo taban durumu");
    }
    for (const b of p.bscs.values()) b.powerCycle(soc, tempC);
    for (const z of p.zones.values()) z.airT = tempC;
    p.events.push("cmd", "SENARYO", `Taban durum: arızalar temizlendi, PCS Stop, BSC Not Initialized, SOC ${soc} %, ${tempC} °C`);
  }

  stop(): void {
    if (this.run && !this.run.done) this.finish("durduruldu");
    this.run = null;
  }

  private finish(why: string): void {
    const r = this.run!;
    r.done = true;
    for (const e of r.expects) if (e.status === "bekliyor") e.status = "kaldı";
    this.history.unshift({ id: r.scenario.id, name: r.scenario.name, at: Date.now(), results: r.expects.map(({ label, status, at, detail }) => ({ label, status, ...(at !== undefined ? { at } : {}), ...(detail ? { detail } : {}) })) });
    if (this.history.length > 30) this.history.length = 30;
    const pass = r.expects.filter((e) => e.status === "geçti").length;
    this.plant.events.push("cmd", "SENARYO", `■ ${r.scenario.name} — ${why}; kontroller ${pass}/${r.expects.length}`);
  }

  elapsed(): number {
    return this.run ? this.plant.simT - this.run.startedSimT : 0;
  }

  step(): void {
    const r = this.run;
    if (!r || r.done) return;
    const t = this.elapsed();
    while (r.next < r.scenario.steps.length && r.scenario.steps[r.next]!.at <= t) {
      const s = r.scenario.steps[r.next++]!;
      try {
        this.exec(s, r);
      } catch (e) {
        this.plant.events.push("warn", "SENARYO", `Adım hatası (${s.do}): ${String((e as Error).message)}`);
      }
    }
    for (const e of r.expects) {
      if (e.status !== "bekliyor") continue;
      const ok = this.check(e.step.probe);
      if (ok.pass) {
        e.status = "geçti";
        e.at = t;
        e.detail = ok.detail;
        this.plant.events.push("info", "SENARYO", `✓ ${e.label} (t=${Math.round(t)} s)`);
      } else if (t > e.deadline) {
        e.status = "kaldı";
        e.at = t;
        e.detail = ok.detail;
        this.plant.events.push("warn", "SENARYO", `✗ ${e.label} — süre doldu (${ok.detail})`);
      }
    }
    if (r.next >= r.scenario.steps.length && r.expects.every((e) => e.status !== "bekliyor")) this.finish("tamamlandı");
  }

  private exec(s: Step, r: RunState): void {
    const p = this.plant;
    switch (s.do) {
      case "inject": this.faults.inject(s.fault, s.target, s.params ?? {}); break;
      case "clear": this.faults.clearMatching(s.fault, s.target); break;
      case "clearAll": this.faults.clearAll(); break;
      case "speed": p.speed = s.value; break;
      case "realism": p.setRealism(s.patch); break;
      case "log": p.events.push("info", "SENARYO", s.msg); break;
      case "write": void p.applyBulk(s.device, s.point ?? `holding:${s.address ?? 0}`, s.value, "write", "senaryo"); break;
      case "hold": void p.applyBulk(s.device, s.point, s.value, "hold", "senaryo", s.durationS); break;
      case "release": void p.applyBulk(s.device, s.point ?? "*", null, "clear", "senaryo"); break;
      case "injectMany": this.faults.injectMany(s.fault, s.selector, s.params ?? {}); break;
      case "series": p.series.start({ id: `sc-${Date.now()}`, name: s.name, rows: s.rows, timeBase: s.timeBase ?? "sim", interp: s.interp ?? "step", loop: s.loop ?? false }, p.simT); break;
      case "setpoint": p.pcss.get(s.pcs)?.writeSetting(0x0e19, (Math.round(s.kw) + 0x10000) & 0xffff); break;
      case "autostart": autostart(p, s.powerKw ?? 0, s.pcs); break;
      case "expect": r.expects.push({ label: s.label, status: "bekliyor", step: s, deadline: s.at + (s.within ?? 600) }); break;
    }
  }

  check(pr: Probe): { pass: boolean; detail: string } {
    const p = this.plant;
    const cmp = (v: number, o: { lt?: number; gt?: number; equals?: number }): boolean =>
      (o.lt === undefined || v < o.lt) && (o.gt === undefined || v > o.gt) && (o.equals === undefined || v === o.equals);
    switch (pr.kind) {
      case "rackDiag": {
        const rack = rackOf(p, pr.target);
        const v = rack?.diag.isActive(pr.code) ?? false;
        return { pass: v === pr.equals, detail: `${pr.code}=${v}` };
      }
      case "bscDiag": {
        const v = p.bscs.get(pr.target)?.diag.isActive(pr.code) ?? false;
        return { pass: v === pr.equals, detail: `${pr.code}=${v}` };
      }
      case "bscState": {
        const v = p.bscs.get(pr.target)?.state ?? -1;
        return { pass: v === pr.equals, detail: `state=${v}` };
      }
      case "bscOnline": {
        const v = p.bscs.get(pr.target)?.online.length ?? -1;
        return { pass: cmp(v, pr), detail: `online=${v}` };
      }
      case "bscLimit": {
        const l = p.bscs.get(pr.target)?.limits;
        const v = pr.dir === "chg" ? l?.chargeKw ?? 0 : l?.dischargeKw ?? 0;
        return { pass: cmp(v, pr), detail: `${pr.dir}=${v.toFixed(0)} kW` };
      }
      case "pcsOp": {
        const v = p.pcss.get(pr.target)?.opStatus ?? -1;
        return { pass: v === pr.equals, detail: `op=${v}` };
      }
      case "pcsFaultBit": {
        const w = p.pcss.get(pr.target)?.faults[pr.word - 1] ?? 0;
        const v = ((w >> pr.bit) & 1) === 1;
        return { pass: v === pr.equals, detail: `W${pr.word}.b${pr.bit}=${v}` };
      }
      case "pcsPower": {
        const v = p.pcss.get(pr.target)?.pAc ?? 0;
        return { pass: cmp(v, pr), detail: `P=${v.toFixed(0)} kW` };
      }
      case "rackTemp": {
        const rack = rackOf(p, pr.target);
        const v = rack?.stats().tMax ?? 0;
        return { pass: cmp(v, pr), detail: `Tmax=${v.toFixed(1)} °C` };
      }
      case "zoneTemp": {
        const v = p.zones.get(pr.target)?.airT ?? 0;
        return { pass: cmp(v, pr), detail: `zon=${v.toFixed(1)} °C` };
      }
      case "point": {
        const k = `${pr.target}|${pr.point}`;
        void p.readPoint(pr.target, pr.point).then((r) => this.pointCache.set(k, r.value)).catch(() => this.pointCache.delete(k));
        const v = this.pointCache.get(k);
        if (v === undefined) return { pass: false, detail: "okunuyor…" };
        return { pass: cmp(v, pr), detail: `${pr.point}=${Number.isInteger(v) ? v : v.toFixed(2)}` };
      }
      case "hvacStatus": {
        const v = p.hvacs.get(pr.target)?.status ?? -1;
        return { pass: v === pr.equals, detail: `status=${v}` };
      }
    }
  }
}

/**
 * EMS yokken sistemi devreye alan operatör makrosu — EMS'in yapacağı yazımların aynısı:
 * BSC Start → (Normal) Close Contactors; HVAC aç + mod 4; PCS komut kaynağı EMS → Start → setpoint.
 */
export function autostart(p: Plant, powerKw: number, pcsIds?: string[]): void {
  p.events.push("cmd", "SENARYO", `Otomatik devreye alma (P=${powerKw} kW) — EMS yardımcısı açıldı`);
  p.assist.heartbeat = true;
  p.assist.hvacServerTemps = true;
  for (const h of p.hvacs.values()) {
    h.write(0x202, 1);
    h.hold.set(0x09, 4);
  }
  const startBsc = (b: import("../models/bsc").Bsc): void => {
    if (b.state === 1) b.writeHolding(40010, 2);
  };
  for (const b of p.bscs.values()) startBsc(b);
  // Close: Normal'e geçince
  let tries = 0;
  const iv = setInterval(() => {
    tries++;
    let pending = false;
    for (const s of p.strings) {
      const b = s.bsc;
      if (b.state === 3 && b.online.length === 0 && !b.racks.some((r) => r.closing)) b.writeHolding(40010, 5);
      if (b.state !== 3 || b.online.length === 0) pending = true;
      const pcs = s.pcs;
      if (pcs && (!pcsIds || pcsIds.includes(pcs.cfg.id) || (s.pcsKey !== undefined && pcsIds.includes(s.pcsKey))) && b.online.length > 0) {
        if (pcs.settings.get(0x0e00) !== 1) pcs.writeSetting(0x0e00, 1);
        if (pcs.phase === "fault") pcs.cmdReset();
        if (pcs.phase === "stop" || pcs.phase === "selfcheck") pcs.writeSetting(0x0e14, 1);
        if (pcs.phase === "run" || pcs.phase === "standby") {
          pcs.writeSetting(0x0e19, (Math.round(powerKw) + 0x10000) & 0xffff);
          if (pcs.phase === "standby") pcs.writeSetting(0x0e14, 1);
        } else pending = true;
      }
    }
    // EMS yerine sunucu sıcaklıklarını klimaya yaz (BSC maks/min)
    if (!pending || tries > 120) clearInterval(iv);
  }, 500);
}
