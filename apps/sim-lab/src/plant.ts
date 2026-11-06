// Plant — tüm cihaz modellerini, fiziksel bağları ve Modbus sunucularını bir arada yürütür.
//
//   Şebeke ─ OG köşk (H01/H04/H05) ─ PCS-n (Wattox) ═ DC şalter CB-n ═ BSC-n (8 raf × 408S)
//                                                     ↑ BMS bağlantısı (BSC→PCS 0x0300 bloğu)
//   HVAC-k zonu ↔ raf k (her BSC'den) — ısı alışverişi; dış ortam (günlük profil)
//
// Fizik simülasyon saatinde (hız çarpanı), haberleşme zamanlayıcıları duvar saatinde koşar.

import { resolve } from "node:path";
import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import {
  CbSimulator,
  CbSimulatorAdapter,
  ControlPanelIoAdapter,
  ControlPanelIoSimulator,
  DcMeterAdapter,
  DcMeterSimulator,
  DcOutputSimulator,
  DcOutputSimulatorAdapter,
  DemoMvStationAdapter,
  DemoMvStationSimulator,
  EnergyAnalyzerSimulator,
  EnergyAnalyzerSimulatorAdapter,
  ImdAdapter,
  ImdSimulator,
} from "@gd-monorepo/simulators";
import { EventLog } from "./core/events";
import { makeRng } from "./core/util";
import { profileDefaults, timings, type ProfileName, type Realism, type Timings } from "./core/profile";
import { loadDeviceConfigs, detectRackStride, readJson, resolveFrom, type DeviceConfig } from "./config/device-configs";
import { LabModbusServer, type DeviceFace, type TrafficEntry } from "./modbus/lab-server";
import { Bsc } from "./models/bsc";
import { WattoxPcs } from "./models/pcs-wattox";
import { Mc90Hvac } from "./models/hvac-mc90";
import { Grid, ThermalZone, Weather } from "./models/environment";
import { bscFace } from "./faces/bsc-face";
import { wattoxBmsFace, wattoxEmsFace } from "./faces/wattox-face";
import { connectorFace, hvacFace, legacyFace } from "./faces/misc-faces";
import { BmsLink, auditMapping, type MappingFile } from "./link/bms-link";

export interface SimLabConfig {
  configDirs: string[];
  bindHost: string;
  http: { host: string; port: number };
  profile: ProfileName;
  speed: number;
  startHour: number;
  initial: { soc: number; tempC: number };
  pcs: { altitudeM: number };
  hvac: { coolingKw: number; heaterKw: number };
  weather: { mode: "sabit" | "gunluk"; fixedC: number; minC: number; maxC: number; solarW: number };
  bscCloseDeviationV: number;
  /** BSC-n → PCS-n eşleşmesi + DC şalter. Boşsa sıra numarasıyla otomatik. */
  strings?: { bsc: string; pcs?: string; cb?: string; dcMeter?: string }[];
  /** OG köşk: PCS'yi besleyen kesiciler. */
  mv?: { device: string; incomer: string[]; feeders: Record<string, string[]> };
}

export type DeviceKind = "bsc" | "pcs" | "pcs-bms" | "hvac" | "connector" | "legacy";

export interface LabDevice {
  id: string;
  kind: DeviceKind;
  type: string;
  name: string;
  config?: DeviceConfig;
  server: LabModbusServer;
  face: DeviceFace;
  /** Legacy simülatör örneği (tick + enjeksiyon API'si için). */
  legacy?: { sim: { tick(s: number): void } & Record<string, unknown>; adapter: IModbusSimulatorAdapter };
}

export interface StringLink {
  bsc: Bsc;
  pcs?: WattoxPcs;
  cbId?: string;
  dcMeterId?: string;
  link?: BmsLink;
}

const TRAFFIC_CAP = 1500;

export class Plant {
  readonly events = new EventLog();
  realism: Realism;
  private tm: Timings;
  readonly configs: DeviceConfig[];
  readonly devices = new Map<string, LabDevice>();
  readonly bscs = new Map<string, Bsc>();
  readonly pcss = new Map<string, WattoxPcs>();
  readonly hvacs = new Map<string, Mc90Hvac>();
  readonly zones = new Map<string, ThermalZone>();
  /** zon → raflar */
  readonly zoneRacks = new Map<string, { bsc: string; rack: number }[]>();
  readonly strings: StringLink[] = [];
  readonly links = new Map<string, BmsLink>();
  readonly weather = new Weather();
  readonly grid = new Grid();
  readonly traffic: TrafficEntry[] = [];
  private trafficSeq = 0;
  simT: number; // s (gün içi saat startHour'dan)
  speed: number;
  paused = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private lastWall = Date.now();
  private readonly rng = makeRng(7);
  detectedStride: number | null = null;
  readonly startedAt = Date.now();
  /** Senaryo motoru her adımda çağrılır. */
  onStep: ((dtSim: number) => void) | null = null;
  /**
   * EMS yardımcısı — EMS bağlı değilken (veya EMS bu görevleri yapmıyorken) EMS'in
   * yapması gerekenleri taklit eder: BSC controller heartbeat'i ve klimaya batarya sıcaklığı.
   * Varsayılan KAPALI: EMS'in eksikleri gizlenmesin.
   */
  readonly assist = { heartbeat: false, hvacServerTemps: false };
  private assistAcc = 0;
  private hbCounter = 0;

  constructor(
    readonly cfg: SimLabConfig,
    readonly baseDir: string,
  ) {
    this.realism = profileDefaults(cfg.profile);
    this.tm = timings(this.realism.timing);
    this.speed = cfg.speed;
    this.simT = cfg.startHour * 3600;
    this.weather.cfg = { ...cfg.weather };
    this.configs = loadDeviceConfigs(cfg.configDirs, baseDir);
    this.build();
  }

  // ───────────────────────── kurulum ─────────────────────────

  setProfile(name: ProfileName): void {
    this.realism = profileDefaults(name);
    this.tm = timings(this.realism.timing);
    this.events.push("info", "SİM", `Gerçeklik profili → ${name}`);
  }
  setRealism(patch: Partial<Realism>): void {
    this.realism = { ...this.realism, ...patch };
    this.tm = timings(this.realism.timing);
    this.events.push("info", "SİM", `Ayar: ${Object.entries(patch).map(([k, v]) => `${k}=${String(v)}`).join(", ")}`);
  }
  rackStride(): number {
    const s = this.realism.bscRackStride;
    if (s === "auto") return this.detectedStride ?? 150;
    return s;
  }

  private addServer(id: string, kind: DeviceKind, type: string, name: string, port: number, face: DeviceFace, opts: { supportedFc?: number[]; realName?: string; config?: DeviceConfig; legacy?: LabDevice["legacy"] } = {}): LabDevice {
    const server = new LabModbusServer({
      deviceId: id,
      host: this.cfg.bindHost,
      port,
      face,
      events: this.events,
      ...(opts.supportedFc ? { supportedFc: opts.supportedFc } : {}),
      fcStrict: () => this.realism.fcStrict,
      ...(opts.realName ? { realDeviceName: opts.realName } : {}),
      traffic: (e) => this.pushTraffic(e),
    });
    const dev: LabDevice = { id, kind, type, name, server, face, ...(opts.config ? { config: opts.config } : {}), ...(opts.legacy ? { legacy: opts.legacy } : {}) };
    this.devices.set(id, dev);
    return dev;
  }

  private pushTraffic(e: TrafficEntry): void {
    this.trafficSeq++;
    this.traffic.push(e);
    if (this.traffic.length > TRAFFIC_CAP) this.traffic.splice(0, this.traffic.length - TRAFFIC_CAP);
  }

  private build(): void {
    const R = () => this.realism;
    const T = () => this.tm;
    const cfgs = this.configs;
    const byType = (t: string) => cfgs.filter((c) => (c.transport?.type ?? c.type) === t);

    // — BSC'ler —
    let seed = 11;
    for (const c of byType("bsc")) {
      const rackCount = Number(c.details?.["rackCount"] ?? 8);
      const bsc = new Bsc(
        { id: c.deviceId, rackCount, seed: seed++, initialSoc: this.cfg.initial.soc, initialTemp: this.cfg.initial.tempC, closeDeviationV: this.cfg.bscCloseDeviationV },
        this.events,
        R,
        T,
      );
      this.bscs.set(c.deviceId, bsc);
      const st = detectRackStride(c);
      if (st !== null) {
        this.detectedStride = st;
        if (st !== 150) {
          this.events.compatWarn(c.deviceId, "stride", `device-config raf blok adımı ${st} (Rack State R2 − R1)`, "Rev AF: Rack N = 30170 + (N−1)×150 — raf 2..8 verileri gerçek BSC'de yanlış adresten okunur");
        }
        // bitfield'lar ile telemetri tutarlılığı
        const bf2 = c.bitfieldConfigs?.find((b) => b.fields.some((f) => /Rack Deviation Voltage/i.test(f.name)) && b.registerAddress > 30300);
        if (bf2) {
          const bfStride = bf2.registerAddress - 30238;
          if (bfStride !== st) this.events.compatWarn(c.deviceId, "strideBitfield", `Aynı dosyada bitfield'lar ${bfStride}, telemetri ${st} adımı kullanıyor`, "Raf diag bitfield'ları ile raf telemetrisi farklı adreslerden okunuyor");
        }
      }
      const face = bscFace(bsc, R, () => this.rackStride(), this.events);
      this.addServer(c.deviceId, "bsc", "bsc", c.name, c.connection.port, face, { supportedFc: [2, 3, 4, 6, 16], realName: "Flex BSC", config: c });

      // konnektör izleme cihazı
      const conn = c.connector?.device;
      if (conn) {
        const holder: { link?: BmsLink } = {};
        this.addServer(conn.deviceId, "connector", "bsc-pcs-connector", conn.name, conn.connection.port, connectorFace(() => holder.link?.stats ?? { link: 0, source: 2, lastWriteAt: 0, writeCount: 0, failCount: 0 }));
        (bsc as unknown as { _connHolder: typeof holder })._connHolder = holder;
      }
    }

    // — PCS'ler —
    for (const c of byType("wattox-pcs")) {
      const pcs = new WattoxPcs({ id: c.deviceId, ratedKw: 1725, ratedV: 690, ratedA: 1443, dcMaxA: 1807, altitudeM: this.cfg.pcs.altitudeM }, this.events, R, T);
      this.pcss.set(c.deviceId, pcs);
      this.addServer(c.deviceId, "pcs", "wattox-pcs", c.name, c.connection.port, wattoxEmsFace(pcs, R, this.events), { supportedFc: [3, 6], realName: "Wattox MPCS (protokol V1.0)", config: c });
      const bmsPort = c.transport?.bmsPort;
      if (bmsPort) this.addServer(`${c.deviceId}-BMS`, "pcs-bms", "wattox-bms", `${c.name} BMS portu`, bmsPort, wattoxBmsFace(pcs), { supportedFc: [3, 6, 16], realName: "Wattox BMS arayüzü" });
    }

    // — HVAC'lar + zonlar —
    for (const c of byType("hvac")) {
      const h = new Mc90Hvac({ id: c.deviceId, coolingKw: this.cfg.hvac.coolingKw, heaterKw: this.cfg.hvac.heaterKw }, this.events, R, T);
      h.remoteOn = false;
      this.hvacs.set(c.deviceId, h);
      this.zones.set(c.deviceId, new ThermalZone(c.deviceId, this.cfg.initial.tempC));
      this.addServer(c.deviceId, "hvac", "hvac", c.name, c.connection.port, hvacFace(h, R), { supportedFc: [3, 6, 16], realName: "MC90HDNC1R-L (MC Series protokol A3)", config: c });
    }
    // zon ↔ raf: HVAC-k ↔ her BSC'nin k. rafı (varsayım; config ile değiştirilebilir)
    const hv = [...this.hvacs.keys()].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    for (const b of this.bscs.values()) {
      b.racks.forEach((r, i) => {
        const z = hv[i % Math.max(1, hv.length)];
        if (!z) return;
        const arr = this.zoneRacks.get(z) ?? [];
        arr.push({ bsc: b.cfg.id, rack: r.id });
        this.zoneRacks.set(z, arr);
      });
    }
    if (hv.length === 0) this.zones.set("ZON", new ThermalZone("ZON", this.cfg.initial.tempC));

    // — Diziler (BSC ↔ PCS ↔ CB) ve BMS bağlantıları —
    const bscIds = [...this.bscs.keys()].sort();
    const pcsIds = [...this.pcss.keys()].sort();
    const cbIds = byType("cb").map((c) => c.deviceId).sort();
    const meterIds = byType("dc-meter").map((c) => c.deviceId).sort();
    const pairs = this.cfg.strings?.length ? this.cfg.strings : bscIds.map((b, i) => ({ bsc: b, pcs: pcsIds[i], cb: cbIds[i], dcMeter: i === 0 ? meterIds[0] : undefined }));
    for (const p of pairs) {
      const bsc = this.bscs.get(p.bsc);
      if (!bsc) continue;
      const pcs = p.pcs ? this.pcss.get(p.pcs) : undefined;
      const s: StringLink = { bsc, ...(pcs ? { pcs } : {}), ...(p.cb ? { cbId: p.cb } : {}), ...(p.dcMeter ? { dcMeterId: p.dcMeter } : {}) };
      if (pcs) {
        const bc = cfgs.find((c) => c.deviceId === p.bsc)!;
        let mapping: MappingFile | null = null;
        const mp = bc.connector?.sim?.registerMap;
        if (mp) {
          try {
            mapping = readJson<MappingFile>(resolveFrom(bc.file, mp));
            auditMapping(mapping, bc.connector!.device.deviceId, this.events);
          } catch (e) {
            this.events.push("warn", p.bsc, `Mapping okunamadı: ${String(e)}`);
          }
        }
        const link = new BmsLink(bc.connector?.device.deviceId ?? `${p.bsc}-LINK`, bsc, this.devices.get(p.bsc)!.face, pcs, mapping, R, this.events);
        s.link = link;
        this.links.set(link.id, link);
        const holder = (bsc as unknown as { _connHolder?: { link?: BmsLink } })._connHolder;
        if (holder) holder.link = link;
      }
      this.strings.push(s);
    }

    // — Legacy cihazlar (packages/simulators) —
    const legacy: Record<string, (c: DeviceConfig) => { sim: { tick(s: number): void } & Record<string, unknown>; adapter: IModbusSimulatorAdapter }> = {
      cb: () => { const sim = new CbSimulator(); return { sim: sim as never, adapter: new CbSimulatorAdapter(sim) }; },
      "dc-output": () => { const sim = new DcOutputSimulator(); return { sim: sim as never, adapter: new DcOutputSimulatorAdapter(sim) }; },
      "dc-meter": () => { const sim = new DcMeterSimulator(); return { sim: sim as never, adapter: new DcMeterAdapter(sim) }; },
      "energy-analyzer": () => { const sim = new EnergyAnalyzerSimulator(); return { sim: sim as never, adapter: new EnergyAnalyzerSimulatorAdapter(sim) }; },
      "control-panel-io": () => { const sim = new ControlPanelIoSimulator(); return { sim: sim as never, adapter: new ControlPanelIoAdapter(sim) }; },
      imd: () => { const sim = new ImdSimulator(); return { sim: sim as never, adapter: new ImdAdapter(sim) }; },
      "demo-mv-station": () => { const sim = new DemoMvStationSimulator(); return { sim: sim as never, adapter: new DemoMvStationAdapter(sim) }; },
    };
    for (const c of cfgs) {
      const t = c.transport?.type ?? c.type;
      if (this.devices.has(c.deviceId)) continue;
      const mk = legacy[t];
      if (!mk) {
        this.events.push("warn", c.deviceId, `Sim-Lab'da '${t}' tipi için model yok — atlandı`);
        continue;
      }
      const l = mk(c);
      this.addServer(c.deviceId, "legacy", t, c.name, c.connection.port, legacyFace(l.adapter), { config: c, legacy: l });
    }
    // MV köşk varsayılanı
    if (!this.cfg.mv) {
      const mv = byType("demo-mv-station")[0];
      if (mv) this.cfg.mv = { device: mv.deviceId, incomer: ["H01"], feeders: Object.fromEntries(pcsIds.map((p, i) => [p, [i === 0 ? "H04" : "H05"]])) };
    }
  }

  // ───────────────────────── yaşam döngüsü ─────────────────────────

  async start(): Promise<void> {
    for (const d of this.devices.values()) await d.server.start();
    const ok = [...this.devices.values()].filter((d) => d.server.stats.listening).length;
    this.events.push("info", "SİM", `${ok}/${this.devices.size} Modbus sunucusu açık (${this.cfg.bindHost}) — profil: ${this.realism.profile}`);
    this.lastWall = Date.now();
    this.timer = setInterval(() => void this.loop(), 200);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    for (const d of this.devices.values()) await d.server.stop();
  }

  private loopBusy = false;
  private lastLoopError = "";
  private async loop(): Promise<void> {
    if (this.loopBusy) return;
    this.loopBusy = true;
    try {
      const now = Date.now();
      const dtWall = Math.min(2, (now - this.lastWall) / 1000);
      this.lastWall = now;
      if (!this.paused) {
        let dt = dtWall * this.speed;
        while (dt > 1e-6) {
          const h = Math.min(0.5, dt);
          this.physics(h);
          dt -= h;
        }
      }
      this.assistAcc += dtWall;
      if (this.assistAcc >= 1) {
        this.assistAcc = 0;
        this.runAssist();
      }
    } catch (e) {
      const msg = String((e as Error).message ?? e);
      if (msg !== this.lastLoopError) this.events.push("fault", "SİM", `Döngü hatası: ${String((e as Error).stack ?? e)}`);
      this.lastLoopError = msg;
    } finally {
      this.loopBusy = false;
    }
  }

  /** Simülasyonu manuel ilerlet (test/senaryo). */
  advance(seconds: number): void {
    let dt = seconds;
    while (dt > 1e-6) {
      const h = Math.min(0.5, dt);
      this.physics(h);
      dt -= h;
    }
  }

  tod(): number {
    return (this.simT / 3600) % 24;
  }
  day(): number {
    return Math.floor(this.simT / 86400);
  }
  outdoorC(): number {
    return this.weather.outdoorC(this.tod());
  }

  private legacySim<T>(id: string | undefined): T | undefined {
    if (!id) return undefined;
    return this.devices.get(id)?.legacy?.sim as T | undefined;
  }

  /** OG köşk: PCS'yi besleyen kesiciler kapalı mı. */
  private pcsGridPresent(pcsId: string): boolean {
    const mv = this.cfg.mv;
    if (!mv) return true;
    const sim = this.legacySim<DemoMvStationSimulator>(mv.device);
    if (!sim) return true;
    const pos = (h: string): boolean => {
      try {
        return sim.cellPosition(h as never);
      } catch {
        return true;
      }
    };
    const feeders = mv.feeders[pcsId] ?? [];
    return mv.incomer.every(pos) && feeders.every(pos);
  }

  private physics(dt: number): void {
    this.simT += dt;
    this.events.simTime = this.simT;
    const tod = this.tod();
    const tOut = this.weather.outdoorC(tod);
    const solar = this.weather.solar(tod);
    this.grid.step(dt, this.rng);

    // Diziler: PCS ↔ CB ↔ BSC
    for (const s of this.strings) {
      const cb = this.legacySim<CbSimulator>(s.cbId);
      const cbClosed = cb ? cb.readDiscreteInput(0) : true;
      const bsc = s.bsc;
      const pcs = s.pcs;
      if (pcs) {
        pcs.ambientC = tOut;
        const present = this.pcsGridPresent(pcs.cfg.id);
        pcs.grid = { present, vLL: present ? this.grid.vLL : 0, hz: present ? this.grid.hz : 0 };
        const vDc = cbClosed && bsc.online.length > 0 ? bsc.busVoltage || bsc.dcVoltage() : 0;
        pcs.step(dt, vDc, this.day());
        const iReq = cbClosed && pcs.dcBreakerClosed ? -pcs.dcCurrent : 0; // + = bataryayı şarj
        bsc.step(dt, this.simT, iReq);
        s.link?.step(dt);
        // izolasyon: IMD ↔ PCS (aynı DC bara)
        const imdId = [...this.devices.values()].find((d) => d.type === "imd")?.id;
        const imd = this.legacySim<ImdSimulator & { state?: { alarm: boolean } }>(imdId);
        if (imd && s === this.strings[0]) {
          const imdAlarm = (imd as unknown as { state: { alarm: boolean } }).state?.alarm;
          if (imdAlarm && pcs.insulationKohm > 100) pcs.insulationKohm = 60;
          if (!imdAlarm && !this.activeFaultTag(`pcs.insulation:${pcs.cfg.id}`)) pcs.insulationKohm = 3200;
        }
      } else {
        bsc.step(dt, this.simT, 0);
      }
      // DC metre (DJSF1352) — dizinin DC tarafı
      const meter = this.legacySim<DcMeterSimulator>(s.dcMeterId);
      if (meter) {
        const v = bsc.online.length ? bsc.busVoltage : 0;
        const i = bsc.sectionCurrent;
        meter.setMeasurements({ voltage: v, current: -i, power: (-i * v) / 1000 });
      }
    }

    // Termal zonlar + HVAC
    for (const [zid, zone] of this.zones) {
      const racks = (this.zoneRacks.get(zid) ?? []).map((x) => this.bscs.get(x.bsc)!.racks[x.rack - 1]!);
      for (const r of racks) r.airT = zone.airT;
      let heat = racks.reduce((s, r) => s + r.heatToAir, 0);
      const h = this.hvacs.get(zid);
      if (h) {
        h.step(dt, this.simT, zone.airT, tOut);
        heat += h.heatToZone;
        const dev = this.devices.get(zid);
        if (dev) {
          const wantOffline = h.inj.powerLoss;
          if (wantOffline && dev.server.fault.mode !== "offline") dev.server.setFault({ mode: "offline" });
        }
      }
      zone.step(dt, heat, tOut, solar);
    }
    if (this.zones.has("ZON") && this.hvacs.size === 0) {
      const z = this.zones.get("ZON")!;
      for (const b of this.bscs.values()) for (const r of b.racks) r.airT = z.airT;
    }

    // Legacy tick
    for (const d of this.devices.values()) {
      const sim = d.legacy?.sim as { tick?: (s: number) => void } | undefined;
      if (typeof sim?.tick === "function") sim.tick(dt);
    }

    this.onStep?.(dt);
  }

  private runAssist(): void {
    if (this.assist.heartbeat) {
      this.hbCounter = (this.hbCounter + 1) % 256;
      for (const b of this.bscs.values()) b.writeHolding(40000, this.hbCounter);
    }
    if (this.assist.hvacServerTemps) {
      for (const [zid, h] of this.hvacs) {
        const racks = (this.zoneRacks.get(zid) ?? []).map((x) => this.bscs.get(x.bsc)!.racks[x.rack - 1]!).filter((r) => r.rbmsUp);
        if (racks.length === 0) continue;
        const mx = Math.max(...racks.map((r) => r.stats().tMax));
        const mn = Math.min(...racks.map((r) => r.stats().tMin));
        h.write(0x2000, (Math.round(mx * 10) + 0x10000) & 0xffff);
        h.write(0x2001, (Math.round(mn * 10) + 0x10000) & 0xffff);
      }
    }
  }

  /** Aktif arıza etiketi sorgusu (faults modülü doldurur). */
  activeFaultTag: (tag: string) => boolean = () => false;

  trafficSince(seq: number): { seq: number; items: TrafficEntry[] } {
    const start = Math.max(0, this.traffic.length - (this.trafficSeq - seq));
    return { seq: this.trafficSeq, items: this.traffic.slice(start) };
  }

  resolveDir(p: string): string {
    return resolve(this.baseDir, p);
  }
}
