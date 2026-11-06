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

export interface MappingEntry {
  kind: "register" | "bit" | "constant";
  from?: { deviceId: string; table: "input" | "holding"; address: number; size?: number; signed?: boolean; bit?: number };
  to: number;
  ratio?: number;
  offset?: number;
  bit?: number;
  value?: number;
}
export interface MappingFile {
  target: { host: string; port: number };
  intervalMs: number;
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

  /** Repo mapping dosyasını birebir uygula (BSC register yüzünden okuyarak). */
  private fromMapping(m: MappingFile): number[] | null {
    const out = [...this.last];
    let ok = 0;
    for (const e of m.mappings) {
      const idx = e.to - BMS_BASE;
      if (idx < 0 || idx >= 23) continue;
      try {
        if (e.kind === "constant") {
          out[idx] = (e.value ?? 0) & 0xffff;
          ok++;
          continue;
        }
        const f = e.from!;
        const words = this.bscFace.readWords(f.table === "holding" ? "holding" : "input", f.address, f.size ?? 1) as number[];
        let raw = 0;
        if ((f.size ?? 1) === 2) {
          raw = ((words[0]! << 16) >>> 0) + words[1]!;
          if (f.signed && raw >= 0x80000000) raw -= 0x100000000;
        } else {
          raw = words[0]!;
          if (f.signed && raw >= 0x8000) raw -= 0x10000;
        }
        if (e.kind === "bit") {
          const on = ((raw >> (f.bit ?? 0)) & 1) === 1;
          const tb = e.bit ?? 0;
          out[idx] = on ? out[idx]! | (1 << tb) : out[idx]! & ~(1 << tb);
        } else {
          out[idx] = Math.round(raw * (e.ratio ?? 1) + (e.offset ?? 0)) & 0xffff;
        }
        ok++;
      } catch {
        this.stats.failCount++;
      }
    }
    if (ok === 0) return null;
    this.stats.source = ok === m.mappings.length ? 0 : 1;
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
  }
  for (const to of [0x312, 0x313]) {
    const e = at(to);
    if (e?.kind === "constant") w(`map${to}`, `Mapping 0x${to.toString(16)} (kullanılabilir enerji) sabit ${e.value}`, "Kullanılabilir enerji SOC ile değişmeli");
  }
}
