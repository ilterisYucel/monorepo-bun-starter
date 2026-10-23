// Wattox MPCS-1725-S merkezi PCS modeli.
// Kaynaklar: Modbus Communication Protocol V1.0 (A/B/C/D/S parametreleri, Appendix 1-3),
// Control & Operation Philosophy (durum makinesi, EPO, PQ/CCCV, uzaktan/yerel),
// Ürün özellikleri (1725 kW@45 °C, 1898 kW@35 °C, 690 V AC, DC 1000–1500 V, 1807 A),
// Derating tablosu (sıcaklık × irtifa), verim eğrisi (MPCS-1725).

import { clamp, interp, lag, ramp } from "../core/util";
import type { EventLog } from "../core/events";
import type { Realism, Timings } from "../core/profile";
import { AUTO_RECOVER, FAULT_BITS } from "./wattox-catalog";

export const OP = { STOP: 0, STANDBY: 1, CHARGING: 2, DISCHARGING: 3, ZERO_POWER: 4, OFFGRID: 5, FAULT: 6 } as const;
export const OP_NAME: Record<number, string> = { 0: "Stop", 1: "Standby", 2: "Şarj", 3: "Deşarj", 4: "Sıfır güç", 5: "Off-grid", 6: "Fault" };

type Phase = "selfcheck" | "stop" | "softstart" | "standby" | "run" | "fault";

export interface PcsConfig {
  id: string;
  ratedKw: number; // 1725
  ratedV: number; // 690 V AC
  ratedA: number;
  dcMaxA: number; // 1807
  altitudeM: number;
}

/** BMS bloğu (0x0300–0x0316) — BMS/konnektör yazar. */
export const BMS_BASE = 0x0300;
export const BMS_SIZE = 0x17;

export interface GridState {
  present: boolean;
  vLL: number; // V
  hz: number;
}

export class WattoxPcs {
  phase: Phase = "selfcheck";
  private phaseT = 0;
  private runEnabled = false; // start komutu → true, standby → false
  /** Holding (S) parametreleri. */
  readonly settings = new Map<number, number>([
    [0x0e00, 1], // S01 komut kaynağı (1=EMS) — devreye almada EMS'e alınmış varsayımı
    [0x0e01, 0],
    [0x0e02, 0],
    [0x0e04, 0],
    [0x0e06, 0],
    [0x0e19, 0],
    [0x0e1a, 0],
    [0x0e1b, 1000],
    [0x0e1c, 13000],
    [0x0e1d, 0],
    [0x0e1e, 10000],
    [0x0e20, 50],
    [0x0e23, 7590],
    [0x0e07, 0],
    [0x0e14, 0],
    [0x0e15, 0],
    [0x0e16, 0],
    [0x0e17, 0],
    [0x0e27, 2026],
    [0x0e28, 101],
    [0x0e29, 0],
    [0x0e2a, 0],
    [0x057e, 0],
    [0x0539, 1],
    [0x1200, 0],
    [0x1208, 0],
    [0x120a, 3],
    [0x1209, 50],
    [0x120c, 0],
    [0x120e, 0],
    [0x120d, 50],
    [0x1203, 100],
    [0x1204, 200],
    [0x1205, 1200],
  ]);
  readonly bms = new Array<number>(BMS_SIZE).fill(0);
  bmsLastWriteWall = 0;
  emsLastRequestWall = Date.now();
  /** Kurulum parametreleri (C bloğu, RO) — konsoldan ayarlanabilir. */
  emsTimeoutS = 0; // C24 — 0: denetim yok
  bmsTimeoutS = 10; // C61
  readonly faults = new Array<number>(10).fill(0);
  readonly alarms = new Array<number>(8).fill(0);
  /** Konsol enjeksiyonlarıyla sabitlenen bitler (temizlenene kadar kalır). */
  readonly forcedFaults = new Set<string>();
  readonly forcedAlarms = new Set<string>();
  estop = { local: false, remote: false, bms: false };
  doorOpen = false;
  coolingFail = false; // pompa/fan arızası → IGBT ısınır
  insulationKohm = 3200;
  // — elektriksel durum —
  pAc = 0; // kW (+ deşarj)
  qAc = 0; // kVar (+ endüktif)
  pDc = 0; // kW (+ deşarj, batarya tarafı)
  dcVoltage = 0; // bara (V) — BSC'den
  dcCurrent = 0; // A (+ deşarj)
  derated = 0; // A52 bitleri
  // — termal —
  ambientC = 25;
  humidity = 45;
  igbt = [35, 35, 35, 35, 35, 35];
  reactor = [40, 40];
  filterCap = 33;
  cavity = 30;
  coolant = 28;
  // — sayaçlar —
  accChargeKwh = 0;
  accDischargeKwh = 0;
  dailyChargeKwh = 0;
  dailyDischargeKwh = 0;
  private lastDay = -1;
  // — bağlantı elemanları (A53..A58: 0 kapalı / 1 açık) —
  acBreakerClosed = false;
  dcBreakerClosed = false;
  acPrecharge = false;
  dcPrecharge = false;
  grid: GridState = { present: true, vLL: 690, hz: 50 };

  constructor(
    readonly cfg: PcsConfig,
    private readonly events: EventLog,
    private readonly realism: () => Realism,
    private readonly tm: () => Timings,
  ) {}

  // ───────────────────────── sorgular ─────────────────────────

  get opStatus(): number {
    switch (this.phase) {
      case "selfcheck":
      case "stop":
      case "softstart":
        return OP.STOP;
      case "standby":
        return OP.STANDBY;
      case "fault":
        return OP.FAULT;
      case "run":
        if (Math.abs(this.pAc) < 1 && Math.abs(this.setpoint()) < 1) return this.settings.get(0x0539) === 1 ? OP.STANDBY : OP.ZERO_POWER;
        return this.pAc < -0.5 ? OP.CHARGING : this.pAc > 0.5 ? OP.DISCHARGING : OP.ZERO_POWER;
    }
  }
  setpoint(): number {
    const raw = this.settings.get(0x0e19) ?? 0;
    return raw >= 0x8000 ? raw - 0x10000 : raw;
  }
  qSetpoint(): number {
    const raw = this.settings.get(0x0e1a) ?? 0;
    return raw >= 0x8000 ? raw - 0x10000 : raw;
  }
  /** Sıcaklık × irtifa derating (Wattox Derating MPCS-1725-S). */
  deratingFactor(): number {
    const temps = [25, 30, 35, 40, 45];
    const rows: [number, number[]][] = [
      [2000, [1.1, 1.1, 1.1, 1.05, 1.0]],
      [2500, [1.1, 1.1, 1.05, 1.0, 0.95]],
      [3000, [1.1, 1.05, 1.0, 0.95, 0.9]],
      [3500, [1.05, 1.0, 0.95, 0.9, 0.85]],
      [4000, [1.0, 0.95, 0.9, 0.85, 0.8]],
    ];
    const alt = clamp(this.cfg.altitudeM, 2000, 4000);
    const lo = rows.filter((r) => r[0] <= alt).pop()!;
    const hi = rows.find((r) => r[0] >= alt)!;
    const at = (r: number[]): number => {
      const t = this.ambientC;
      if (t > 45) return r[4]! * clamp(1 - (t - 45) * 0.03, 0, 1); // >45 °C üstü ek düşüm (60 °C'de ~%55)
      return interp(t, temps, r);
    };
    const a = at(lo[1]);
    const b = at(hi[1]);
    const f = hi[0] === lo[0] ? a : a + ((alt - lo[0]) / (hi[0] - lo[0])) * (b - a);
    // 1725 kW anma 45 °C'de; 1898 kW maks (110%) 35 °C'de
    return clamp(f, 0, 1.1);
  }
  maxActiveKw(): number {
    let k = this.deratingFactor();
    const igbtMax = Math.max(...this.igbt);
    if (igbtMax > 80) k = Math.min(k, clamp((95 - igbtMax) / 15, 0, 1));
    return this.cfg.ratedKw * k;
  }
  bmsWord(i: number): number {
    return this.bms[i] ?? 0;
  }
  bmsChargeLimitKw(): number {
    return this.bmsWord(0x08) / 10;
  }
  bmsDischargeLimitKw(): number {
    return this.bmsWord(0x09) / 10;
  }
  allowableChargeKw(): number {
    return Math.min(this.maxActiveKw(), this.bmsLinkOk() ? this.bmsChargeLimitKw() : 0);
  }
  allowableDischargeKw(): number {
    return Math.min(this.maxActiveKw(), this.bmsLinkOk() ? this.bmsDischargeLimitKw() : 0);
  }
  bmsLinkOk(): boolean {
    if (this.bmsTimeoutS <= 0) return this.bmsLastWriteWall > 0;
    return this.bmsLastWriteWall > 0 && Date.now() - this.bmsLastWriteWall < this.bmsTimeoutS * 1000;
  }
  faultActive(): boolean {
    return this.faults.some((w) => w !== 0);
  }
  alarmActive(): boolean {
    return this.alarms.some((w) => w !== 0);
  }
  apparentKva(): number {
    return Math.hypot(this.pAc, this.qAc);
  }

  // ───────────────────────── EMS / BMS yazımları ─────────────────────────

  /** EMS yüzü holding yazımı. Hata durumunda ModbusError kodu döndürür (0 = ok). */
  writeSetting(addr: number, raw: number): number {
    const r = this.realism();
    const isCmd = addr >= 0x0e14 && addr <= 0x0e17;
    const isPower = addr === 0x0e19 || addr === 0x0e1a || addr === 0x0e1b;
    if ((isCmd || isPower) && addr !== 0x0e00 && (this.settings.get(0x0e00) ?? 0) !== 1) {
      this.events.compatWarn(this.cfg.id, "cmdSource", "PCS komut kaynağı (S01) EMS değilken EMS komut/setpoint yazıyor", "Yerel (HMI) modda PCS yalnız HMI komutlarına cevap verir — EMS yazımı etkisiz");
      if (r.pcsEnforceCommandSource) {
        this.settings.set(addr, raw & 0xffff);
        return 0;
      }
    }
    const v = raw >= 0x8000 ? raw - 0x10000 : raw;
    switch (addr) {
      case 0x0e19: {
        const lo = -Math.round(this.maxActiveKw());
        const hi = Math.round(this.maxActiveKw());
        if (v < lo || v > hi) {
          this.events.compatWarn(this.cfg.id, "pRange", `Aktif güç setpoint'i aralık dışı (${v} kW; K01..K02 = ${lo}..${hi})`, "Değer reddedilir (0x03 Invalid value)");
          if (r.rejectInvalidValues) return 3;
          raw = (clamp(v, lo, hi) + 0x10000) & 0xffff;
        }
        if (this.phase === "standby" && !this.runEnabled && v !== 0) {
          this.events.push("info", this.cfg.id, `Setpoint ${v} kW yazıldı ama PCS 'Standby' komutunda — çalışması için Start gerekir`);
        }
        break;
      }
      case 0x0e1e: {
        if (raw < 10 || raw > 30000) {
          this.events.compatWarn(this.cfg.id, "rateRange", `Güç değişim hızı aralık dışı (${raw})`, "Geçerli aralık 10–30000 → 0x03");
          if (r.rejectInvalidValues) return 3;
        }
        break;
      }
      case 0x0e14:
        if (raw === 1) this.cmdStart();
        break;
      case 0x0e15:
        if (raw === 1) this.cmdStop("EMS Stop");
        break;
      case 0x0e16:
        if (raw === 1) this.cmdReset();
        break;
      case 0x0e17:
        if (raw === 1) this.cmdStandby();
        break;
      default:
        break;
    }
    this.settings.set(addr, raw & 0xffff);
    return 0;
  }

  writeBms(addr: number, raw: number): void {
    if (addr < BMS_BASE || addr >= BMS_BASE + BMS_SIZE) return;
    this.bms[addr - BMS_BASE] = raw & 0xffff;
    this.bmsLastWriteWall = Date.now();
  }

  cmdStart(): void {
    this.events.push("cmd", this.cfg.id, "Start komutu");
    if (this.phase === "fault") return void this.events.push("warn", this.cfg.id, "Fault durumunda Start reddedildi (önce Fault Reset)");
    this.runEnabled = true;
    if (this.phase === "stop" || this.phase === "selfcheck") this.beginSoftStart();
    else if (this.phase === "standby") this.phase = "run";
  }
  cmdStandby(): void {
    this.events.push("cmd", this.cfg.id, "Standby komutu");
    if (this.phase === "fault") return;
    this.runEnabled = false;
    if (this.phase === "stop" || this.phase === "selfcheck") this.beginSoftStart();
    else if (this.phase === "run") this.phase = "standby";
  }
  cmdStop(reason: string): void {
    this.events.push("cmd", this.cfg.id, `Stop (${reason})`);
    this.runEnabled = false;
    if (this.phase === "fault") return;
    this.openBreakers();
    this.phase = "stop";
    this.phaseT = 0;
    this.settings.set(0x0e19, 0);
  }
  cmdReset(): void {
    this.events.push("cmd", this.cfg.id, "Fault Reset");
    // kalıcı koşullar (e-stop basılı, enjekte arıza) sürüyorsa temizlenemez
    for (let w = 0; w < this.faults.length; w++) {
      let keep = 0;
      for (let b = 0; b < 16; b++) if (this.forcedFaults.has(`${w + 1}:${b}`)) keep |= 1 << b;
      this.faults[w] = keep;
    }
    for (let w = 0; w < this.alarms.length; w++) {
      let keep = 0;
      for (let b = 0; b < 16; b++) if (this.forcedAlarms.has(`${w + 1}:${b}`)) keep |= 1 << b;
      this.alarms[w] = keep;
    }
    this.applyEstopBits();
    if (this.phase === "fault" && !this.faultActive()) {
      this.phase = "stop"; // Control Philosophy: reset → Stop durumu
      this.phaseT = 0;
      this.events.push("info", this.cfg.id, "Fault temizlendi → Stop");
    }
  }

  private beginSoftStart(): void {
    this.phase = "softstart";
    this.phaseT = 0;
    this.events.push("info", this.cfg.id, "Soft start: DC/AC ön şarj ve röle kontrolleri");
  }
  private openBreakers(): void {
    this.acBreakerClosed = false;
    this.dcBreakerClosed = false;
    this.acPrecharge = false;
    this.dcPrecharge = false;
  }

  /** Arıza biti kaldır (otomatik koruma). `word` 1..10 */
  raiseFault(word: number, bitN: number, why?: string): void {
    const before = this.faults[word - 1]!;
    this.faults[word - 1] = before | (1 << bitN);
    if (before !== this.faults[word - 1]) {
      this.events.push("fault", this.cfg.id, `Fault W${word}.b${bitN} ${FAULT_BITS[word - 1]![bitN]}${why ? ` — ${why}` : ""}`);
    }
    if (this.phase !== "fault") {
      this.phase = "fault";
      this.phaseT = 0;
      this.openBreakers();
      this.runEnabled = false;
    }
  }
  raiseAlarm(word: number, bitN: number, on: boolean): void {
    const before = this.alarms[word - 1]!;
    const after = on ? before | (1 << bitN) : before & ~(1 << bitN);
    this.alarms[word - 1] = after & 0xffff;
    if (before !== after && on) this.events.push("alarm", this.cfg.id, `Alarm W${word}.b${bitN} ${FAULT_BITS[word - 1]![bitN]}`);
  }

  setEstop(kind: "local" | "remote" | "bms", on: boolean): void {
    this.estop[kind] = on;
    if (on) {
      this.events.push("fault", this.cfg.id, `ACİL DURDURMA (${kind}) — dalga çıkışı durdu, AC/DC kesiciler açıldı`);
      this.applyEstopBits();
    }
  }
  private applyEstopBits(): void {
    if (this.estop.local) this.raiseFault(6, 15, "Local E-stop");
    if (this.estop.remote) this.raiseFault(7, 0, "Remote E-stop");
    if (this.estop.bms) this.raiseFault(7, 1, "BMS E-stop");
  }

  // ───────────────────────── zaman adımı ─────────────────────────

  /**
   * @param dcVoltage DC baradaki gerilim (V) — BSC online raflar + DC şalter kapalıysa
   * @param simDayIndex simülasyon günü (günlük sayaç sıfırlama)
   */
  step(dt: number, dcVoltage: number, simDayIndex: number): void {
    const tm = this.tm();
    this.phaseT += dt;
    this.dcVoltage = this.dcBreakerClosed || this.phase === "softstart" || this.phase === "stop" ? dcVoltage : dcVoltage;

    if (this.lastDay !== simDayIndex) {
      this.lastDay = simDayIndex;
      this.dailyChargeKwh = 0;
      this.dailyDischargeKwh = 0;
    }

    // — koruma denetimleri (her durumda) —
    this.protections(dt, dcVoltage);

    switch (this.phase) {
      case "selfcheck":
        if (this.phaseT >= tm.pcsSelfCheck) {
          this.phase = "stop";
          this.phaseT = 0;
          this.events.push("info", this.cfg.id, "Öz-denetim tamam → Stop (komut bekleniyor)");
        }
        break;
      case "stop":
        this.openBreakers();
        break;
      case "softstart": {
        const T = tm.pcsSoftStart;
        // Aşamalı: DC ön şarj → (DC gerilim kontrolü) DC kesici → AC ön şarj → (şebeke kontrolü) AC kesici
        if (!this.dcBreakerClosed) {
          this.dcPrecharge = true;
          if (this.phaseT >= T * 0.35) {
            if (dcVoltage < 1000) {
              this.raiseFault(1, 2, `DC gerilim ${dcVoltage.toFixed(0)} V < 1000 V (batarya bağlı değil / raflar offline)`);
              break;
            }
            this.dcBreakerClosed = true;
            this.dcPrecharge = false;
          }
          break;
        }
        if (!this.acBreakerClosed) {
          if (this.phaseT >= T * 0.5) {
            if (!this.grid.present) {
              this.raiseFault(3, 0, "Şebeke yok (OG kesici açık)");
              break;
            }
            this.acPrecharge = true;
          }
          if (this.phaseT >= T && this.acPrecharge) {
            this.acBreakerClosed = true;
            this.acPrecharge = false;
            this.phase = this.runEnabled ? "run" : "standby";
            this.phaseT = 0;
            this.events.push("info", this.cfg.id, `Soft start tamam → ${this.runEnabled ? "Çalışma" : "Standby"}`);
          }
        }
        break;
      }
      case "fault":
        this.openBreakers();
        // otomatik toparlanma: yalnız şebeke/haberleşme kaynaklı ve koşul geçmişse
        if (this.phaseT > tm.pcsFaultAutoRecover && this.faultActive()) {
          const allAuto = this.faults.every((w, i) => {
            for (let b = 0; b < 16; b++) if ((w >> b) & 1 && !AUTO_RECOVER.has(`${i + 1}:${b}`)) return false;
            return true;
          });
          if (allAuto && this.grid.present && this.gridOk() && !this.forcedAny()) {
            this.faults.fill(0);
            this.phase = "stop";
            this.phaseT = 0;
            this.events.push("info", this.cfg.id, "Şebeke arızası geçti — otomatik toparlanma → Stop");
          }
        }
        break;
      default:
        break;
    }

    // — güç kontrolü —
    let pTarget = 0;
    let qTarget = 0;
    if (this.phase === "run") {
      const sp = this.setpoint();
      const bmsSt = this.bmsWord(0x01);
      const chgBlock = (bmsSt & ((1 << 1) | (1 << 4) | (1 << 8))) !== 0;
      const disBlock = (bmsSt & ((1 << 1) | (1 << 5) | (1 << 8))) !== 0;
      const maxDis = disBlock ? 0 : this.allowableDischargeKw();
      const maxChg = chgBlock ? 0 : this.allowableChargeKw();
      pTarget = clamp(sp, -maxChg, maxDis);
      // DC akım sınırı
      if (this.dcVoltage > 100) pTarget = clamp(pTarget, -(this.cfg.dcMaxA * this.dcVoltage) / 1000, (this.cfg.dcMaxA * this.dcVoltage) / 1000);
      // Reaktif güç
      const qMode = this.settings.get(0x0e04) ?? 0;
      if (qMode === 0) qTarget = this.qSetpoint();
      else if (qMode === 1) {
        const pfRaw = this.settings.get(0x0e1b) ?? 1000;
        const pf = (pfRaw >= 0x8000 ? pfRaw - 0x10000 : pfRaw) / 1000;
        const apf = clamp(Math.abs(pf), 0.3, 1);
        qTarget = Math.sign(pf || 1) * Math.abs(pTarget) * Math.sqrt(1 / (apf * apf) - 1);
      } else {
        const u = this.grid.vLL / this.cfg.ratedV;
        qTarget = this.cfg.ratedKw * interp(u, [0.92, 0.94, 1.06, 1.08], [0.33, 0, 0, -0.33]);
      }
      // Görünür güç sınırı (tercih: S05)
      const sMax = this.maxActiveKw();
      const pref = this.settings.get(0x0e06) ?? 0;
      const s = Math.hypot(pTarget, qTarget);
      if (s > sMax) {
        if (pref === 1) qTarget = Math.sign(qTarget) * Math.sqrt(Math.max(0, sMax * sMax - pTarget * pTarget));
        else if (pref === 2) pTarget = Math.sign(pTarget) * Math.sqrt(Math.max(0, sMax * sMax - qTarget * qTarget));
        else {
          pTarget *= sMax / s;
          qTarget *= sMax / s;
        }
      }
      if (Math.abs(sp - pTarget) > 5) this.derated = this.derated | (this.ambientC > 45 ? 1 : 0);
    }
    // rampa (S11: ×0.01 %Pn/s yorumu → varsayılan 10000 = %100 Pn/s)
    const rateRaw = this.settings.get(0x0e1e) ?? 10000;
    const rate = (clamp(rateRaw, 10, 30000) / 100 / 100) * this.cfg.ratedKw; // kW/s
    this.pAc = ramp(this.pAc, pTarget, dt, rate);
    this.qAc = ramp(this.qAc, qTarget, dt, rate);
    if (this.phase !== "run") {
      this.pAc = 0;
      this.qAc = 0;
    }
    // verim (MPCS-1725 eğrisi, 1300 V)
    const load = Math.abs(this.pAc) / this.cfg.ratedKw;
    const eta = this.pAc >= 0
      ? interp(load, [0, 0.1, 0.2, 0.3, 0.5, 0.75, 1], [0.9, 0.964, 0.9765, 0.9816, 0.9846, 0.9845, 0.9829])
      : interp(load, [0, 0.1, 0.2, 0.3, 0.5, 0.75, 1], [0.9, 0.9625, 0.9761, 0.9813, 0.9839, 0.9836, 0.9822]);
    this.pDc = this.pAc >= 0 ? this.pAc / eta : this.pAc * eta;
    this.dcCurrent = this.dcVoltage > 100 ? (this.pDc * 1000) / this.dcVoltage : 0;
    this.derated = (this.ambientC > 45 ? 1 : 0) | (Math.max(...this.igbt) > 80 ? 1 << 3 : 0) | (this.coolingFail ? 1 << 2 : 0);

    // sayaçlar (AC tarafı)
    const e = (this.pAc * dt) / 3600;
    if (e > 0) {
      this.accDischargeKwh += e;
      this.dailyDischargeKwh += e;
    } else {
      this.accChargeKwh -= e;
      this.dailyChargeKwh -= e;
    }

    // termal (sıvı-hava hibrit)
    const loss = Math.abs(this.pDc - this.pAc); // kW
    const coolK = this.coolingFail ? 0.25 : 1;
    this.coolant = lag(this.coolant, this.ambientC + 3 + loss * 0.15 / coolK, dt, 300);
    for (let i = 0; i < 6; i++) {
      const target = this.coolant + (loss * (1.0 + 0.03 * i)) / coolK;
      this.igbt[i] = lag(this.igbt[i]!, target, dt, 25);
    }
    for (let i = 0; i < 2; i++) this.reactor[i] = lag(this.reactor[i]!, this.ambientC + 12 + loss * 2.0 / coolK, dt, 600);
    this.filterCap = lag(this.filterCap, this.ambientC + 6 + loss * 0.5, dt, 600);
    this.cavity = lag(this.cavity, this.ambientC + 4 + loss * 0.35 / coolK, dt, 900);
  }

  private forcedAny(): boolean {
    return this.forcedFaults.size > 0 || this.estop.local || this.estop.remote || this.estop.bms;
  }
  private gridOk(): boolean {
    return this.grid.vLL >= 621 && this.grid.vLL <= 759 && this.grid.hz >= 47.5 && this.grid.hz <= 51.5;
  }

  private protections(dt: number, dcV: number): void {
    // enjekte arızalar her adımda yeniden uygulanır
    for (const k of this.forcedFaults) {
      const [w, b] = k.split(":").map(Number);
      if (!((this.faults[w! - 1]! >> b!) & 1)) this.raiseFault(w!, b!, "enjeksiyon");
    }
    for (const k of this.forcedAlarms) {
      const [w, b] = k.split(":").map(Number);
      this.raiseAlarm(w!, b!, true);
    }
    this.applyEstopBits();
    const energized = this.acBreakerClosed || this.phase === "run" || this.phase === "standby";
    // Şebeke
    if (energized) {
      if (!this.grid.present || this.grid.vLL < 621) this.raiseFault(3, 0, `Şebeke gerilimi ${this.grid.present ? this.grid.vLL.toFixed(0) : 0} V`);
      else if (this.grid.vLL > 759) this.raiseFault(2, 15, `Şebeke gerilimi ${this.grid.vLL.toFixed(0)} V`);
      if (this.grid.present && this.grid.hz > 51.5) this.raiseFault(3, 1, `Frekans ${this.grid.hz.toFixed(2)} Hz`);
      if (this.grid.present && this.grid.hz < 47.5) this.raiseFault(3, 2, `Frekans ${this.grid.hz.toFixed(2)} Hz`);
    }
    // DC
    if (this.dcBreakerClosed) {
      if (dcV < 1000) this.raiseFault(1, 4, `Batarya gerilimi ${dcV.toFixed(0)} V < 1000 V`);
      if (dcV > 1500) this.raiseFault(1, 3, `Batarya gerilimi ${dcV.toFixed(0)} V > 1500 V`);
    }
    // BMS haberleşmesi (yalnız çalışırken etkili)
    if ((this.phase === "run" || this.phase === "standby") && !this.bmsLinkOk()) this.raiseFault(6, 0, "BMS haberleşme zaman aşımı");
    // BMS durum kelimesi
    const bs = this.bmsWord(0x01);
    this.raiseAlarm(1, 5, (bs & 0b10) !== 0);
    // EMS haberleşmesi
    if (this.emsTimeoutS > 0 && (this.phase === "run") && Date.now() - this.emsLastRequestWall > this.emsTimeoutS * 1000) {
      this.raiseFault(6, 5, `EMS haberleşmesi ${this.emsTimeoutS} s yok`);
    }
    // Sıcaklıklar
    const ig = Math.max(...this.igbt);
    this.raiseAlarm(5, 1, ig > 85);
    if (ig > 95) this.raiseFault(2, 3, `IGBT ${ig.toFixed(1)} °C`);
    const re = Math.max(...this.reactor);
    this.raiseAlarm(5, 3, re > 130);
    if (re > 150) this.raiseFault(5, 2, `Reaktör ${re.toFixed(1)} °C`);
    this.raiseAlarm(4, 2, this.cavity > 60);
    if (this.cavity > 70) this.raiseFault(4, 1, `İç hacim ${this.cavity.toFixed(1)} °C`);
    this.raiseAlarm(4, 11, this.ambientC > 55);
    if (this.ambientC > 60) this.raiseFault(4, 10, `Ortam ${this.ambientC.toFixed(1)} °C`);
    // Kapı (alarm word 7 bit 9)
    this.raiseAlarm(7, 9, this.doorOpen);
    // İzolasyon (alarm word 3 bit 15)
    this.raiseAlarm(3, 15, this.insulationKohm < 100);
    // Cihaz aşırı yük: görünür güç >%115 Pn →
    if (this.apparentKva() > this.cfg.ratedKw * 1.15) this.raiseFault(2, 14, "Aşırı yük");
    void dt;
  }
}
