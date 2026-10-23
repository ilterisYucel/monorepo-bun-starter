// Envicool MC90HDNC1R-L kabin klima modeli — "MC Series Modbus Protocol" (A3) birebir.
// • Yalnız FC03 / FC06 / FC10 (protokol §5.2).
// • Kontrol modu 0x09 = 4 (izleme sıcaklığı) iken kompresör EMS'in yazdığı
//   sunucu (batarya) maks/min sıcaklığına göre çalışır (0x2000 / 0x2001; 32767 = sensör arızası).
// • Uzaktan aç/kapat 0x202: 0x0001 aç, 0x0002 kapat, diğer değerler geçersiz.
// • Kullanılmayan adresler 0xFFFF döner.
// Kapasite/COP değerleri üretici datasheet'i ile teyit edilmeli (VARSAYIM: 9 kW @35/27 °C).

import { clamp, lag } from "../core/util";
import type { EventLog } from "../core/events";
import type { Realism, Timings } from "../core/profile";

export interface HvacConfig {
  id: string;
  coolingKw: number; // anma soğutma kapasitesi (W cinsinden ×1000)
  heaterKw: number;
}

export const HVAC_STATUS = { STANDBY: 1, RUNNING: 2, FAULT: 3 } as const;

export interface HvacInjection {
  compressorFault: boolean;
  indoorFanFail: boolean;
  outdoorFanFail: boolean;
  refrigerantLeak: number; // 0..1 kapasite kaybı
  returnProbeFail: boolean;
  condenserProbeFail: boolean;
  evaporatorProbeFail: boolean;
  ambientProbeFail: boolean;
  humidityProbeFail: boolean;
  acVoltage: number | null; // V (null = 230 nominal)
  powerLoss: boolean; // besleme yok (haberleşme de kesilir)
  dirtyFilter: number; // 0..1 hava debisi kaybı
}

export class Mc90Hvac {
  // ayarlar (×10 ölçek)
  readonly hold = new Map<number, number>([
    [0x07, 1], [0x08, 9600], [0x09, 4], [0x0a, 230], [0x0b, 0], [0x0c, 5], [0x0d, 600], [0x0e, 400],
    [0x0f, 150], [0x10, 0], [0x11, 900], [0x13, 100], [0x1c, 150], [0x1e, 50], [0x21, 1], [0x23, 1],
    [0x200, 0], [0x202, 2], [0x2000, 32767], [0x2001, 32767], [0x2002, 32767], [0x2003, 32767],
    [0x2100, 0], [0x2101, 0], [0x2102, 0], [0x2103, 0], [0x2104, 0],
  ]);
  remoteOn = false;
  serverWriteWall = 0;
  compressor = false;
  heater = false;
  indoorFan = false;
  outdoorFan = false;
  private compOffAt = -1e9;
  private compDemandSince = -1;
  private hpEvents = 0;
  private lowReturnLock = false;
  private lastStartLog = -1e9;
  hpLockout = false;
  // ölçümler
  returnT = 25;
  supplyT = 25;
  evapT = 25;
  condT = 25;
  outdoorT = 25;
  humidity = 45;
  intRpm = 0;
  extRpm = 0;
  /** Son adımda zona verilen ısı (W; soğutma negatif). */
  heatToZone = 0;
  powerW = 0;
  runtimeH = 12000;
  compRuntimeH = 6000;
  fanRuntimeH = 11000;
  compStarts = 4200;
  readonly alarms = new Map<number, boolean>();
  readonly inj: HvacInjection = {
    compressorFault: false, indoorFanFail: false, outdoorFanFail: false, refrigerantLeak: 0,
    returnProbeFail: false, condenserProbeFail: false, evaporatorProbeFail: false, ambientProbeFail: false,
    humidityProbeFail: false, acVoltage: null, powerLoss: false, dirtyFilter: 0,
  };
  private simT = 0;

  constructor(
    readonly cfg: HvacConfig,
    private readonly events: EventLog,
    private readonly realism: () => Realism,
    private readonly tm: () => Timings,
  ) {}

  get acV(): number {
    return this.inj.powerLoss ? 0 : (this.inj.acVoltage ?? 230);
  }
  get status(): number {
    if (!this.remoteOn || this.inj.powerLoss) return HVAC_STATUS.STANDBY;
    if (this.faulted()) return HVAC_STATUS.FAULT;
    return HVAC_STATUS.RUNNING;
  }
  private faulted(): boolean {
    const i = this.inj;
    return i.compressorFault || i.indoorFanFail || i.outdoorFanFail || i.returnProbeFail || this.hpLockout || this.alarm(0x312);
  }
  alarm(addr: number): boolean {
    return this.alarms.get(addr) ?? false;
  }
  private signed(addr: number): number {
    const v = this.hold.get(addr) ?? 0;
    return v >= 0x8000 ? v - 0x10000 : v;
  }
  coolSet(): number {
    return this.signed(0x0a) / 10;
  }
  heatSet(): number {
    return this.signed(0x1c) / 10;
  }
  serverTemps(): { max: number; min: number; valid: boolean; fresh: boolean } {
    const mx = this.signed(0x2000);
    const mn = this.signed(0x2001);
    const valid = mx !== 32767 && mn !== 32767;
    const fresh = this.serverWriteWall > 0 && Date.now() - this.serverWriteWall < this.tm().hvacServerTempTimeout * 1000;
    return { max: mx / 10, min: mn / 10, valid, fresh };
  }

  // ───────────────────────── yazım (doğrulamalı) ─────────────────────────

  /** @returns 0 ok, 3 geçersiz değer, 2 geçersiz adres */
  write(addr: number, raw: number): number {
    const r = this.realism();
    const v = raw >= 0x8000 ? raw - 0x10000 : raw;
    const bad = (why: string, real: string): number => {
      this.events.compatWarn(this.cfg.id, `w${addr.toString(16)}`, why, real);
      return r.rejectInvalidValues ? 3 : -1;
    };
    switch (addr) {
      case 0x202:
        if (raw === 1) this.setOn(true);
        else if (raw === 2) this.setOn(false);
        else {
          const res = bad(`Remote On/Off'a ${raw} yazıldı`, "MC90: 0x0001 aç, 0x0002 kapat; diğer değerler geçersiz (komut uygulanmaz)");
          if (res === 3) return 3;
          if (raw === 0) this.setOn(false); // uyumlu profil: EMS'in 0=kapat varsayımını kabul et
        }
        this.hold.set(addr, raw);
        return 0;
      case 0x0a: {
        let c = v;
        if (c < 70 || c > 500) { const x = bad(`Soğutma setpoint'i ${v / 10} °C yazıldı (geçerli 7.0–50.0)`, "MC90 değeri reddeder, eski setpoint kalır"); if (x === 3) return 3; c = clamp(c, 70, 500); }
        if (c <= this.signed(0x1c)) { const x = bad(`Soğutma setpoint'i (${c / 10}) ısıtma setpoint'inden (${this.heatSet()}) büyük değil`, "MC90: soğutma > ısıtma şartı — reddeder"); if (x === 3) return 3; c = this.signed(0x1c) + 10; }
        this.hold.set(addr, (c + 0x10000) & 0xffff);
        return 0;
      }
      case 0x1c: {
        let h = v;
        if (h < -400 || h > 350) { const x = bad(`Isıtma setpoint'i ${v / 10} °C yazıldı (geçerli −40.0–35.0)`, "MC90 değeri reddeder, eski setpoint kalır"); if (x === 3) return 3; h = clamp(h, -400, 350); }
        if (h >= this.signed(0x0a)) { const x = bad(`Isıtma setpoint'i (${h / 10}) soğutma setpoint'inden (${this.coolSet()}) küçük değil`, "MC90: ısıtma < soğutma şartı — reddeder"); if (x === 3) return 3; h = this.signed(0x0a) - 10; }
        this.hold.set(addr, (h + 0x10000) & 0xffff);
        return 0;
      }
      case 0x0c:
        if (v < 1 || v > 15) { const x = bad(`Soğutma hassasiyeti ${v} (1–15)`, "reddeder"); if (x === 3) return 3; }
        break;
      case 0x09:
        if (v < 0 || v > 4) { const x = bad(`Kontrol modu ${v}`, "0–4 dışı reddeder"); if (x === 3) return 3; }
        break;
      case 0x2000:
      case 0x2001:
        this.serverWriteWall = Date.now();
        break;
      case 0x2101:
      case 0x2102:
      case 0x2103:
      case 0x2104:
        if (raw === 1)
          this.events.compatWarn(this.cfg.id, "forcedMode", `EMS zorunlu mod yazıyor (0x${addr.toString(16)}=1, ör. force_cool)`, "MC Series A3 §7.3: MC90HDNC1R-L'de 0x2101–0x2104 'not involving' — yazım kabul edilir ama klima davranışı değişmez; soğutma setpoint/kontrol modu ile yönetilmeli");
        break;
      case 0x200:
        if (raw === 1) {
          this.events.push("cmd", this.cfg.id, "Reset (fabrika parametreleri) — ayarlar varsayılana döndü");
          for (const [k, d] of [[0x0a, 230], [0x0c, 5], [0x1c, 150], [0x1e, 50], [0x0e, 400], [0x10, 0], [0x09, 0]] as const) this.hold.set(k, d);
          this.hpLockout = false;
          this.hpEvents = 0;
          if (this.realism().profile === "uyumlu") this.hold.set(0x09, 4);
          else this.events.push("warn", this.cfg.id, "Fabrika ayarı kontrol modu 0 (dönüş havası) — batarya sıcaklığı kontrolü için 0x09=4 yeniden yazılmalı");
        }
        return 0;
      default:
        if (!this.hold.has(addr)) {
          this.events.compatWarn(this.cfg.id, `wUnknown${addr}`, `Tanımsız holding adresine yazım (0x${addr.toString(16)})`, "Illegal Data Address (0x02)");
          return r.rejectInvalidValues ? 2 : 0;
        }
    }
    this.hold.set(addr, raw & 0xffff);
    return 0;
  }

  private setOn(on: boolean): void {
    if (on !== this.remoteOn) this.events.push("cmd", this.cfg.id, on ? "Uzaktan AÇ" : "Uzaktan KAPAT");
    this.remoteOn = on;
    if (!on) {
      if (this.compressor) this.compOffAt = this.simT;
      this.compressor = false;
      this.heater = false;
    }
  }

  // ───────────────────────── zaman adımı ─────────────────────────

  /**
   * @param zoneT zon (kabin) hava sıcaklığı — dönüş havası
   * @param outdoorT dış ortam
   */
  step(dt: number, simT: number, zoneT: number, outdoorT: number): void {
    this.simT = simT;
    const tm = this.tm();
    this.outdoorT = outdoorT;
    this.returnT = zoneT;
    const on = this.remoteOn && !this.inj.powerLoss && this.acV > 160;
    const st = this.serverTemps();
    const mode = this.signed(0x09);
    let ctrlMax = zoneT;
    let ctrlMin = zoneT;
    if (mode === 4) {
      if (st.valid && st.fresh) {
        ctrlMax = st.max;
        ctrlMin = st.min;
      } else if (on) {
        this.events.compatWarn(this.cfg.id, "noServerTemp", "Kontrol modu 4 (batarya sıcaklığı) ama EMS 0x2000/0x2001'e güncel değer yazmıyor", "Klima geçerli maks/min sıcaklık olmadan batarya sıcaklığına göre kontrol edemez (dönüş havasına düşer)");
      }
    }
    // MC Series A3 §7.3: 0x2101–0x2104 MC90HDNC1R-L'de "not involving" (desteklenmez) —
    // gerçek profilde zorunlu modların etkisi yok; uyumlu profil EMS'in force_cool varsayımını uygular.
    const forced = (this.hold.get(0x2100) ?? 0) === 1 && this.realism().profile !== "gercek";
    const fCool = forced && (this.hold.get(0x2101) ?? 0) === 1;
    const fFan = forced && (this.hold.get(0x2102) ?? 0) === 1;
    const fStby = forced && (this.hold.get(0x2103) ?? 0) === 1;
    const fHeat = forced && (this.hold.get(0x2104) ?? 0) === 1;

    // İç fan
    this.indoorFan = on && !this.inj.indoorFanFail && !fStby;
    // Kompresör talebi (histerezis: start ≥ set + hassasiyet, stop ≤ set)
    const sens = this.signed(0x0c) / 10;
    let demand = this.compressor ? ctrlMax > this.coolSet() : ctrlMax >= this.coolSet() + sens;
    if (fCool) demand = true;
    if (fFan || fStby || fHeat) demand = false;
    // Koruma (VARSAYIM — MC serisi tipik): dönüş havası soğutma setpoint'inin 8 K altına
    // inerse veya evaporatör donma sınırındaysa kompresör durur (aşırı soğutma/yoğuşma önleme).
    if (zoneT < this.coolSet() - 8 || this.evapT < -1) this.lowReturnLock = true;
    else if (zoneT > this.coolSet() - 6 && this.evapT > 2) this.lowReturnLock = false;
    const lowReturn = this.lowReturnLock;
    const canRun = !lowReturn && on && !this.inj.compressorFault && !this.hpLockout && !this.alarm(0x312) && this.indoorFan && !(this.inj.returnProbeFail && mode !== 4);
    if (demand && canRun) {
      if (this.compDemandSince < 0) this.compDemandSince = simT;
      const delayOk = simT - this.compDemandSince >= tm.hvacCompressorStartDelay && simT - this.compOffAt >= tm.hvacCompressorMinOff;
      if (!this.compressor && delayOk) {
        this.compressor = true;
        this.compStarts++;
        if (simT - this.lastStartLog > 1800) {
          this.events.push("info", this.cfg.id, `Kompresör devreye girdi (kontrol ${ctrlMax.toFixed(1)} °C ≥ ${(this.coolSet() + sens).toFixed(1)} °C)`);
          this.lastStartLog = simT;
        }
      }
    } else {
      this.compDemandSince = -1;
      if (this.compressor) {
        this.compressor = false;
        this.compOffAt = simT;
      }
    }
    // Isıtıcı
    const hs = this.signed(0x1e) / 10;
    let hDemand = this.heater ? ctrlMin < this.heatSet() : ctrlMin <= this.heatSet() - hs;
    if (fHeat) hDemand = true;
    if (fCool || fFan || fStby) hDemand = false;
    this.heater = on && this.indoorFan && hDemand;
    this.outdoorFan = this.compressor && !this.inj.outdoorFanFail;

    // Termodinamik
    const airflow = this.indoorFan ? 1.0 - 0.6 * this.inj.dirtyFilter : 0;
    let qCool = 0;
    if (this.compressor) {
      const kOut = clamp(1 - 0.012 * (outdoorT - 35), 0.4, 1.25);
      const kRet = clamp(1 + 0.025 * (zoneT - 27), 0.6, 1.3);
      const kCond = this.outdoorFan ? 1 : 0.35;
      qCool = this.cfg.coolingKw * 1000 * kOut * kRet * kCond * (1 - this.inj.refrigerantLeak) * (0.4 + 0.6 * airflow);
    }
    const qHeat = this.heater ? this.cfg.heaterKw * 1000 : 0;
    const fanHeat = this.indoorFan ? 180 : 0;
    this.heatToZone = -qCool + qHeat + fanHeat;
    const mcp = 1085 * Math.max(0.15, airflow);
    this.supplyT = lag(this.supplyT, this.indoorFan ? zoneT + (-qCool + qHeat) / mcp : zoneT, dt, 20);
    this.evapT = lag(this.evapT, this.compressor ? this.supplyT - 4 - 6 * this.inj.refrigerantLeak : zoneT, dt, 30);
    const condTarget = this.compressor ? outdoorT + (this.outdoorFan ? 12 : 32) : outdoorT;
    this.condT = lag(this.condT, condTarget, dt, 40);
    this.intRpm = this.indoorFan ? Math.round((this.compressor || this.heater ? 1800 : 950) * (1 - 0.15 * this.inj.dirtyFilter)) : 0;
    this.extRpm = this.outdoorFan ? Math.round(clamp(600 + 25 * (outdoorT - 15), 600, 1500)) : 0;
    const cop = clamp(3.6 - 0.045 * (outdoorT - 25), 1.6, 4.5);
    this.powerW = (this.compressor ? qCool / cop : 0) + qHeat + (this.indoorFan ? 220 : 0) + (this.outdoorFan ? 160 : 0) + (on ? 15 : 3);
    this.humidity = lag(this.humidity, this.compressor ? 38 : 50, dt, 900);

    // Sayaçlar
    if (on) this.runtimeH += dt / 3600;
    if (this.compressor) this.compRuntimeH += dt / 3600;
    if (this.indoorFan) this.fanRuntimeH += dt / 3600;

    // Alarmlar (MC Series §7.3)
    const highP = this.compressor && this.condT > 65;
    if (highP && !this.alarm(0x305)) {
      this.hpEvents++;
      this.events.push("alarm", this.cfg.id, `Yüksek basınç (kondenser ${this.condT.toFixed(1)} °C)`);
      if (this.hpEvents >= 3) {
        this.hpLockout = true;
        this.events.push("fault", this.cfg.id, "Sık yüksek basınç — kompresör kilitlendi (reset gerekir)");
      }
      this.compressor = false;
      this.compOffAt = simT;
    }
    const highAlarmSet = this.signed(0x0e) / 10;
    const lowAlarmSet = this.signed(0x10) / 10;
    const a = this.alarms;
    a.set(0x300, on && zoneT > highAlarmSet);
    a.set(0x301, on && this.inj.indoorFanFail);
    a.set(0x302, on && this.inj.outdoorFanFail);
    a.set(0x303, on && this.inj.compressorFault);
    a.set(0x304, this.inj.returnProbeFail);
    a.set(0x305, highP);
    a.set(0x306, on && zoneT < lowAlarmSet);
    a.set(0x309, this.acV > 253);
    a.set(0x30a, this.acV > 0 && this.acV < 187);
    a.set(0x30b, this.inj.powerLoss);
    a.set(0x30c, this.inj.evaporatorProbeFail);
    a.set(0x30d, this.inj.condenserProbeFail);
    a.set(0x30e, this.inj.ambientProbeFail);
    a.set(0x30f, this.compressor && this.evapT < -1);
    a.set(0x310, this.hpLockout);
    a.set(0x312, this.inj.refrigerantLeak > 0.7 && this.compressor);
    a.set(0x313, false);
    a.set(0x31c, this.humidity > (this.signed(0x11) / 10));
    a.set(0x31e, this.inj.humidityProbeFail);
    a.set(0x325, false);
    a.set(0x326, false);
    a.set(0x327, false);
  }

  /** FC03 okuma — adres → ham değer (0xFFFF = kullanılmıyor). */
  read(addr: number): number {
    const T = (v: number, fail = false): number => (fail ? 0xffff : (Math.round(v * 10) + 0x10000) & 0xffff);
    const st = (b: boolean, fault = false): number => (fault ? 3 : b ? 2 : 1);
    switch (addr) {
      case 0x1000: return this.status;
      case 0x1001: return this.heater ? 1 : 0;
      case 0x1002: return st(this.indoorFan, this.inj.indoorFanFail);
      case 0x1003: return T(this.supplyT);
      case 0x1004: return st(this.outdoorFan, this.inj.outdoorFanFail);
      case 0x1005: return T(this.humidity, this.inj.humidityProbeFail);
      case 0x1006: return st(this.compressor, this.inj.compressorFault || this.hpLockout);
      case 0x1008: return T(this.returnT, this.inj.returnProbeFail);
      case 0x100c: return T(this.outdoorT, this.inj.ambientProbeFail);
      case 0x100e: return T(this.condT, this.inj.condenserProbeFail);
      case 0x1010: return T(this.evapT, this.inj.evaporatorProbeFail);
      case 0x1012: return this.intRpm;
      case 0x1014: return this.extRpm;
      case 0x1016: return Math.round(this.acV * 10);
      case 0x101c: return (Math.floor(this.runtimeH) >>> 16) & 0xffff;
      case 0x101d: return Math.floor(this.runtimeH) & 0xffff;
      case 0x1020: return (Math.floor(this.compRuntimeH) >>> 16) & 0xffff;
      case 0x1021: return Math.floor(this.compRuntimeH) & 0xffff;
      case 0x1024: return (Math.floor(this.fanRuntimeH) >>> 16) & 0xffff;
      case 0x1025: return Math.floor(this.fanRuntimeH) & 0xffff;
      case 0x1028: return (this.compStarts >>> 16) & 0xffff;
      case 0x1029: return this.compStarts & 0xffff;
      default:
        break;
    }
    if (addr >= 0x300 && addr <= 0x327) {
      if (this.alarms.has(addr)) return this.alarms.get(addr) ? 1 : 0;
      if ((addr >= 0x316 && addr <= 0x31b) || addr === 0x31d || (addr >= 0x31f && addr <= 0x324)) return 0x00ff;
      return 0xffff;
    }
    if (this.hold.has(addr)) {
      if (addr === 0x202) return this.remoteOn ? 1 : 2;
      return this.hold.get(addr)!;
    }
    return 0xffff;
  }
}
