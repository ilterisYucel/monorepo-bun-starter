// JF1 B-LINK raf modeli — 17 paket × 24S (3P) = 408 seri eleman + BPU (MC+/MC-/PC, sigorta, fan) + RBMS.
// Hücre bazında SOC/kapasite/direnç dağılımı, paket bazında termal model, RBMS durum
// makinesi ve LGES teşhis eşikleri (raf kapsamı).

import { clamp, gauss, lag, makeRng } from "../../core/util";
import {
  CELLS_PER_PACK,
  GROUP_R1,
  PACKS_PER_RACK,
  PACK_FAN_HEAT_W,
  PACK_HEAT_CAP,
  PACK_RTH_FAN,
  PACK_RTH_NOFAN,
  PACK_R_HEAT,
  RACK_CAPACITY_AH,
  RACK_POWER_1CP_KW,
  RC_TAU_S,
  SERIES_PER_RACK,
  TEMP_SENSORS_PER_PACK,
  cellOcv,
  groupR0,
} from "./cell";
import { DiagEngine, gbit, type DiagDef } from "./diagnostics";

/** Rev AF raf durum enum'u (summary +0). */
export const RACK_STATE = {
  INITIALIZATION: 0x00,
  ID_SET: 0x01,
  ID_SET_COMPLETE: 0x02,
  BMIC_INIT: 0x03,
  INITIAL_DIAG: 0x08,
  NORMAL: 0x09,
  NPS: 0x0a,
  PPS: 0x0b,
  MANUAL: 0x0c,
  EMERGENCY: 0x0d,
} as const;

/** Arıza konsolundan enjekte edilebilen raf koşulları. */
export interface RackInjection {
  rbmsCommLoss: boolean; // BSC↔RBMS haberleşme kaybı (RBSCLOC / BSCRLOC)
  packCommLoss: boolean; // RBMS↔PBMS (RPLOC)
  pbmsFault: boolean;
  tempSensorFault: { pack: number; value: number } | null; // sensör açık devre (ör. 127 °C / -40 °C)
  currentSensorFault: boolean; // CS1/CS2 farkı → CSE
  contactorOpenFailure: boolean; // MC kaynaklı — aç komutunda akım kesilmiyor (MCOF)
  contactorFeedbackFail: boolean; // MC geri bildirim uyumsuzluğu (MCFF)
  packFanFail: boolean;
  fuseBlown: boolean; // BPU sigortası açık → akım yok, gerilim farkı (RCF)
  heat: { pack: number; watts: number } | null; // iç ısınma (sıcak nokta)
  cellSelfDischarge: { cell: number; mA: number } | null; // iç kısa / yüksek self-deşarj
  cellHighR: { cell: number; factor: number } | null;
  powerRegulatorFault: boolean;
}

const NO_INJECTION = (): RackInjection => ({
  rbmsCommLoss: false,
  packCommLoss: false,
  pbmsFault: false,
  tempSensorFault: null,
  currentSensorFault: false,
  contactorOpenFailure: false,
  contactorFeedbackFail: false,
  packFanFail: false,
  fuseBlown: false,
  heat: null,
  cellSelfDischarge: null,
  cellHighR: null,
  powerRegulatorFault: false,
});

/** Rafın teşhis bağlamı (eşik fonksiyonları için). */
export interface RackCtx {
  r: Rack;
}

export interface RackLimits {
  chargeKw: number;
  dischargeKw: number;
  spc: boolean;
  vpc: boolean;
  preVpc: boolean;
  tpc: boolean;
}

export interface RackStats {
    vMax: number; vMin: number; vAvg: number; vMaxLoc: number; vMinLoc: number;
    tMax: number; tMin: number; tAvg: number; tMaxLoc: number; tMinLoc: number;
    tDiffRack: number; tDiffPack: number; socMin: number; socMax: number; socAvg: number;
    packAvgVMax: number; packAvgVMin: number;
  }

export class Rack {
  // — hücreler —
  readonly cap = new Float64Array(SERIES_PER_RACK); // Ah
  readonly soc = new Float64Array(SERIES_PER_RACK); // %
  /** Açılıştaki hücre SOC sapmaları (senaryo taban durumu için). */
  private readonly socDev0 = new Float64Array(SERIES_PER_RACK);
  readonly rFactor = new Float64Array(SERIES_PER_RACK);
  readonly vCell = new Float64Array(SERIES_PER_RACK); // terminal gerilimi
  readonly balancing = new Uint8Array(SERIES_PER_RACK);
  // — paketler —
  readonly packT = new Float64Array(PACKS_PER_RACK); // çekirdek sıcaklığı
  readonly sensorOffset = new Float64Array(PACKS_PER_RACK * TEMP_SENSORS_PER_PACK);
  readonly sensorT = new Float64Array(PACKS_PER_RACK * TEMP_SENSORS_PER_PACK);
  // — elektriksel —
  current = 0; // A (+ şarj)
  currentMeasured = 0;
  vrc = 0; // polarizasyon (raf toplamı, V)
  // — BPU —
  mcPlus = false;
  mcMinus = false;
  pc = false;
  /** Kontaktör kapama/açma sekansı. */
  private seq: { kind: "close" | "open"; t: number } | null = null;
  mcOpenCount = 0;
  fan = false;
  // — RBMS —
  state: number = RACK_STATE.INITIALIZATION;
  rbmsUp = false; // BSC ile haberleşiyor mu
  private initT = 0;
  heartbeat = 0;
  soh: number;
  cycles = 0;
  private throughputAh = 0;
  idleTime = 0;
  balancingActive = false;
  balancingRemaining = 0;
  nonBalancingDays = 3;
  calibrationReq = 0;
  disabled = false;
  readonly inj: RackInjection = NO_INJECTION();
  readonly diag: DiagEngine<RackCtx>;
  /** Zon (HVAC) hava sıcaklığı — termal modelden gelir. */
  airT = 24;
  /** Son adımda paketlerden havaya aktarılan ısı (W) — termal modele girdi. */
  heatToAir = 0;
  /** BSC'nin "kapat" talebi (BSC tarafından sürülür). */
  private wantClosed = false;

  constructor(
    readonly bscId: string,
    readonly id: number,
    seed: number,
    initialSoc: number,
    initialT: number,
    onDiag: (rack: Rack, code: string, name: string, level: string, active: boolean) => void,
  ) {
    const rng = makeRng(seed);
    for (let i = 0; i < SERIES_PER_RACK; i++) {
      this.cap[i] = RACK_CAPACITY_AH * (1 + 0.006 * gauss(rng));
      this.soc[i] = clamp(initialSoc + 0.35 * gauss(rng), 0, 100);
      this.rFactor[i] = 1 + 0.05 * gauss(rng);
    }
    for (let i = 0; i < SERIES_PER_RACK; i++) this.socDev0[i] = this.soc[i]! - initialSoc;
    for (let p = 0; p < PACKS_PER_RACK; p++) this.packT[p] = initialT + 0.3 * gauss(rng);
    for (let s = 0; s < this.sensorOffset.length; s++) this.sensorOffset[s] = 0.35 * gauss(rng);
    this.soh = 99.2 + 0.25 * gauss(rng);
    this.diag = new DiagEngine<RackCtx>(rackDiagDefs(), (d, active) => onDiag(this, d.code, d.name, d.level, active));
    this.updateVoltages(0);
  }

  // ───────────────────────── türetilmiş büyüklükler ─────────────────────────

  get online(): boolean {
    return this.mcPlus && this.mcMinus && !this.inj.fuseBlown;
  }
  /** Elektriksel olarak bağlı (kaynak kontaktör dahil). */
  get electricallyConnected(): boolean {
    return (this.mcPlus || this.inj.contactorOpenFailure) && (this.mcMinus || this.inj.contactorOpenFailure) && !this.inj.fuseBlown;
  }
  get dcLineClosed(): boolean {
    return this.mcPlus && this.mcMinus;
  }
  get closing(): boolean {
    return this.seq?.kind === "close";
  }

  ocvSum(): number {
    let s = 0;
    for (let i = 0; i < SERIES_PER_RACK; i++) s += cellOcv(this.soc[i]!, this.packT[(i / CELLS_PER_PACK) | 0]!);
    return s;
  }
  /** Thevenin eşdeğeri: E = ΣOCV + Vrc, R = ΣR0 + kontaktör/bara. */
  thevenin(): { e: number; r: number } {
    let r = 0.012; // BPU + bara + kablo
    for (let i = 0; i < SERIES_PER_RACK; i++) r += groupR0(this.packT[(i / CELLS_PER_PACK) | 0]!, this.rFactor[i]!);
    return { e: this.ocvSum() + this.vrc, r };
  }
  cellSum(): number {
    let s = 0;
    for (let i = 0; i < SERIES_PER_RACK; i++) s += this.vCell[i]!;
    return s;
  }
  private statsCache: RackStats | null = null;
  stats(): RackStats {
    if (!this.statsCache) this.statsCache = this.computeStats();
    return this.statsCache;
  }
  private computeStats(): RackStats {
    let vMax = -1, vMin = 99, vSum = 0, vMaxI = 0, vMinI = 0;
    let socMin = 101, socMax = -1, socSum = 0;
    for (let i = 0; i < SERIES_PER_RACK; i++) {
      const v = this.vCell[i]!;
      vSum += v;
      if (v > vMax) { vMax = v; vMaxI = i; }
      if (v < vMin) { vMin = v; vMinI = i; }
      const s = this.soc[i]!;
      socSum += s;
      if (s < socMin) socMin = s;
      if (s > socMax) socMax = s;
    }
    let packAvgVMax = 0, packAvgVMin = 99;
    for (let p = 0; p < PACKS_PER_RACK; p++) {
      let s = 0;
      for (let c = 0; c < CELLS_PER_PACK; c++) s += this.vCell[p * CELLS_PER_PACK + c]!;
      const a = s / CELLS_PER_PACK;
      if (a > packAvgVMax) packAvgVMax = a;
      if (a < packAvgVMin) packAvgVMin = a;
    }
    let tMax = -99, tMin = 999, tSum = 0, tMaxI = 0, tMinI = 0, tDiffPack = 0;
    for (let p = 0; p < PACKS_PER_RACK; p++) {
      let pMax = -99, pMin = 999;
      for (let k = 0; k < TEMP_SENSORS_PER_PACK; k++) {
        const idx = p * TEMP_SENSORS_PER_PACK + k;
        const t = this.sensorT[idx]!;
        tSum += t;
        if (t > tMax) { tMax = t; tMaxI = idx; }
        if (t < tMin) { tMin = t; tMinI = idx; }
        if (t > pMax) pMax = t;
        if (t < pMin) pMin = t;
      }
      tDiffPack = Math.max(tDiffPack, pMax - pMin);
    }
    const loc = (pack: number, n: number): number => (((pack + 1) & 0xff) << 8) | ((n + 1) & 0xff);
    return {
      vMax, vMin, vAvg: vSum / SERIES_PER_RACK,
      vMaxLoc: loc((vMaxI / CELLS_PER_PACK) | 0, vMaxI % CELLS_PER_PACK),
      vMinLoc: loc((vMinI / CELLS_PER_PACK) | 0, vMinI % CELLS_PER_PACK),
      tMax, tMin, tAvg: tSum / this.sensorT.length,
      tMaxLoc: loc((tMaxI / TEMP_SENSORS_PER_PACK) | 0, tMaxI % TEMP_SENSORS_PER_PACK),
      tMinLoc: loc((tMinI / TEMP_SENSORS_PER_PACK) | 0, tMinI % TEMP_SENSORS_PER_PACK),
      tDiffRack: tMax - tMin, tDiffPack, socMin, socMax, socAvg: socSum / SERIES_PER_RACK,
      packAvgVMax, packAvgVMin,
    };
  }
  /** BMS'in raporladığı raf SOC'si — min/max ağırlıklı (alt uçta min, üst uçta max hücreyi izler). */
  reportedSoc(): number {
    const s = this.stats();
    const w = clamp(s.socAvg / 100, 0, 1);
    return clamp(w * s.socMax + (1 - w) * s.socMin, 0, 100);
  }
  energyKwh(): number {
    let e = 0;
    for (let i = 0; i < SERIES_PER_RACK; i++) e += (this.cap[i]! * this.soc[i]!) / 100;
    return (e / SERIES_PER_RACK) * (1313.76 / 1000);
  }

  // ───────────────────────── güç limitleri (SPC/VPC/TPC) ─────────────────────────

  limits(): RackLimits {
    const st = this.stats();
    const soc = this.reportedSoc();
    let ch = 1, dis = 1;
    let spc = false, vpc = false, preVpc = false, tpc = false;
    // SOC tabanlı (SPC) — işletme penceresi %3.5–97 (LGES termal sim. DOD tanımı)
    if (soc >= 90) { ch = Math.min(ch, soc >= 97 ? 0 : soc >= 95 ? 0.3 * (97 - soc) / 2 : 1 - 0.7 * (soc - 90) / 5); spc = true; }
    if (soc <= 10) { dis = Math.min(dis, soc <= 3.5 ? 0 : soc <= 5 ? 0.3 * (soc - 3.5) / 1.5 : 1 - 0.7 * (10 - soc) / 5); spc = true; }
    // Gerilim tabanlı (VPC / PreVPC) — OVW 3.70 V, UVW 2.40 V
    if (st.vMax >= 3.5) { preVpc = true; ch = Math.min(ch, 0.8); }
    if (st.vMax >= 3.55) { vpc = true; ch = Math.min(ch, clamp((3.65 - st.vMax) / 0.1, 0, 1) * 0.8); }
    if (st.vMin <= 2.9) { vpc = true; dis = Math.min(dis, clamp((st.vMin - 2.7) / 0.2, 0, 1)); }
    // Sıcaklık tabanlı (TPC) — OTW 49 °C, UTW 0 °C
    if (st.tMax >= 40) { tpc = true; const k = clamp((50 - st.tMax) / 10, 0, 1); ch = Math.min(ch, k); dis = Math.min(dis, k); }
    if (st.tMin < 10) { tpc = true; ch = Math.min(ch, st.tMin <= 0 ? 0 : 0.25 + 0.075 * st.tMin); }
    if (st.tMin < 0) dis = Math.min(dis, st.tMin <= -10 ? 0 : 0.5);
    const base = RACK_POWER_1CP_KW * clamp(this.soh / 100, 0.5, 1);
    return { chargeKw: base * ch, dischargeKw: base * dis, spc, vpc, preVpc, tpc };
  }

  // ───────────────────────── kontaktör kontrolü ─────────────────────────

  requestClose(): void {
    if (this.dcLineClosed || this.seq?.kind === "close") return;
    this.wantClosed = true;
    this.seq = { kind: "close", t: 0 };
  }
  requestOpen(): void {
    this.wantClosed = false;
    if (!this.mcPlus && !this.mcMinus && !this.pc) {
      this.seq = null;
      return;
    }
    this.seq = { kind: "open", t: 0 };
  }
  forceOpenNow(): void {
    if (this.mcPlus || this.mcMinus) this.mcOpenCount++;
    this.mcPlus = false;
    this.mcMinus = false;
    this.pc = false;
    this.seq = null;
    this.wantClosed = false;
  }

  private runSequence(dt: number, step: number, pre: number): void {
    if (!this.seq) return;
    this.seq.t += dt;
    const t = this.seq.t;
    if (this.seq.kind === "close") {
      // MC(-) → PC (ön şarj) → MC(+) → PC aç
      if (t >= 0) this.mcMinus = true;
      if (t >= step * 0.25) this.pc = true;
      if (t >= step * 0.25 + pre) this.mcPlus = true;
      if (t >= step * 0.25 + pre + 0.05) {
        this.pc = false;
        this.seq = null;
      }
    } else {
      if (this.mcPlus || this.mcMinus) this.mcOpenCount++;
      this.mcPlus = false;
      this.mcMinus = false;
      this.pc = false;
      this.seq = null;
    }
  }

  // ───────────────────────── zaman adımı ─────────────────────────

  /**
   * Fizik adımı. `current` BSC'nin bara çözümünden atanmış olmalı.
   * @param bscComm BSC raf ile haberleşiyor mu (Initializing sonrası)
   */
  step(dt: number, simT: number, opts: { bscComm: boolean; closeStep: number; precharge: number; initPerRack: number }): void {
    // RBMS ↔ BSC haberleşmesi / başlatma
    if (opts.bscComm && !this.inj.rbmsCommLoss) {
      if (!this.rbmsUp) {
        this.rbmsUp = true;
        this.initT = 0;
        this.state = RACK_STATE.INITIALIZATION;
      }
      if (this.state < RACK_STATE.NORMAL) {
        this.initT += dt;
        const f = this.initT / Math.max(0.2, opts.initPerRack);
        this.state = f < 0.2 ? RACK_STATE.INITIALIZATION : f < 0.4 ? RACK_STATE.ID_SET : f < 0.55 ? RACK_STATE.ID_SET_COMPLETE : f < 0.75 ? RACK_STATE.BMIC_INIT : f < 1 ? RACK_STATE.INITIAL_DIAG : RACK_STATE.NORMAL;
      }
      this.heartbeat = (this.heartbeat + dt) % 65536;
    } else if (!opts.bscComm) {
      this.rbmsUp = false;
      this.state = RACK_STATE.INITIALIZATION;
    }

    this.runSequence(dt, opts.closeStep, opts.precharge);

    // Akım → hücre SOC
    const I = this.electricallyConnected ? this.current : 0;
    if (!this.electricallyConnected) this.current = 0;
    this.currentMeasured = this.inj.currentSensorFault ? I * 1.0 + 12 : I;
    const dAh = (I * dt) / 3600;
    this.throughputAh += Math.abs(dAh);
    this.cycles = this.throughputAh / (2 * RACK_CAPACITY_AH);
    const sd = this.inj.cellSelfDischarge;
    for (let i = 0; i < SERIES_PER_RACK; i++) {
      let d = (100 * dAh) / this.cap[i]!;
      if (this.balancing[i]) d -= (100 * (0.032 * 0.98 * dt) / 3600) / this.cap[i]!;
      if (sd && sd.cell === i) d -= (100 * ((sd.mA / 1000) * dt) / 3600) / this.cap[i]!;
      this.soc[i] = clamp(this.soc[i]! + d, -2, 102);
    }
    // Polarizasyon (raf toplamı)
    const r1Total = GROUP_R1 * SERIES_PER_RACK;
    this.vrc = lag(this.vrc, I * r1Total, dt, RC_TAU_S);
    this.updateVoltages(I);

    // Termal
    const heatInj = this.inj.heat;
    this.fan = this.rbmsUp && !this.inj.packFanFail && (Math.abs(I) > 8 || this.maxPackT() > 28);
    const rth = this.fan ? PACK_RTH_FAN : PACK_RTH_NOFAN;
    let qAir = 0;
    for (let p = 0; p < PACKS_PER_RACK; p++) {
      const qGen = I * I * PACK_R_HEAT * (1 + 0.04 * (p % 5)) + (this.fan ? PACK_FAN_HEAT_W : 0) + (heatInj && heatInj.pack === p ? heatInj.watts : 0);
      // raf içi dikey sıcaklık gradyanı: üst paketler daha sıcak hava görür
      const localAir = this.airT + 2.2 * (p / (PACKS_PER_RACK - 1)) + (I * I * PACK_R_HEAT * 0.004);
      const qOut = (this.packT[p]! - localAir) / rth;
      qAir += qOut;
      this.packT[p] = this.packT[p]! + ((qGen - qOut) * dt) / PACK_HEAT_CAP;
    }
    this.heatToAir = qAir + (this.fan ? 0 : 0) + (this.rbmsUp ? 25 : 0); // RBMS/BPU elektroniği ~25 W
    for (let p = 0; p < PACKS_PER_RACK; p++) {
      for (let k = 0; k < TEMP_SENSORS_PER_PACK; k++) {
        const idx = p * TEMP_SENSORS_PER_PACK + k;
        this.sensorT[idx] = this.packT[p]! + this.sensorOffset[idx]! + (k - 1.5) * 0.25 * Math.abs(I) / 170;
      }
    }
    const tsf = this.inj.tempSensorFault;
    if (tsf) this.sensorT[tsf.pack * TEMP_SENSORS_PER_PACK] = tsf.value;
    this.statsCache = null;

    // Hücre dengeleme (LGES JF1 Cell Balancing v1.1 — üst bölge)
    this.idleTime = Math.abs(I) < 3 ? this.idleTime + dt : 0;
    this.updateBalancing(dt);

    // Teşhisler (yalnız RBMS çalışırken)
    this.diag.evaluate({ r: this }, dt, simT, this.rbmsUp);

    // Koruma aksiyonu: "open" teşhisleri → MC aç (RBMS kendisi açar)
    if (this.dcLineClosed && this.diag.hasAction("open")) this.requestOpen();
  }

  private maxPackT(): number {
    let m = -99;
    for (let p = 0; p < PACKS_PER_RACK; p++) m = Math.max(m, this.packT[p]!);
    return m;
  }

  private updateVoltages(I: number): void {
    this.statsCache = null;
    const hr = this.inj.cellHighR;
    const vrcPer = this.vrc / SERIES_PER_RACK;
    for (let i = 0; i < SERIES_PER_RACK; i++) {
      const t = this.packT[(i / CELLS_PER_PACK) | 0]!;
      const rf = this.rFactor[i]! * (hr && hr.cell === i ? hr.factor : 1);
      this.vCell[i] = cellOcv(this.soc[i]!, t) + I * groupR0(t, rf) + vrcPer * rf;
    }
  }

  private updateBalancing(dt: number): void {
    const st = this.stats();
    const entry = this.rbmsUp && st.vAvg > 3.342 && this.idleTime > 600 && st.tMin > 0;
    if (!this.balancingActive && entry) {
      let any = false;
      for (let i = 0; i < SERIES_PER_RACK; i++) {
        const on = this.vCell[i]! - st.vMin > 0.02;
        this.balancing[i] = on ? 1 : 0;
        any ||= on;
      }
      if (any) {
        this.balancingActive = true;
        this.balancingRemaining = 19491;
      }
    }
    if (this.balancingActive) {
      this.balancingRemaining = Math.max(0, this.balancingRemaining - dt);
      const done = st.vMax - st.vMin < 0.0185 || st.vMin <= 2.7 || this.balancingRemaining <= 0 || !this.rbmsUp;
      if (done) {
        this.balancingActive = false;
        this.balancing.fill(0);
        this.nonBalancingDays = 0;
      }
    }
  }

  /** BSC Reset / LGES temizliği sonrası. */
  resetRbms(): void {
    this.rbmsUp = false;
    this.state = RACK_STATE.INITIALIZATION;
    this.forceOpenNow();
  }

  /** Senaryo başlangıcı: açılıştaki hücre dağılımına, verilen SOC ve sıcaklığa dön (kontaktörler açık). */
  restoreBaseline(soc: number, tempC: number): void {
    this.forceOpenNow();
    this.diag.clearAll();
    for (let i = 0; i < SERIES_PER_RACK; i++) this.soc[i] = clamp(soc + this.socDev0[i]!, 0, 100);
    for (let p = 0; p < PACKS_PER_RACK; p++) this.packT[p] = tempC;
    this.resetRbms();
    this.updateVoltages(0);
  }

  /** Raf SOC'sini (tüm hücrelere) ayarla — konsol. */
  setSoc(soc: number): void {
    const avg = this.stats().socAvg;
    for (let i = 0; i < SERIES_PER_RACK; i++) this.soc[i] = clamp(soc + (this.soc[i]! - avg), 0, 100);
    this.updateVoltages(this.current);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Raf teşhis tablosu (LGES Diagnosis v1.1.0 — 1CP Turkey) → Rev AF bitleri
// reg = summary ofseti: 18=30238(R1) … 32=30252 ; 80 = Rack-BSC by BSC (30300)
// ─────────────────────────────────────────────────────────────────────────────

function rackDiagDefs(): DiagDef<RackCtx>[] {
  const S = (c: RackCtx) => c.r.stats();
  const idle = (c: RackCtx) => Math.abs(c.r.current) < 0.5;
  return [
    // 18: Rack Dev V (g0) | Pack Dev V (g1) | Under V (g2) | Over V (g3)
    { code: "OVF2", name: "Hücre aşırı gerilim F2", level: "fault2", reg: 18, bit: gbit(3, "fault2"), detectS: 3, detect: (c) => S(c).vMax > 4.0, clearBy: "eventclear", action: "open" },
    { code: "OVF1", name: "Hücre aşırı gerilim F1", level: "fault1", reg: 18, bit: gbit(3, "fault1"), detectS: 5, detect: (c) => S(c).vMax > 3.8, clearBy: "eventclear", action: "open" },
    { code: "OVW", name: "Hücre aşırı gerilim uyarı", level: "warning", reg: 18, bit: gbit(3, "warning"), detectS: 5, releaseS: 5, detect: (c) => S(c).vMax > 3.7, release: (c) => S(c).vMax < 3.65, clearBy: "auto", action: "derate-chg" },
    { code: "UVF1", name: "Hücre düşük gerilim F1", level: "fault1", reg: 18, bit: gbit(2, "fault1"), detectS: 5, detect: (c) => S(c).vMin < 2.3, clearBy: "eventclear", action: "open" },
    { code: "UVW", name: "Hücre düşük gerilim uyarı", level: "warning", reg: 18, bit: gbit(2, "warning"), detectS: 5, releaseS: 5, detect: (c) => S(c).vMin < 2.4, release: (c) => S(c).vMin > 2.5, clearBy: "auto", action: "derate-dis" },
    { code: "PDVF", name: "Paket içi hücre sapması F1 (CER)", level: "fault1", reg: 18, bit: gbit(1, "fault1"), detectS: 10, detect: (c) => { const s = S(c); const d = (s.vMax - s.vMin) * 1000; return (c.r.reportedSoc() > 98 && d > 319) || (c.r.reportedSoc() < 20 && d > 528); }, clearBy: "lges", action: "open" },
    { code: "PDVW", name: "Paket içi hücre sapması uyarı", level: "warning", reg: 18, bit: gbit(1, "warning"), detectS: 10, releaseS: 3, detect: (c) => { const s = S(c); const d = (s.vMax - s.vMin) * 1000; return (c.r.reportedSoc() > 98 && d > 290) || (c.r.reportedSoc() < 20 && d > 480); }, release: (c) => { const s = S(c); return (s.vMax - s.vMin) * 1000 < 280; }, clearBy: "auto", action: "derate-both" },
    { code: "RDVW", name: "Raf içi paket sapması uyarı", level: "warning", reg: 18, bit: gbit(0, "warning"), detectS: 3, releaseS: 3, detect: (c) => { const s = S(c); return (s.packAvgVMax - s.packAvgVMin) * 1000 > 332; }, release: (c) => { const s = S(c); return (s.packAvgVMax - s.packAvgVMin) * 1000 < 285; }, clearBy: "auto", action: "derate-both" },
    // 19: Rack Over Charge Current (g0) | — | — | Sudden Voltage Drop (g3)
    { code: "OCCF", name: "Raf aşırı şarj akımı F1", level: "fault1", reg: 19, bit: gbit(0, "fault1"), detectS: 15, detect: (c) => c.r.currentMeasured > 231, clearBy: "eventclear", action: "open" },
    { code: "OCCW", name: "Raf aşırı şarj akımı uyarı", level: "warning", reg: 19, bit: gbit(0, "warning"), detectS: 5, releaseS: 5, detect: (c) => c.r.currentMeasured > 210, release: (c) => c.r.currentMeasured < 196.875, clearBy: "auto", action: "derate-chg" },
    // 20: Under Temp (g0) | Over Temp (g1) | — | Rack Over Discharge Current (g3)
    { code: "UTF1", name: "Raf düşük sıcaklık F1", level: "fault1", reg: 20, bit: gbit(0, "fault1"), detectS: 5, detect: (c) => S(c).tMin < -10, clearBy: "eventclear", action: "open" },
    { code: "UTW", name: "Raf düşük sıcaklık uyarı", level: "warning", reg: 20, bit: gbit(0, "warning"), detectS: 5, releaseS: 5, detect: (c) => S(c).tMin < 0, release: (c) => S(c).tMin > 5, clearBy: "auto", action: "derate-both" },
    { code: "OTF1", name: "Raf aşırı sıcaklık F1", level: "fault1", reg: 20, bit: gbit(1, "fault1"), detectS: 5, detect: (c) => S(c).tMax > 58, clearBy: "eventclear", action: "open" },
    { code: "OTW", name: "Raf aşırı sıcaklık uyarı", level: "warning", reg: 20, bit: gbit(1, "warning"), detectS: 5, releaseS: 5, detect: (c) => S(c).tMax > 49, release: (c) => S(c).tMax < 41, clearBy: "auto", action: "derate-both" },
    { code: "ODCF1", name: "Raf aşırı deşarj akımı F1", level: "fault1", reg: 20, bit: gbit(3, "fault1"), detectS: 15, detect: (c) => c.r.currentMeasured < -231, clearBy: "eventclear", action: "open" },
    { code: "ODCW", name: "Raf aşırı deşarj akımı uyarı", level: "warning", reg: 20, bit: gbit(3, "warning"), detectS: 5, releaseS: 5, detect: (c) => c.r.currentMeasured < -210, release: (c) => c.r.currentMeasured > -196.875, clearBy: "auto", action: "derate-dis" },
    // 21: Rack Over Charge Power (g0) | — | — | Deviation Temp (g3)
    { code: "OCPF", name: "Raf aşırı şarj gücü F1", level: "fault1", reg: 21, bit: gbit(0, "fault1"), detectS: 20, detect: (c) => rackPowerRatio(c.r, "chg") > 1.2, clearBy: "eventclear", action: "open" },
    { code: "OCPW", name: "Raf aşırı şarj gücü uyarı", level: "warning", reg: 21, bit: gbit(0, "warning"), detectS: 10, releaseS: 10, detect: (c) => rackPowerRatio(c.r, "chg") > 1.1, release: (c) => rackPowerRatio(c.r, "chg") < 1.0, clearBy: "auto", action: "derate-chg" },
    { code: "DTW", name: "Raf sıcaklık sapması uyarı", level: "warning", reg: 21, bit: gbit(3, "warning"), detectS: 5, releaseS: 5, detect: (c) => S(c).tDiffRack > 10, release: (c) => S(c).tDiffRack < 8, clearBy: "auto", action: "derate-both" },
    // 22: Under SOH (g0) | Rack Under SOC (g1) | Rack Over SOC (g2) | Rack Over Discharge Power (g3)
    { code: "USOHF", name: "Düşük SOH F1", level: "fault1", reg: 22, bit: gbit(0, "fault1"), detectS: 1, detect: (c) => c.r.soh < 55, clearBy: "lges", action: "open" },
    { code: "USOHA", name: "Düşük SOH alarm", level: "alarm", reg: 22, bit: gbit(0, "alarm"), detectS: 1, detect: (c) => c.r.soh < 56, clearBy: "lges", action: "none" },
    { code: "USOCW", name: "Raf düşük SOC uyarı", level: "warning", reg: 22, bit: gbit(1, "warning"), detectS: 5, releaseS: 5, detect: (c) => c.r.reportedSoc() < 0.01, release: (c) => c.r.reportedSoc() > 0, clearBy: "auto", action: "derate-dis" },
    { code: "OSOCW", name: "Raf yüksek SOC uyarı", level: "warning", reg: 22, bit: gbit(2, "warning"), detectS: 5, releaseS: 5, detect: (c) => c.r.reportedSoc() > 99.99, release: (c) => c.r.reportedSoc() < 100, clearBy: "auto", action: "derate-chg" },
    { code: "ODPF", name: "Raf aşırı deşarj gücü F1", level: "fault1", reg: 22, bit: gbit(3, "fault1"), detectS: 20, detect: (c) => rackPowerRatio(c.r, "dis") > 1.2, clearBy: "eventclear", action: "open" },
    { code: "ODPW", name: "Raf aşırı deşarj gücü uyarı", level: "warning", reg: 22, bit: gbit(3, "warning"), detectS: 10, releaseS: 10, detect: (c) => rackPowerRatio(c.r, "dis") > 1.1, release: (c) => rackPowerRatio(c.r, "dis") < 1.0, clearBy: "auto", action: "derate-dis" },
    // 23: Rack-BSC LOC by Rack (g0) | Rack-Pack LOC (g1) | Frequent Balancing (g2) | Cycle Count (g3)
    { code: "RPLOC", name: "RBMS–PBMS haberleşme kaybı", level: "fault1", reg: 23, bit: gbit(1, "fault1"), detectS: 3, detect: (c) => c.r.inj.packCommLoss, release: (c) => !c.r.inj.packCommLoss, clearBy: "auto", action: "open" },
    { code: "CWEF", name: "Çevrim garantisi aşıldı F1", level: "fault1", reg: 23, bit: gbit(3, "fault1"), detectS: 1, detect: (c) => c.r.cycles > 13000, clearBy: "lges", action: "open" },
    { code: "CWEA", name: "Çevrim garantisi alarm", level: "alarm", reg: 23, bit: gbit(3, "alarm"), detectS: 1, detect: (c) => c.r.cycles > 12870, clearBy: "lges", action: "none" },
    // 26: — | MC Feedback (g1) | Temp Sensor (g2) | Current Sensor (g3)
    { code: "MCFF", name: "Ana kontaktör geri bildirim hatası", level: "fault1", reg: 26, bit: gbit(1, "fault1"), detectS: 5, detect: (c) => c.r.inj.contactorFeedbackFail && (c.r.mcPlus || c.r.closing), clearBy: "eventclear", action: "derate-both" },
    { code: "TSE", name: "Sıcaklık sensörü sınır dışı", level: "fault1", reg: 26, bit: gbit(2, "fault1"), detectS: 5, detect: (c) => { const s = S(c); return s.tMax > 70 || s.tMin < -30; }, clearBy: "eventclear", action: "open" },
    { code: "CSE", name: "Akım sensörü hatası", level: "fault1", reg: 26, bit: gbit(3, "fault1"), detectS: 1, detect: (c) => c.r.inj.currentSensorFault && Math.abs(c.r.currentMeasured - c.r.current) > 8, clearBy: "eventclear", action: "open" },
    // 27: Contactor Open Failure (g0) | PBMS Fault (g1) | — | Pack Fan Error (g3)
    { code: "MCOF", name: "Kontaktör açma hatası (COF)", level: "fault1", reg: 27, bit: gbit(0, "fault1"), detectS: 10, detect: (c) => !c.r.dcLineClosed && c.r.electricallyConnected && Math.abs(c.r.current) > 1, clearBy: "eventclear", action: "section-zero" },
    { code: "PBMSF", name: "PBMS arızası", level: "fault1", reg: 27, bit: gbit(1, "fault1"), detectS: 1, detect: (c) => c.r.inj.pbmsFault, clearBy: "eventclear", action: "open" },
    { code: "PFE", name: "Paket fan hatası", level: "warning", reg: 27, bit: gbit(3, "warning"), detectS: 30, releaseS: 10, detect: (c) => c.r.inj.packFanFail, release: (c) => !c.r.inj.packFanFail, clearBy: "auto", action: "none" },
    // 28: Vaux 3.3V (g0) … (güç regülatörü — RPRF)
    { code: "RPRF", name: "RBMS güç regülatörü arızası", level: "fault1", reg: 28, bit: gbit(0, "fault1"), detectS: 5, detect: (c) => c.r.inj.powerRegulatorFault, clearBy: "eventclear", action: "open" },
    // 31: MC Open Over Count (g0)
    { code: "MOOCA", name: "MC açma sayısı aşıldı", level: "alarm", reg: 31, bit: gbit(0, "alarm"), detectS: 1, detect: (c) => c.r.mcOpenCount > 5000, clearBy: "lges", action: "none" },
    // 80 (30300): — | Rack Connection Fault (g1) | Current Imbalance (g2) | Rack-BSC LOC by BSC (g3)
    { code: "RCF", name: "Raf bağlantı arızası (RCF)", level: "fault1", reg: 80, bit: gbit(1, "fault1"), detectS: 10, detect: (c) => c.r.dcLineClosed && c.r.inj.fuseBlown, clearBy: "eventclear", action: "open" },
    { code: "RBSCLOC", name: "BSC–RBMS haberleşme kaybı", level: "fault1", reg: 80, bit: gbit(3, "fault1"), detectS: 10, detect: (c) => c.r.inj.rbmsCommLoss, release: (c) => !c.r.inj.rbmsCommLoss, clearBy: "auto", action: "open" },
  ];
}

/** Raf gücü / raf limiti oranı (aynı yön). */
function rackPowerRatio(r: Rack, dir: "chg" | "dis"): number {
  const p = (r.current * r.cellSum()) / 1000; // kW (+ şarj)
  const lim = r.limits();
  if (dir === "chg") return p > 0.5 ? p / Math.max(1, lim.chargeKw) : 0;
  return p < -0.5 ? -p / Math.max(1, lim.dischargeKw) : 0;
}
