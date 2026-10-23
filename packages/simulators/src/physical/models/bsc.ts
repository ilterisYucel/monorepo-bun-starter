// LGES Flex BSC (Battery Section Controller) modeli — JF1 raf sistemi.
// Kaynaklar: Flex BSC Modbus Map Rev AF (Common, C2B, Sequence, Request Ack. Table),
// Flex BSC SW User Manual Rev AH (durum geçişleri), Diagnosis v1.1.0 (bölüm teşhisleri).
//
// Önemli: BSC'ye güç komutu YOKTUR (Rev AF'te 0x000B kaldırıldı). Güç PCS'den gelir;
// BSC yalnız izler, kontaktörleri yönetir ve şarj/deşarj güç limitlerini yayınlar.

import { clamp } from "../core/util";
import type { EventLog } from "../core/events";
import type { Realism, Timings } from "../core/profile";
import { Rack, type RackLimits } from "./battery/rack";
import { DiagEngine, type DiagDef } from "./battery/diagnostics";

export const BSC_STATE = { NONE: 0, NOT_INITIALIZED: 1, INITIALIZING: 2, NORMAL: 3, NPS: 4, MANUAL: 5, EMERGENCY: 6 } as const;
export const COMMAND = { NONE: 0, EMERGENCY: 1, START: 2, STOP: 3, OPEN_ALL: 4, CLOSE: 5, ENTER_MANUAL: 6, EXIT_MANUAL: 7, EVENT_CLEAR: 9, RESET: 10 } as const;
export const ACK = {
  NONE: 0, IN_PROGRESS: 1, DONE: 2, BMS_NOT_CONNECTED: 5, BMS_ALREADY_CONNECTED: 6, UNDER_INITIALIZING: 7,
  CONTACTORS_ALREADY_OPEN: 8, ALREADY_ONLINE: 9, CURRENT_FLOWS: 0x0a, MANUAL_MODE: 0x0b, EMERGENCY_MODE: 0x0c,
  NPS_MODE: 0x0d, NORMAL_MODE: 0x0e, WARNING_FAULT: 0x0f, UNDER_CONTACTOR_CONTROL: 0x10, OVER_VOLTAGE_DEVIATION: 0x11,
  WITHIN_COOLDOWN: 0x12, TARGET_RACK_NOT_EXIST: 0x13, INVALID_REQUEST: 0x30, INVALID_ARGUMENT: 0x31,
} as const;

export const STATE_NAME: Record<number, string> = { 0: "None", 1: "Not Initialized", 2: "Initializing", 3: "Normal", 4: "NPS", 5: "Manual", 6: "Emergency" };
export const ACK_NAME: Record<number, string> = Object.fromEntries(Object.entries(ACK).map(([k, v]) => [v, k]));
export const CMD_NAME: Record<number, string> = Object.fromEntries(Object.entries(COMMAND).map(([k, v]) => [v, k]));

export interface BscConfig {
  id: string;
  rackCount: number;
  seed: number;
  initialSoc: number;
  initialTemp: number;
  /** Kontaktör kapatmada raflar arası izin verilen gerilim sapması (V) — varsayım. */
  closeDeviationV: number;
}

interface SectionCtx {
  b: Bsc;
}

/** Komut işleme durumu. */
interface Pending {
  cmd: number;
  t: number;
  targets?: Rack[];
  idx?: number;
}

export class Bsc {
  readonly racks: Rack[] = [];
  state: number = BSC_STATE.NOT_INITIALIZED;
  ack: number = ACK.NONE;
  lastAccepted = 0;
  private ackDoneAtWall = 0;
  private pending: Pending | null = null;
  private lastEventClearWall = -1e12;
  /** Controller (EMS) holding register'ları 40000–40200. */
  readonly holding = new Map<number, number>();
  lastHbValue = -1;
  lastHbChangeWall = 0;
  hbEverWritten = false;
  heartbeatWall0 = Date.now();
  /** Bölüm akımı (A, + şarj) ve bara gerilimi. */
  sectionCurrent = 0;
  busVoltage = 0;
  private idleForNps = 0;
  readonly diag: DiagEngine<SectionCtx>;
  /** Bölüm limit sonuçları (son hesap). */
  limits = { chargeKw: 0, dischargeKw: 0, spc: false, vpc: false, preVpc: false, tpc: false };
  /** Konsol: NPS etkin mi (saha NV ayarı). */
  npsEnabled = false;
  /** Konsol enjeksiyonu: BSC yazılımı donmuş (heartbeat durur). */
  frozen = false;
  /** Konsol: SLF (log hatası). */
  slf = false;

  constructor(
    readonly cfg: BscConfig,
    private readonly events: EventLog,
    private readonly realism: () => Realism,
    private readonly tm: () => Timings,
  ) {
    for (let i = 1; i <= cfg.rackCount; i++) {
      this.racks.push(
        new Rack(cfg.id, i, cfg.seed * 100 + i, cfg.initialSoc + (i - 4.5) * 0.4, cfg.initialTemp, (r, code, name, level, active) => {
          const lv = level === "warning" ? "warn" : level === "alarm" ? "alarm" : "fault";
          this.events.push(active ? lv : "info", `${cfg.id}/R${r.id}`, `${active ? "▲" : "▼"} ${code} ${name}`);
        }),
      );
    }
    this.diag = new DiagEngine<SectionCtx>(sectionDiagDefs(), (d, active) => {
      const lv = d.level === "warning" ? "warn" : d.level === "alarm" ? "alarm" : "fault";
      this.events.push(active ? lv : "info", cfg.id, `${active ? "▲" : "▼"} ${d.code} ${d.name}`);
      if (active && d.action === "emergency") this.enterEmergency(`${d.code} teşhisi`);
    });
  }

  // ───────────────────────── sorgular ─────────────────────────

  get online(): Rack[] {
    return this.racks.filter((r) => r.online);
  }
  get commUp(): boolean {
    return this.state !== BSC_STATE.NOT_INITIALIZED && this.state !== BSC_STATE.NONE;
  }
  /** "Current Flows" kriteri: |I| > 0.5 A × online raf (Rev AF). */
  currentFlows(): boolean {
    const n = Math.max(1, this.online.length);
    return Math.abs(this.sectionCurrent) > 0.5 * n;
  }
  chargeStatusBits(): number {
    const n = this.online.length;
    if (n === 0) return 0b00;
    if (this.sectionCurrent > 0.5 * n) return 0b01;
    if (this.sectionCurrent < -0.5 * n) return 0b10;
    return 0b11;
  }
  soc(): number {
    const on = this.online;
    if (on.length === 0) return 0;
    return on.reduce((s, r) => s + r.reportedSoc(), 0) / on.length;
  }
  soh(): number {
    const on = this.online;
    if (on.length === 0) return 0;
    return on.reduce((s, r) => s + r.soh, 0) / on.length;
  }
  dcVoltage(): number {
    const on = this.online;
    if (on.length === 0) return 0;
    return on.reduce((s, r) => s + r.cellSum(), 0) / on.length;
  }
  anticipatedVoltage(): number {
    if (this.online.length > 0 || !this.commUp) return 0;
    const avail = this.racks.filter((r) => r.rbmsUp && !r.disabled);
    if (avail.length === 0) return 0;
    return avail.reduce((s, r) => s + r.ocvSum(), 0) / avail.length;
  }
  heartbeat(): number {
    if (this.frozen) return Math.floor((this.frozenAt - this.heartbeatWall0) / 1000) % 65536;
    return Math.floor((Date.now() - this.heartbeatWall0) / 1000) % 65536;
  }
  private frozenAt = Date.now();
  setFrozen(v: boolean): void {
    if (v && !this.frozen) this.frozenAt = Date.now();
    this.frozen = v;
  }
  /** Bölüm/raf seviyesi uyarı/arıza var mı (BSC Information b0..b2). */
  infoBits(): { alarm: boolean; warning: boolean; fault: boolean } {
    // Rev AF: BSC Information b0..b2 bölüm (section) seviyesi teşhislerdir; raf teşhisleri
    // rack flag (DI) ve raf diag register'larında görünür.
    const lv = (l: string[]): boolean => this.diag.anyLevel(l as never);
    return { alarm: lv(["alarm"]), warning: lv(["warning"]), fault: lv(["fault1", "fault2"]) };
  }
  sectionWarnFault(): boolean {
    return this.diag.anyLevel(["warning", "fault1", "fault2"]);
  }
  hbLocSeconds(): number {
    if (!this.realism().bscHeartbeatCheck || !this.commUp) return 0;
    return (Date.now() - this.lastHbChangeWall) / 1000;
  }

  // ───────────────────────── EMS yazımları ─────────────────────────

  writeHolding(addr: number, value: number): void {
    this.holding.set(addr, value & 0xffff);
    if (addr === 40000) {
      if (value !== this.lastHbValue) {
        this.lastHbValue = value;
        this.lastHbChangeWall = Date.now();
        this.hbEverWritten = true;
      }
      return;
    }
    if (addr === 40010) this.command(value & 0xffff);
    if (addr === 40030 || addr === 40031) {
      this.events.compatWarn(
        this.cfg.id,
        "setpoint4003x",
        `EMS ${addr} (Charge/Discharge Power Setpoint) yazıyor`,
        "Rev AF haritasında 40030/40031 yok (C2B 40028'de biter); BSC güç komutu almaz — yazım etkisiz/0x02",
      );
    }
  }

  private accept(cmd: number): void {
    this.ack = ACK.IN_PROGRESS;
    this.lastAccepted = cmd;
    this.ackDoneAtWall = 0;
  }
  private reject(code: number, cmd: number): void {
    this.ack = code;
    this.lastAccepted = 0;
    this.ackDoneAtWall = Date.now();
    this.pending = null;
    this.events.push("warn", this.cfg.id, `Komut ${CMD_NAME[cmd] ?? cmd} reddedildi → ${ACK_NAME[code] ?? code}`);
  }
  private done(): void {
    this.ack = ACK.DONE;
    this.ackDoneAtWall = Date.now();
    this.pending = null;
  }

  command(cmd: number): void {
    if (cmd === COMMAND.NONE) return;
    if (this.frozen) return;
    this.events.push("cmd", this.cfg.id, `Komut: ${CMD_NAME[cmd] ?? `0x${cmd.toString(16)}`}`);
    const s = this.state;
    const S = BSC_STATE;
    if (this.pending && cmd !== COMMAND.EMERGENCY) {
      if (this.pending.cmd === COMMAND.CLOSE || this.pending.cmd === COMMAND.OPEN_ALL) return this.reject(ACK.UNDER_CONTACTOR_CONTROL, cmd);
      // Kullanım kılavuzu RevAH geçiş #2: Initializing'de Stop kabul edilir → Not Connected.
      if (this.pending.cmd === COMMAND.START && cmd !== COMMAND.STOP) return this.reject(ACK.UNDER_INITIALIZING, cmd);
    }
    switch (cmd) {
      case COMMAND.EMERGENCY:
        if (s === S.NOT_INITIALIZED) return this.reject(ACK.BMS_NOT_CONNECTED, cmd);
        if (s === S.EMERGENCY) return this.reject(ACK.EMERGENCY_MODE, cmd);
        this.accept(cmd);
        this.enterEmergency("EMS Emergency komutu");
        this.done();
        return;
      case COMMAND.START: {
        if (s !== S.NOT_INITIALIZED) return this.reject(ACK.BMS_ALREADY_CONNECTED, cmd);
        const disabled = this.disabledMask();
        this.racks.forEach((r, i) => (r.disabled = disabled[i] ?? false));
        if (this.racks.every((r) => r.disabled)) return this.reject(ACK.TARGET_RACK_NOT_EXIST, cmd);
        this.accept(cmd);
        this.state = S.INITIALIZING;
        this.pending = { cmd, t: 0 };
        this.lastHbChangeWall = Date.now();
        this.events.push("info", this.cfg.id, "Durum → Initializing");
        return;
      }
      case COMMAND.STOP:
        if (s === S.NOT_INITIALIZED) return this.reject(ACK.BMS_NOT_CONNECTED, cmd);
        if (s !== S.EMERGENCY && this.currentFlows()) return this.reject(ACK.CURRENT_FLOWS, cmd);
        this.accept(cmd);
        this.pending = null;
        for (const r of this.racks) r.resetRbms();
        this.state = S.NOT_INITIALIZED;
        this.events.push("info", this.cfg.id, "Durum → Not Initialized (Stop)");
        this.done();
        return;
      case COMMAND.OPEN_ALL:
        if (s === S.NOT_INITIALIZED) return this.reject(ACK.BMS_NOT_CONNECTED, cmd);
        if (this.currentFlows()) return this.reject(ACK.CURRENT_FLOWS, cmd);
        if (this.online.length === 0) return this.reject(ACK.CONTACTORS_ALREADY_OPEN, cmd);
        this.accept(cmd);
        for (const r of this.racks) r.requestOpen();
        this.pending = { cmd, t: 0 };
        return;
      case COMMAND.CLOSE: {
        if (s === S.NOT_INITIALIZED) return this.reject(ACK.BMS_NOT_CONNECTED, cmd);
        if (s === S.INITIALIZING) return this.reject(ACK.UNDER_INITIALIZING, cmd);
        if (s === S.EMERGENCY) return this.reject(ACK.EMERGENCY_MODE, cmd);
        if (this.sectionWarnFault()) return this.reject(ACK.WARNING_FAULT, cmd);
        if (this.online.length > 0) return this.reject(ACK.ALREADY_ONLINE, cmd);
        let cands = this.racks.filter((r) => r.rbmsUp && !r.disabled && r.state >= 0x09 && !r.diag.hasAction("open") && !r.diag.anyLevel(["fault1", "fault2"]));
        if (s === S.MANUAL) {
          const sel = this.manualMask();
          cands = cands.filter((r) => sel[r.id - 1]);
          if (cands.length === 0) return this.reject(ACK.TARGET_RACK_NOT_EXIST, cmd);
        }
        if (cands.length === 0) return this.reject(ACK.TARGET_RACK_NOT_EXIST, cmd);
        // Referans gerilim: çoğunluk kümesinin medyanı
        const vs = cands.map((r) => r.ocvSum()).sort((a, b) => a - b);
        const ref = vs[Math.floor(vs.length / 2)]!;
        const dev = this.cfg.closeDeviationV;
        const targets = cands.filter((r) => Math.abs(r.ocvSum() - ref) <= dev);
        if (s === S.MANUAL && targets.length < cands.length) return this.reject(ACK.OVER_VOLTAGE_DEVIATION, cmd);
        if (targets.length === 0) return this.reject(ACK.OVER_VOLTAGE_DEVIATION, cmd);
        const left = cands.length - targets.length;
        if (left > 0) this.events.push("warn", this.cfg.id, `${left} raf gerilim sapması nedeniyle kapatılmadı (ref ${ref.toFixed(1)} V, ±${dev} V)`);
        this.accept(cmd);
        if (s === S.NPS) this.state = S.NORMAL;
        this.pending = { cmd, t: 0, targets, idx: 0 };
        return;
      }
      case COMMAND.ENTER_MANUAL:
        if (s === S.NOT_INITIALIZED) return this.reject(ACK.BMS_NOT_CONNECTED, cmd);
        if (s === S.MANUAL) return this.reject(ACK.MANUAL_MODE, cmd);
        if (s === S.EMERGENCY) return this.reject(ACK.EMERGENCY_MODE, cmd);
        if (this.currentFlows()) return this.reject(ACK.CURRENT_FLOWS, cmd);
        this.accept(cmd);
        for (const r of this.racks) r.requestOpen();
        this.state = S.MANUAL;
        this.events.push("info", this.cfg.id, "Durum → Manual");
        this.done();
        return;
      case COMMAND.EXIT_MANUAL:
        if (s === S.NOT_INITIALIZED) return this.reject(ACK.BMS_NOT_CONNECTED, cmd);
        if (s === S.NORMAL) return this.reject(ACK.NORMAL_MODE, cmd);
        if (s === S.NPS) return this.reject(ACK.NPS_MODE, cmd);
        if (s === S.EMERGENCY) return this.reject(ACK.EMERGENCY_MODE, cmd);
        if (this.currentFlows()) return this.reject(ACK.CURRENT_FLOWS, cmd);
        this.accept(cmd);
        for (const r of this.racks) r.requestOpen();
        this.state = S.NORMAL;
        this.events.push("info", this.cfg.id, "Durum → Normal (Exit Manual)");
        this.done();
        return;
      case COMMAND.EVENT_CLEAR: {
        if (Date.now() - this.lastEventClearWall < 30_000) return this.reject(ACK.WITHIN_COOLDOWN, cmd);
        this.accept(cmd);
        this.lastEventClearWall = Date.now();
        let n = this.diag.clear("eventclear");
        for (const r of this.racks) n += r.diag.clear("eventclear");
        this.events.push("info", this.cfg.id, `Event Clear — ${n} teşhis temizlendi (CER/PDVF yalnız LGES)`);
        this.done();
        return;
      }
      case COMMAND.RESET:
        if ((s === S.NORMAL || s === S.NPS || s === S.MANUAL) && this.currentFlows()) return this.reject(ACK.CURRENT_FLOWS, cmd);
        this.accept(cmd);
        this.diag.clear("reset");
        for (const r of this.racks) {
          r.diag.clear("reset");
          r.resetRbms();
        }
        this.state = S.NOT_INITIALIZED;
        this.events.push("info", this.cfg.id, "Reset — BSC/RBMS yeniden başlatıldı → Not Initialized");
        this.done();
        return;
      default:
        if (cmd === 0x0b) {
          this.events.compatWarn(this.cfg.id, "cmd0x0B", "EMS 0x000B (Discharge) komutu yazıyor", "Rev AF'te 0x000B kaldırıldı → Invalid Request (0x30)");
        }
        return this.reject(ACK.INVALID_REQUEST, cmd);
    }
  }

  private enterEmergency(reason: string): void {
    this.state = BSC_STATE.EMERGENCY;
    this.pending = null;
    for (const r of this.racks) r.forceOpenNow();
    this.events.push("fault", this.cfg.id, `Durum → Emergency (${reason}) — tüm kontaktörler açıldı`);
  }

  private disabledMask(): boolean[] {
    const out: boolean[] = [];
    for (let i = 0; i < this.racks.length; i++) {
      const w = this.holding.get(40020 + Math.floor(i / 16)) ?? 0;
      out.push(((w >> i % 16) & 1) === 1);
    }
    return out;
  }
  private manualMask(): boolean[] {
    const out: boolean[] = [];
    for (let i = 0; i < this.racks.length; i++) {
      const w = this.holding.get(40011 + Math.floor(i / 16)) ?? 0;
      out.push(((w >> i % 16) & 1) === 1);
    }
    return out;
  }

  // ───────────────────────── zaman adımı ─────────────────────────

  /**
   * @param dcCurrentReq PCS'nin DC tarafına çektiği/verdiği akım (A, + = bataryayı şarj)
   *        — bara çözümü bunu online raflara paylaştırır.
   */
  step(dt: number, simT: number, dcCurrentReq: number): void {
    const S = BSC_STATE;
    const tm = this.tm();
    // Ack yaşam döngüsü: Done → 3 s sonra None
    if (this.ack !== ACK.NONE && this.ack !== ACK.IN_PROGRESS && this.ackDoneAtWall > 0 && Date.now() - this.ackDoneAtWall > tm.ackDoneToNone * 1000) {
      this.ack = ACK.NONE;
      this.lastAccepted = 0;
      this.ackDoneAtWall = 0;
    }

    // Bekleyen komutlar
    const p = this.pending;
    if (p) {
      p.t += dt;
      if (p.cmd === COMMAND.START) {
        // Rev AF Sequence: Start → In Progress → (BSC State: Initializing) → Done.
        // Ack, durum Initializing'e geçtikten sonraki ilk döngüde Done olur; raf
        // başlatması arka planda sürer (Done ≠ Normal — EMS 30036'yı izlemeli).
        if (this.ack === ACK.IN_PROGRESS && p.t >= 1) {
          this.ack = ACK.DONE;
          this.ackDoneAtWall = Date.now();
        }
        const active = this.racks.filter((r) => !r.disabled);
        const ready = active.filter((r) => r.state === 0x09);
        if (ready.length === active.length || p.t > 30) {
          if (ready.length === 0) {
            this.state = S.NOT_INITIALIZED;
            this.pending = null;
            this.ack = ACK.NONE;
            this.events.push("fault", this.cfg.id, "Başlatma 30 s zaman aşımı — hiçbir raf Normal olmadı → Not Initialized");
          } else {
            this.state = S.NORMAL;
            this.events.push("info", this.cfg.id, `Durum → Normal (${ready.length}/${active.length} raf hazır, kontaktörler açık — Close komutu bekleniyor)`);
            this.pending = null;
          }
        }
      } else if (p.cmd === COMMAND.CLOSE && p.targets) {
        // raflar sırayla: her biri bir önceki kapandıktan sonra
        // önceki raf kapanınca sıradakine geç (aynı adımda birden fazla ilerleyebilir)
        for (let guard = 0; guard < p.targets.length; guard++) {
          const cur = p.targets[p.idx ?? 0];
          if (!cur) break;
          if (cur.dcLineClosed) {
            p.idx = (p.idx ?? 0) + 1;
            continue;
          }
          if (!cur.closing) cur.requestClose();
          break;
        }
        const timeout = (p.targets.length * 400 + 5000) / 1000;
        if ((p.idx ?? 0) >= p.targets.length) {
          this.events.push("info", this.cfg.id, `${p.targets.length} raf online`);
          this.done();
        } else if (p.t > timeout) {
          this.events.push("fault", this.cfg.id, "Kontaktör kapama zaman aşımı");
          this.done();
        }
      } else if (p.cmd === COMMAND.OPEN_ALL) {
        if (this.racks.every((r) => !r.dcLineClosed)) this.done();
      }
    }

    // Heartbeat (controller) denetimi — Rev AF / Diagnosis: BSCEMSLOC 20 s
    if (this.commUp && !this.hbEverWritten && this.online.length > 0) {
      this.events.compatWarn(
        this.cfg.id,
        "noHeartbeat",
        "EMS Controller Heartbeat (40000) yazmıyor",
        "BSC 20 s sonra S-C LOC teşhisi koyar, limitleri 0'a çeker ve tüm raf kontaktörlerini açar",
      );
    }

    // Bara çözümü (online raflar paralel Thevenin kaynakları)
    const conn = this.racks.filter((r) => r.electricallyConnected);
    if (conn.length > 0) {
      let G = 0, EG = 0;
      const th = conn.map((r) => r.thevenin());
      for (const t of th) { G += 1 / t.r; EG += t.e / t.r; }
      const vbus = (dcCurrentReq + EG) / G;
      conn.forEach((r, i) => (r.current = (vbus - th[i]!.e) / th[i]!.r));
      this.busVoltage = vbus;
      this.sectionCurrent = dcCurrentReq;
    } else {
      this.busVoltage = 0;
      this.sectionCurrent = 0;
    }
    for (const r of this.racks) if (!r.electricallyConnected) r.current = 0;

    // Raf adımları
    const initPer = tm.bscInitBase / Math.max(1, this.racks.length) + tm.bscInitPerRack;
    for (const r of this.racks) {
      r.step(dt, simT, {
        bscComm: this.commUp && !r.disabled,
        closeStep: tm.rackCloseStep,
        precharge: tm.rackPrecharge,
        initPerRack: initPer,
      });
    }
    // Raf durum kodu BSC moduna göre
    for (const r of this.racks) {
      if (!r.rbmsUp || r.state < 0x09) continue;
      r.state = this.state === S.MANUAL ? 0x0c : this.state === S.EMERGENCY ? 0x0d : this.state === S.NPS ? 0x0a : 0x09;
    }

    // NPS
    if (this.npsEnabled && this.state === S.NORMAL) {
      const idle = this.racks.every((r) => Math.abs(r.current) <= 3) && this.chargeStatusBits() === 0b11 && !this.racks.some((r) => r.balancingActive);
      this.idleForNps = idle ? this.idleForNps + dt : 0;
      if (this.idleForNps > 3600 && Math.max(...this.online.map((r) => r.reportedSoc()), 0) < 30) {
        this.state = S.NPS;
        this.events.push("info", this.cfg.id, "Durum → NPS (uzun süre boşta)");
      }
    } else if (this.state === S.NPS && this.racks.some((r) => Math.abs(r.current) >= 3)) {
      this.state = S.NORMAL;
      this.events.push("info", this.cfg.id, "Durum → Normal (NPS çıkışı)");
    }

    // Bölüm teşhisleri
    this.diag.evaluate({ b: this }, dt, simT, this.commUp);

    // S-C LOC aksiyonu
    if (this.diag.isActive("BSCEMSLOC") && this.online.length > 0) {
      for (const r of this.racks) r.requestOpen();
    }
    if (this.diag.hasAction("section-open") && this.online.length > 0) {
      for (const r of this.racks) r.requestOpen();
    }

    this.limits = this.computeLimits();
  }

  /** Bölüm limitleri: "sorunlu raf hariç yeniden hesapla" — n_uygun × min(raf limiti). */
  computeLimits(): RackLimits {
    const on = this.online;
    const zero = { chargeKw: 0, dischargeKw: 0, spc: false, vpc: false, preVpc: false, tpc: false };
    if (on.length === 0 || this.state === BSC_STATE.EMERGENCY) return zero;
    const lims = on.map((r) => ({ r, l: r.limits() }));
    const chOk = lims.filter((x) => !x.r.diag.hasAction("derate-chg", "derate-both", "open"));
    const disOk = lims.filter((x) => !x.r.diag.hasAction("derate-dis", "derate-both", "open"));
    let ch = chOk.length ? chOk.length * Math.min(...chOk.map((x) => x.l.chargeKw)) : 0;
    let dis = disOk.length ? disOk.length * Math.min(...disOk.map((x) => x.l.dischargeKw)) : 0;
    const anyRack = (d: string[]): boolean => this.racks.some((r) => r.diag.hasAction(...(d as never[])));
    if (this.diag.hasAction("section-zero", "section-open") || anyRack(["section-zero"])) { ch = 0; dis = 0; }
    if (this.diag.hasAction("section-zero-chg")) ch = 0;
    if (this.diag.hasAction("section-zero-dis")) dis = 0;
    if (this.diag.isActive("BSCEMSLOC")) { ch = 0; dis = 0; }
    return {
      chargeKw: clamp(ch, 0, 1e6),
      dischargeKw: clamp(dis, 0, 1e6),
      spc: lims.some((x) => x.l.spc),
      vpc: lims.some((x) => x.l.vpc),
      preVpc: lims.some((x) => x.l.preVpc),
      tpc: lims.some((x) => x.l.tpc),
    };
  }

  /** Senaryo taban durumu: güç kesilip yeniden verilmiş gibi — raflar açık, teşhisler temiz, Not Initialized. */
  powerCycle(soc: number, tempC: number): void {
    this.pending = null;
    for (const r of this.racks) r.restoreBaseline(soc, tempC);
    this.diag.clearAll();
    this.state = BSC_STATE.NOT_INITIALIZED;
    this.ack = ACK.NONE;
    this.events.push("info", this.cfg.id, "Taban durum — BSC yeniden enerjilendi → Not Initialized");
  }

  /** Konsol: tüm teşhisleri (CER dahil) temizle. */
  lgesClear(): void {
    this.diag.clearAll();
    for (const r of this.racks) r.diag.clearAll();
    this.events.push("info", this.cfg.id, "LGES temizliği — tüm teşhisler (CER dahil) silindi");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bölüm (section) teşhisleri → 30043..30048 bitleri (Rev AF B2C BSC Data)
// ─────────────────────────────────────────────────────────────────────────────
function sectionDiagDefs(): DiagDef<SectionCtx>[] {
  const pw = (c: SectionCtx): number => (c.b.sectionCurrent * c.b.busVoltage) / 1000; // kW + şarj
  const avgI = (c: SectionCtx): number => Math.abs(c.b.sectionCurrent) / Math.max(1, c.b.online.length);
  const chRatio = (c: SectionCtx): number => (pw(c) > 0 && avgI(c) > 0.5 ? pw(c) / Math.max(1, c.b.limits.chargeKw) : 0);
  const disRatio = (c: SectionCtx): number => (pw(c) < 0 && avgI(c) > 0.5 ? -pw(c) / Math.max(1, c.b.limits.dischargeKw) : 0);
  return [
    { code: "BSCEMSLOC_A", name: "Controller–BSC LOC alarm", level: "alarm", reg: 30043, bit: 0, detectS: 0, detect: (c) => c.b.hbLocSeconds() > 10, release: (c) => c.b.hbLocSeconds() < 2, clearBy: "auto", action: "none" },
    { code: "BSCEMSLOC", name: "Controller–BSC LOC (20 s)", level: "fault1", reg: 30043, bit: 2, detectS: 0, detect: (c) => c.b.hbLocSeconds() > 20, release: (c) => c.b.hbLocSeconds() < 2, clearBy: "auto", action: "section-open" },
    { code: "SUSOCW", name: "Bölüm SOC alt sınır", level: "warning", reg: 30043, bit: 7, detectS: 5, releaseS: 5, detect: (c) => c.b.online.length > 0 && c.b.soc() <= 0.01, release: (c) => c.b.soc() > 0, clearBy: "auto", action: "section-zero-dis" },
    { code: "SOSOCW", name: "Bölüm SOC üst sınır", level: "warning", reg: 30043, bit: 10, detectS: 5, releaseS: 5, detect: (c) => c.b.soc() >= 99.99, release: (c) => c.b.soc() < 100, clearBy: "auto", action: "section-zero-chg" },
    { code: "SODPW", name: "Bölüm aşırı deşarj gücü uyarı", level: "warning", reg: 30043, bit: 13, detectS: 10, releaseS: 10, detect: (c) => disRatio(c) > 1.1, release: (c) => disRatio(c) < 1.0, clearBy: "auto", action: "section-zero-dis" },
    { code: "SODPF", name: "Bölüm aşırı deşarj gücü F1", level: "fault1", reg: 30043, bit: 14, detectS: 20, detect: (c) => disRatio(c) > 1.2, clearBy: "eventclear", action: "section-open" },
    { code: "SOCPW", name: "Bölüm aşırı şarj gücü uyarı", level: "warning", reg: 30044, bit: 1, detectS: 10, releaseS: 10, detect: (c) => chRatio(c) > 1.1, release: (c) => chRatio(c) < 1.0, clearBy: "auto", action: "section-zero-chg" },
    { code: "SOCPF", name: "Bölüm aşırı şarj gücü F1", level: "fault1", reg: 30044, bit: 2, detectS: 20, detect: (c) => chRatio(c) > 1.2, clearBy: "eventclear", action: "section-open" },
    { code: "SLFA", name: "Sistem log hatası", level: "alarm", reg: 30045, bit: 6, detectS: 1, detect: (c) => c.b.slf, release: (c) => !c.b.slf, clearBy: "auto", action: "none" },
    { code: "MFRD", name: "Çoklu arızalı raf (MFRD)", level: "fault1", reg: 30047, bit: 5, detectS: 1, detect: (c) => c.b.racks.filter((r) => ["UVF1", "OVF1", "OVF2", "PBMSF", "RPLOC"].some((k) => r.diag.isActive(k))).length >= 2, clearBy: "lges", action: "emergency" },
    { code: "OORW", name: "Çevrim dışı raf sayısı aşıldı", level: "warning", reg: 30047, bit: 10, detectS: 3, detect: (c) => c.b.state === BSC_STATE.NORMAL && c.b.racks.filter((r) => !r.disabled && !r.online && !r.closing).length > 7 && c.b.racks.some((r) => r.online), clearBy: "eventclear", action: "section-zero" },
  ];
}
