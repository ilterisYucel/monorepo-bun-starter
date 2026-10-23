// BSC → PCS BMS bağlantısı (Wattox BMS bloğu 0x0300–0x0316).
// İki mod:
//  • internal — Wattox B01..B23 tanımlarına göre doğru eşleme (BSC Rev AF anlamlarıyla).
//  • mapping  — repo'daki bsc-*-pcs-mapping.json birebir uygulanır (bugünkü konnektör davranışı).
// Her iki modda da konnektör izleme register'ları (link/sayaçlar) üretilir.

import type { EventLog } from "../core/events";
import type { Realism } from "../core/profile";
import type { Bsc } from "../models/bsc";
import { BSC_STATE } from "../models/bsc";
import { BMS_BASE, type WattoxPcs } from "../models/pcs-wattox";
import type { DeviceFace } from "../modbus/lab-server";
import type { ConnectorStats } from "../faces/misc-faces";
import { RACK_ENERGY_KWH } from "../models/battery/cell";
import { s16 } from "../core/util";

export interface SourceRef {
  deviceId: string;
  table: "input" | "holding";
  address: number;
  size?: number;
  signed?: boolean;
  bit?: number;
  fallbackAddress?: number;
}
export interface MappingEntry {
  kind: "register" | "bit" | "constant" | "computed" | "socEnergy";
  from?: SourceRef;
  to: number;
  ratio?: number;
  offset?: number;
  bit?: number;
  value?: number;
  /** computed: to = (num×numScale)/(den×denScale) × ratio + offset */
  numerator?: { from: SourceRef; scale: number };
  denominator?: { from: SourceRef; scale: number };
  /** socEnergy: to = SOC×ratedKwh (şarj modunda (1−SOC)×ratedKwh) × ratio + offset */
  soc?: { from: SourceRef; scale: number };
  ratedKwh?: number;
  mode?: "charge" | "discharge";
}
export interface MappingFile {
  target: { host: string; port: number };
  intervalMs: number;
  lossBit?: { to: number; bit: number };
  mappings: MappingEntry[];
}

export class BmsLink {
  readonly stats: ConnectorStats = { link: 0, source: 2, lastWriteAt: 0, writeCount: 0, failCount: 0 };
  private acc = 0;
  /** Konsol: bağlantı kesik (konnektör/kablo arızası). */
  broken = false;
  /** Son yazılan blok (UI karşılaştırması için). */
  readonly last = new Array<number>(23).fill(0);

  constructor(
    readonly id: string,
    private readonly bsc: Bsc,
    private readonly bscFace: DeviceFace,
    private readonly pcs: WattoxPcs,
    private readonly mapping: MappingFile | null,
    private readonly realism: () => Realism,
    private readonly events: EventLog,
  ) {}

  /** Simülasyon saatinde çalışır (hızlandırmada da PCS limitleri güncel kalır). */
  step(dtSim: number): void {
    const mode = this.realism().bmsLink;
    const interval = mode === "mapping" && this.mapping ? this.mapping.intervalMs / 1000 : 1;
    this.acc += dtSim;
    if (this.acc < interval) return;
    this.acc = 0;
    if (this.broken) {
      this.stats.link = 0;
      this.stats.failCount++;
      return;
    }
    const block = mode === "mapping" && this.mapping ? this.fromMapping(this.mapping) : this.internal();
    if (!block) {
      this.stats.source = 2;
      this.stats.failCount++;
      return;
    }
    block.forEach((v, i) => {
      this.pcs.writeBms(BMS_BASE + i, v);
      this.last[i] = v;
    });
    this.stats.link = 1;
    this.stats.source = 0;
    this.stats.lastWriteAt = Math.floor(Date.now() / 1000);
    this.stats.writeCount++;
  }

  /** Wattox B01–B23 doğru eşleme. */
  private internal(): number[] {
    const b = this.bsc;
    const on = b.online;
    const L = b.limits;
    const v = b.online.length ? b.dcVoltage() : b.anticipatedVoltage();
    const info = b.infoBits();
    let st = 0;
    if (!b.commUp) st |= 1; // BMS no communication (BSC raflara bağlı değil)
    if (info.fault || b.state === BSC_STATE.EMERGENCY) st |= 1 << 1;
    if (L.chargeKw < 0.5) st |= 1 << 4;
    if (L.dischargeKw < 0.5) st |= 1 << 5;
    if (b.state === BSC_STATE.INITIALIZING) st |= 1 << 6;
    if (info.alarm || info.warning) st |= 1 << 7;
    if (on.length === 0 || b.state === BSC_STATE.EMERGENCY) st |= 1 << 8;
    const stats = on.map((r) => r.stats());
    const mx = (f: (s: (typeof stats)[number]) => number) => (stats.length ? Math.max(...stats.map(f)) : 0);
    const mn = (f: (s: (typeof stats)[number]) => number) => (stats.length ? Math.min(...stats.map(f)) : 0);
    const eFull = on.length * RACK_ENERGY_KWH;
    const eNow = on.reduce((s, r) => s + r.energyKwh(), 0);
    const vv = Math.max(1, v);
    return [
      b.state,
      st,
      Math.round(v * 10),
      s16(b.sectionCurrent * 10),
      Math.round(b.soc() * 10),
      Math.round(b.soh() * 10),
      Math.round(((L.chargeKw * 1000) / vv) * 10),
      Math.round(((L.dischargeKw * 1000) / vv) * 10),
      Math.round(L.chargeKw * 10),
      Math.round(L.dischargeKw * 10),
      Math.round(mx((s) => s.socMax) * 10),
      Math.round(mn((s) => s.socMin) * 10),
      s16(mx((s) => s.tMax) * 10),
      s16(mn((s) => s.tMin) * 10),
      Math.round(mx((s) => s.vMax) * 1000),
      Math.round(mn((s) => s.vMin) * 1000),
      14688,
      11016,
      Math.min(65535, Math.round(Math.max(0, eFull - eNow) * 10)),
      Math.min(65535, Math.round(eNow * 10)),
      Math.round(b.racks.length * RACK_ENERGY_KWH),
      s16(Math.min(L.chargeKw, L.dischargeKw) * 10),
      on.length > 0 ? 1 : 0,
    ].map((x) => x & 0xffff);
  }

  /** Kaynak register'ı (BSC yüzünden, model değeri — konnektör gerçek BSC'yi okur gibi). */
  private readSource(f: SourceRef, useFallback = true): number {
    const read = (addr: number): number => {
      const words = this.bscFace.readWords(f.table === "holding" ? "holding" : "input", addr, f.size ?? 1) as number[];
      let raw: number;
      if ((f.size ?? 1) === 2) {
        raw = ((words[0]! << 16) >>> 0) + words[1]!;
        if (f.signed && raw >= 0x80000000) raw -= 0x100000000;
      } else {
        raw = words[0]!;
        if (f.signed && raw >= 0x8000) raw -= 0x10000;
      }
      return raw;
    };
    const v = read(f.address);
    if (v === 0 && useFallback && f.fallbackAddress !== undefined) return read(f.fallbackAddress);
    return v;
  }

  /** Repo mapping dosyasını birebir uygula (packages/simulators BscPcsConnectorAdapter ile aynı anlam). */
  private fromMapping(m: MappingFile): number[] | null {
    const out = [...this.last];
    let ok = 0;
    for (const e of m.mappings) {
      const idx = e.to - BMS_BASE;
      if (idx < 0 || idx >= 23) continue;
      try {
        const fin = (x: number) => (Math.round(x * (e.ratio ?? 1) + (e.offset ?? 0)) + 0x10000) & 0xffff;
        switch (e.kind) {
          case "constant":
            out[idx] = (e.value ?? 0) & 0xffff;
            break;
          case "bit": {
            const raw = this.readSource(e.from!, false);
            const on = ((raw >> (e.from!.bit ?? 0)) & 1) === 1;
            const tb = e.bit ?? 0;
            out[idx] = (on ? out[idx]! | (1 << tb) : out[idx]! & ~(1 << tb)) & 0xffff;
            break;
          }
          case "computed": {
            const num = this.readSource(e.numerator!.from) * e.numerator!.scale;
            const den = this.readSource(e.denominator!.from) * e.denominator!.scale;
            out[idx] = den === 0 ? 0 : fin(num / den);
            break;
          }
          case "socEnergy": {
            const soc = Math.max(0, Math.min(1, this.readSource(e.soc!.from) * e.soc!.scale));
            const kwh = (e.mode === "charge" ? 1 - soc : soc) * (e.ratedKwh ?? 0);
            out[idx] = fin(kwh);
            break;
          }
          default:
            out[idx] = fin(this.readSource(e.from!));
        }
        ok++;
      } catch {
        this.stats.failCount++;
      }
    }
    const status = ok === 0 ? 2 : ok === m.mappings.length ? 0 : 1;
    if (m.lossBit) {
      const i = m.lossBit.to - BMS_BASE;
      if (i >= 0 && i < 23) out[i] = status === 2 ? out[i]! | (1 << m.lossBit.bit) : out[i]! & ~(1 << m.lossBit.bit);
    }
    if (ok === 0) return null;
    this.stats.source = status;
    return out;
  }
}

/** Repo mapping dosyasındaki bilinen anlam hatalarını tespit eder (açılışta uyarı). */
export function auditMapping(m: MappingFile, deviceId: string, events: EventLog): void {
  const at = (to: number) => m.mappings.find((e) => e.to === to);
  const w = (key: string, msg: string, real: string) => events.compatWarn(deviceId, key, msg, real);
  for (const to of [0x308, 0x309, 0x315]) {
    const e = at(to);
    if (e?.from && [30063, 30065].includes(e.from.address) && (e.from.size ?? 1) === 1) {
      w(`map${to}`, `Mapping 0x${to.toString(16)} ← ${e.from.address} tek kelime okuyor`, `${e.from.address} uint32 (yüksek+düşük kelime); yalnız yüksek kelime ≈ 0 → PCS BMS güç limiti ~0 kW görür`);
    }
  }
  for (const to of [0x306, 0x307]) {
    const e = at(to);
    if (e?.from?.address === 30128) w(`map${to}`, `Mapping 0x${to.toString(16)} (maks. ${to === 0x306 ? "şarj" : "deşarj"} akımı limiti) ← 30128 (ölçülen maks. raf akımı)`, "BMS akım limiti değil ölçüm aktarılıyor; limit = güç limiti / gerilim olmalı");
  }
  for (const to of [0x310, 0x311]) {
    const e = at(to);
    if (e?.from && [30124, 30125].includes(e.from.address)) w(`map${to}`, `Mapping 0x${to.toString(16)} (paket gerilim limiti) ← ${e.from.address} (raf ID)`, "Raf numarası ×10 gerilim limiti olarak yazılıyor (ör. 10 → 1.0 V)");
    if (e?.from && [30118, 30122].includes(e.from.address)) w(`map${to}`, `Mapping 0x${to.toString(16)} (B17/B18 gerilim LİMİTİ) ← ${e.from.address} (ölçülen maks./min. raf gerilimi)`, "Limit yerine ölçüm aktarılıyor; JF1 penceresi 408×3.6 V = 1468.8 V / 408×2.7 V = 1101.6 V (Cycle Test v1.0) sabit olmalı");
  }
  for (const to of [0x312, 0x313]) {
    const e = at(to);
    if (e?.kind === "constant") w(`map${to}`, `Mapping 0x${to.toString(16)} (kullanılabilir enerji) sabit ${e.value}`, "Kullanılabilir enerji SOC ile değişmeli");
  }
}
