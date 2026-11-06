// Plant — bir sahanın (N konteyner × BSC/HVAC/yardımcı + M PCS + OG köşk) tüm cihaz
// modellerini, fiziksel bağlarını ve her cihazın ayrı Modbus TCP sunucusunu yürütür.
//
//   Şebeke ─ OG köşk (gelen H01 · fider H04/H05) ─ PCS-n (Wattox) ═ DC şalter ═ BSC (8 raf × 408S)
//                                                   ↑ BMS bağlantısı (BSC → PCS 0x0300 bloğu)
//   HVAC zonu ↔ raflar (ısı alışverişi) · dış ortam (günlük profil) · IMD ↔ PCS izolasyonu
//
// Fizik simülasyon saatinde (hız çarpanı), haberleşme zamanlayıcıları duvar saatinde koşar.
// Her cihaz yüzü bir RegisterOverlay ile sarılır → arayüz/seri, EMS'in okuduğu herhangi
// bir register'ı (tek/çok cihaz) değiştirebilir.
//
// ELEGANT-EXCEPTION: Plant bir simülasyon durum makinesidir (mutable by design); arayüz
// ve senaryo motoru durumunu doğrudan okur. Model sınıfları da aynı gerekçeyle açık alanlıdır.

import type { IModbusSimulatorAdapter } from "@gd-monorepo/shared-types";
import { CbSimulator, CbSimulatorAdapter } from "../../cb";
import { ControlPanelIoAdapter, ControlPanelIoSimulator } from "../../control-panel-io";
import { DcMeterAdapter, DcMeterSimulator } from "../../dc-meter";
import { DcOutputSimulator, DcOutputSimulatorAdapter } from "../../dc-output";
import { DemoMvStationAdapter, DemoMvStationSimulator } from "../../demo-mv-station";
import { EnergyAnalyzerSimulator, EnergyAnalyzerSimulatorAdapter } from "../../energy-analyzer";
import { FssAdapter, FssSimulator } from "../../fss";
import { ImdAdapter, ImdSimulator } from "../../imd";
import { EventLog } from "../core/events";
import { makeRng } from "../core/util";
import { profileDefaults, timings, type ProfileName, type Realism, type Timings } from "../core/profile";
import type { DeviceConfig } from "../config/device-configs";
import { LabModbusServer, type DeviceFace, type TrafficEntry } from "../modbus/lab-server";
import { Bsc } from "../models/bsc";
import { WattoxPcs } from "../models/pcs-wattox";
import { Mc90Hvac } from "../models/hvac-mc90";
import { Grid, ThermalZone, Weather } from "../models/environment";
import { bscFace } from "../faces/bsc-face";
import { wattoxBmsFace, wattoxEmsFace } from "../faces/wattox-face";
import { connectorFace, hvacFace, legacyFace } from "../faces/misc-faces";
import { internalRead } from "../faces/face-base";
import { BmsLink, auditMapping, type MappingFile } from "../link/bms-link";
import { RegisterCatalog, decodePoint, type RegisterPoint } from "../registers/register-catalog";
import { RegisterOverlay, writeThroughFace } from "../registers/register-overlay";
import { SeriesPlayer, type SeriesMode } from "../registers/register-series";
import type { SiteDevice, SiteModel, SiteSpec } from "./site-config";

export type DeviceKind = "bsc" | "pcs" | "pcs-bms" | "hvac" | "connector" | "legacy";

export interface LabDevice {
  /** Saha içi benzersiz anahtar ("C2.HVAC-5", "PCS-3", "PCS-3-BMS"). */
  key: string;
  /** EMS config'indeki deviceId (konteyner içinde tekrar edebilir). */
  deviceId: string;
  kind: DeviceKind;
  type: string;
  name: string;
  container?: number;
  port: number;
  config?: DeviceConfig;
  server: LabModbusServer;
  /** Model yüzü (üstyazımsız). */
  rawFace: DeviceFace;
  /** EMS'in gördüğü yüz (üstyazımlı). */
  face: DeviceFace;
  overlay: RegisterOverlay;
  catalog: RegisterCatalog;
  /** Legacy simülatör örneği (tick + enjeksiyon API'si için). */
  legacy?: { sim: { tick(s: number): void } & Record<string, unknown>; adapter: IModbusSimulatorAdapter };
}

export interface StringLink {
  key: string;
  container: number;
  bsc: Bsc;
  pcs?: WattoxPcs;
  pcsKey?: string;
  cbKey?: string;
  dcMeterKey?: string;
  link?: BmsLink;
  feeder?: { station: string; cell: string };
}

export interface PointReading {
  point: RegisterPoint;
  value: number;
  words: number[];
  overridden: boolean;
}

const TRAFFIC_CAP = 3000;

export class Plant {
  readonly events = new EventLog();
  realism: Realism;
  private tm: Timings;
  readonly spec: SiteSpec;
  readonly devices = new Map<string, LabDevice>();
  readonly bscs = new Map<string, Bsc>();
  readonly pcss = new Map<string, WattoxPcs>();
  readonly hvacs = new Map<string, Mc90Hvac>();
  readonly zones = new Map<string, ThermalZone>();
  readonly zoneRacks = new Map<string, { bsc: string; rack: number }[]>();
  readonly strings: StringLink[] = [];
  readonly links = new Map<string, BmsLink>();
  readonly weather = new Weather();
  readonly grid = new Grid();
  readonly traffic: TrafficEntry[] = [];
  readonly series: SeriesPlayer;
  private trafficSeq = 0;
  simT: number;
  speed: number;
  paused = false;
  private timer: ReturnType<typeof setInterval> | undefined;
  private lastWall = Date.now();
  private readonly rng = makeRng(7);
  readonly startedAt = Date.now();
  /** Senaryo motoru her adımda çağrılır. */
  onStep: ((dtSim: number) => void) | null = null;
  /**
   * EMS yardımcısı — EMS bağlı değilken EMS'in yapması gerekenleri taklit eder: BSC
   * controller heartbeat'i ve klimaya batarya sıcaklığı. Varsayılan KAPALI: EMS'in
   * eksikleri gizlenmesin.
   */
  readonly assist = { heartbeat: false, hvacServerTemps: false };
  private assistAcc = 0;
  private hbCounter = 0;
  /** Son döngünün süresi (ms) — performans izleme. */
  loopMs = 0;

  constructor(readonly model: SiteModel) {
    this.spec = model.spec;
    const s = this.spec.sim;
    this.realism = profileDefaults(s.profile);
    this.tm = timings(this.realism.timing);
    this.speed = s.speed;
    this.simT = s.startHour * 3600;
    this.weather.cfg = { ...s.weather };
    this.series = new SeriesPlayer({
      select: (sel) => this.select(sel),
      apply: (key, point, value, mode, source) => void this.applyPoint(key, point, value, mode, source),
      log: (level, msg) => this.events.push(level === "warn" ? "warn" : "info", "SERİ", msg),
    });
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
    return s === "auto" ? 150 : s;
  }

  private addServer(
    key: string,
    kind: DeviceKind,
    o: { deviceId: string; type: string; name: string; port: number; face: DeviceFace; container?: number; supportedFc?: number[]; realName?: string; config?: DeviceConfig; legacy?: LabDevice["legacy"]; catalog?: RegisterCatalog },
  ): LabDevice {
    const overlay = new RegisterOverlay();
    const face = overlay.wrap(o.face);
    const server = new LabModbusServer({
      deviceId: key,
      host: this.spec.network.bindHost,
      port: o.port,
      face,
      events: this.events,
      ...(o.supportedFc ? { supportedFc: o.supportedFc } : {}),
      fcStrict: () => this.realism.fcStrict,
      ...(o.realName ? { realDeviceName: o.realName } : {}),
      traffic: (e) => this.pushTraffic(e),
    });
    const dev: LabDevice = {
      key,
      deviceId: o.deviceId,
      kind,
      type: o.type,
      name: o.name,
      port: o.port,
      server,
      rawFace: o.face,
      face,
      overlay,
      catalog: o.catalog ?? new RegisterCatalog({ telemetry: o.config?.telemetry ?? [], ...(o.config?.bitfieldConfigs ? { bitfieldConfigs: o.config.bitfieldConfigs } : {}) }),
      ...(o.container !== undefined ? { container: o.container } : {}),
      ...(o.config ? { config: o.config } : {}),
      ...(o.legacy ? { legacy: o.legacy } : {}),
    };
    this.devices.set(key, dev);
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
    const sim = this.spec.sim;
    const init = this.spec.initial;
    const byType = (t: SiteDevice["type"]) => this.model.devices.filter((d) => d.type === t);

    // — BSC'ler (+ konnektör izleme cihazı) —
    let seed = 11;
    for (const d of byType("bsc")) {
      const rackCount = this.spec.containers.racksPerBsc;
      const soc = init.containerSoc?.[String(d.container)] ?? init.soc;
      const bsc = new Bsc({ id: d.key, rackCount, seed: seed++, initialSoc: soc, initialTemp: init.tempC, closeDeviationV: sim.bscCloseDeviationV }, this.events, R, T);
      this.bscs.set(d.key, bsc);
      const face = bscFace(bsc, R, () => this.rackStride(), this.events);
      this.addServer(d.key, "bsc", { deviceId: d.deviceId, type: "bsc", name: d.name, port: d.port, face, container: d.container!, supportedFc: [2, 3, 4, 6, 16], realName: "Flex BSC (Rev AF)", config: d.config });
      if (d.connector) {
        const ck = `C${d.container}.${d.connector.deviceId}`;
        const holder: { link?: BmsLink } = {};
        const connTelemetry = (d.config.connector?.device.telemetry ?? []) as DeviceConfig["telemetry"];
        this.addServer(ck, "connector", { deviceId: d.connector.deviceId, type: "bsc-pcs-connector", name: `${d.name} → PCS konnektörü`, port: d.connector.port, face: connectorFace(() => holder.link?.stats ?? { link: 0, source: 2, lastWriteAt: 0, writeCount: 0, failCount: 0 }), container: d.container!, catalog: new RegisterCatalog({ telemetry: connTelemetry }) });
        (bsc as unknown as { _connHolder: typeof holder })._connHolder = holder;
      }
    }

    // — PCS'ler (EMS yüzü + BMS yüzü) —
    for (const d of byType("wattox-pcs")) {
      const pcs = new WattoxPcs({ id: d.key, ratedKw: 1725, ratedV: 690, ratedA: 1443, dcMaxA: 1807, altitudeM: sim.pcs.altitudeM }, this.events, R, T);
      this.pcss.set(d.key, pcs);
      this.addServer(d.key, "pcs", { deviceId: d.deviceId, type: "wattox-pcs", name: d.name, port: d.port, face: wattoxEmsFace(pcs, R, this.events), supportedFc: [3, 6], realName: "Wattox MPCS (protokol V1.0)", config: d.config, ...(d.container ? { container: d.container } : {}) });
      if (d.bmsPort) {
        const bmsCatalog = new RegisterCatalog({ telemetry: (d.config.telemetry ?? []).filter((t) => t.registerAddress >= 0x300 && t.registerAddress <= 0x316) });
        this.addServer(`${d.key}-BMS`, "pcs-bms", { deviceId: `${d.deviceId}-BMS`, type: "wattox-bms", name: `${d.name} BMS portu`, port: d.bmsPort, face: wattoxBmsFace(pcs), supportedFc: [3, 6, 16], realName: "Wattox BMS arayüzü", catalog: bmsCatalog, ...(d.container ? { container: d.container } : {}) });
      }
    }

    // — HVAC'lar + termal zonlar —
    for (const d of byType("hvac")) {
      const h = new Mc90Hvac({ id: d.key, coolingKw: sim.hvac.coolingKw, heaterKw: sim.hvac.heaterKw }, this.events, R, T);
      h.remoteOn = false;
      this.hvacs.set(d.key, h);
      this.zones.set(d.key, new ThermalZone(d.key, init.tempC));
      this.addServer(d.key, "hvac", { deviceId: d.deviceId, type: "hvac", name: d.name, port: d.port, face: hvacFace(h, R), container: d.container!, supportedFc: [3, 6, 16], realName: "MC90HDNC1R-L (MC Series protokol A3)", config: d.config });
    }
    for (const [z, racks] of this.model.zones) {
      this.zoneRacks.set(z, racks);
      if (!this.zones.has(z)) this.zones.set(z, new ThermalZone(z, init.tempC));
    }

    // — Yardımcı (legacy) cihazlar —
    const mk: Partial<Record<SiteDevice["type"], (id: string) => { sim: { tick(s: number): void } & Record<string, unknown>; adapter: IModbusSimulatorAdapter }>> = {
      cb: (id) => { const s = new CbSimulator({ deviceId: id }); return { sim: s as never, adapter: new CbSimulatorAdapter(s) }; },
      "dc-output": (id) => { const s = new DcOutputSimulator({ deviceId: id }); return { sim: s as never, adapter: new DcOutputSimulatorAdapter(s) }; },
      "dc-meter": (id) => { const s = new DcMeterSimulator({ deviceId: id }); return { sim: s as never, adapter: new DcMeterAdapter(s) }; },
      "energy-analyzer": (id) => { const s = new EnergyAnalyzerSimulator({ deviceId: id }); return { sim: s as never, adapter: new EnergyAnalyzerSimulatorAdapter(s) }; },
      "control-panel-io": (id) => { const s = new ControlPanelIoSimulator({ deviceId: id }); return { sim: s as never, adapter: new ControlPanelIoAdapter(s) }; },
      imd: (id) => { const s = new ImdSimulator({ deviceId: id }); return { sim: s as never, adapter: new ImdAdapter(s) }; },
      fss: (id) => { const s = new FssSimulator({ deviceId: id }); return { sim: s as never, adapter: new FssAdapter(s) }; },
      "demo-mv-station": (id) => { const s = new DemoMvStationSimulator({ deviceId: id }); return { sim: s as never, adapter: new DemoMvStationAdapter(s) }; },
    };
    for (const d of this.model.devices) {
      if (this.devices.has(d.key)) continue;
      const f = mk[d.type];
      if (!f) {
        this.events.push("warn", d.key, `'${d.type}' tipi için model yok — atlandı`);
        continue;
      }
      const l = f(d.deviceId);
      this.addServer(d.key, "legacy", { deviceId: d.deviceId, type: d.type, name: d.name, port: d.port, face: legacyFace(l.adapter), config: d.config, legacy: l, ...(d.container ? { container: d.container } : {}) });
    }

    // — Diziler (BSC ↔ CB ↔ PCS) ve BMS bağlantıları —
    for (const d of byType("bsc")) {
      const bsc = this.bscs.get(d.key)!;
      const pcsDev = d.pair ? this.model.devices.find((x) => x.key === d.pair) : undefined;
      const pcs = d.pair ? this.pcss.get(d.pair) : undefined;
      const s: StringLink = {
        key: d.key,
        container: d.container!,
        bsc,
        ...(pcs ? { pcs, pcsKey: d.pair! } : {}),
        ...(d.cbKey && this.devices.has(d.cbKey) ? { cbKey: d.cbKey } : {}),
        ...(d.dcMeterKey && this.devices.has(d.dcMeterKey) ? { dcMeterKey: d.dcMeterKey } : {}),
        ...(pcsDev?.feeder ? { feeder: pcsDev.feeder } : {}),
      };
      if (pcs) {
        const mapping = (this.model.mappings.get(d.key) ?? null) as MappingFile | null;
        const connId = d.connector ? `C${d.container}.${d.connector.deviceId}` : `${d.key}-LINK`;
        if (mapping) auditMapping(mapping, connId, this.events);
        const link = new BmsLink(connId, bsc, this.devices.get(d.key)!.rawFace, pcs, mapping, R, this.events);
        s.link = link;
        this.links.set(link.id, link);
        const holder = (bsc as unknown as { _connHolder?: { link?: BmsLink } })._connHolder;
        if (holder) holder.link = link;
      }
      this.strings.push(s);
    }
  }

  // ───────────────────────── seçim / register işlemleri ─────────────────────────

  /**
   * Seçici → cihaz anahtarları. Virgülle birden çok ifade:
   *  "C3.BSC-1" (tam) · "C*.HVAC-*" (glob) · "type:hvac" · "container:3" · "all" ·
   *  "BSC-1" (tüm konteynerlerdeki BSC-1). Varsayılan olarak BMS yüzleri hariç.
   */
  select(selector: string): string[] {
    const keys = [...this.devices.keys()];
    const out = new Set<string>();
    for (const raw of selector.split(",").map((x) => x.trim()).filter(Boolean)) {
      if (raw === "all" || raw === "*") keys.filter((k) => this.devices.get(k)!.kind !== "pcs-bms").forEach((k) => out.add(k));
      else if (raw.startsWith("type:")) {
        const t = raw.slice(5).toLowerCase();
        for (const [k, d] of this.devices) if (d.type.toLowerCase() === t || d.kind === t || (t === "pcs" && d.kind === "pcs")) out.add(k);
      } else if (raw.startsWith("container:")) {
        const c = Number(raw.slice(10));
        for (const [k, d] of this.devices) if (d.container === c && d.kind !== "pcs-bms") out.add(k);
      } else if (/[*?]/.test(raw)) {
        const re = new RegExp(`^${raw.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".")}$`, "i");
        keys.filter((k) => re.test(k)).forEach((k) => out.add(k));
      } else if (this.devices.has(raw)) out.add(raw);
      else for (const [k, d] of this.devices) if (d.deviceId === raw) out.add(k);
    }
    return [...out].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }

  device(key: string): LabDevice {
    const d = this.devices.get(key);
    if (!d) throw new Error(`Cihaz yok: ${key}`);
    return d;
  }

  private pointOf(dev: LabDevice, ref: string): RegisterPoint {
    const p = dev.catalog.resolve(ref);
    if (!p) throw new Error(`${dev.key}: register bulunamadı '${ref}'`);
    return p;
  }

  /** Bir noktanın EMS'in göreceği değeri (üstyazım dahil). */
  async readPoint(key: string, ref: string | RegisterPoint): Promise<PointReading> {
    const dev = this.device(key);
    const p = typeof ref === "string" ? this.pointOf(dev, ref) : ref;
    internalRead.active = true;
    try {
      if (p.table === "coil" || p.table === "discrete") {
        const b = await dev.face.readBits(p.table, p.address, 1);
        return { point: p, value: b[0] ? 1 : 0, words: [b[0] ? 1 : 0], overridden: dev.overlay.list().some((o) => o.point === p.name) };
      }
      const words = await dev.face.readWords(p.table, p.address, p.words);
      return { point: p, value: decodePoint(p, words), words, overridden: dev.overlay.list().some((o) => o.point === p.name) };
    } finally {
      internalRead.active = false;
    }
  }

  /** Cihazın tüm katalog noktalarını okur (arayüz cihaz penceresi). */
  async readAll(key: string): Promise<{ name: string; table: string; address: number; value: number | null; raw: number[]; unit: string; group: string; writable: boolean; overridden: boolean; bits?: string; error?: string }[]> {
    const dev = this.device(key);
    const out: { name: string; table: string; address: number; value: number | null; raw: number[]; unit: string; group: string; writable: boolean; overridden: boolean; bits?: string; error?: string }[] = [];
    const ov = new Set(dev.overlay.list().map((o) => o.point));
    // kelime blokları önbelleği (aynı adresi bir kez oku)
    const cache = new Map<string, number>();
    internalRead.active = true;
    try {
      for (const p of dev.catalog.points) {
        const base = { name: p.name, table: p.table, address: p.address, unit: p.unit, group: p.group, writable: p.writable, overridden: ov.has(p.name), ...(p.bits ? { bits: p.bits.start === p.bits.end ? `b${p.bits.start}` : `b${p.bits.start}–${p.bits.end}` } : {}) };
        try {
          if (p.table === "coil" || p.table === "discrete") {
            const b = await dev.face.readBits(p.table, p.address, 1);
            out.push({ ...base, value: b[0] ? 1 : 0, raw: [b[0] ? 1 : 0] });
            continue;
          }
          const words: number[] = [];
          for (let i = 0; i < p.words; i++) {
            const k = `${p.table}:${p.address + i}`;
            let w = cache.get(k);
            if (w === undefined) {
              w = (await dev.face.readWords(p.table, p.address + i, 1))[0]!;
              cache.set(k, w);
            }
            words.push(w);
          }
          out.push({ ...base, value: decodePoint(p, words), raw: words });
        } catch (e) {
          out.push({ ...base, value: null, raw: [], error: String((e as Error).message ?? e) });
        }
      }
    } finally {
      internalRead.active = false;
    }
    return out;
  }

  /**
   * Bir noktaya işlem uygula:
   *  hold  — değer Modbus yanıtına basılır (model değişmez; "cihaz bunu raporluyor")
   *  write — EMS gibi yazılır (holding/coil; cihaz mantığı tepki verir)
   *  clear — üstyazım kaldırılır
   */
  async applyPoint(key: string, ref: string, value: number | null, mode: SeriesMode, source: string, durationS?: number): Promise<void> {
    const dev = this.device(key);
    if (mode === "clear") {
      if (ref === "*" || ref === "") dev.overlay.releaseAll();
      else dev.overlay.release(this.pointOf(dev, ref).name);
      return;
    }
    const p = this.pointOf(dev, ref);
    if (value === null || !Number.isFinite(value)) throw new Error(`${key}/${p.name}: değer yok`);
    if (mode === "hold") {
      dev.overlay.hold(p, value, source, this.simT, durationS);
      return;
    }
    let cur: number | undefined;
    if (p.bits) cur = (await dev.rawFace.readWords("holding", p.address, 1))[0];
    await writeThroughFace(dev.rawFace, p, value, cur);
    this.events.push("info", key, `✎ ${source}: ${p.name} ← ${value}`);
  }

  /** Toplu işlem: seçicideki her cihaza aynı noktayı uygular; cihaz başına sonuç döner. */
  async applyBulk(selector: string, ref: string, value: number | null, mode: SeriesMode, source: string, durationS?: number): Promise<{ key: string; ok: boolean; error?: string }[]> {
    const keys = this.select(selector);
    if (keys.length === 0) throw new Error(`Seçici hiçbir cihazla eşleşmedi: ${selector}`);
    const res = await Promise.allSettled(keys.map((k) => this.applyPoint(k, ref, value, mode, source, durationS)));
    const out = res.map((r, i) => (r.status === "fulfilled" ? { key: keys[i]!, ok: true } : { key: keys[i]!, ok: false, error: String((r.reason as Error).message ?? r.reason) }));
    const ok = out.filter((x) => x.ok).length;
    this.events.push(ok === out.length ? "info" : "warn", "TOPLU", `${mode} ${ref}${value !== null ? ` = ${value}` : ""} → ${ok}/${out.length} cihaz (${selector})`);
    return out;
  }

  // ───────────────────────── yaşam döngüsü ─────────────────────────

  async start(): Promise<void> {
    await Promise.allSettled([...this.devices.values()].map((d) => d.server.start()));
    const all = [...this.devices.values()];
    const ok = all.filter((d) => d.server.stats.listening).length;
    this.events.push(ok === all.length ? "info" : "warn", "SİM", `${this.spec.name}: ${ok}/${all.length} Modbus sunucusu açık (${this.spec.network.bindHost}) — profil: ${this.realism.profile}`);
    this.lastWall = Date.now();
    this.timer = setInterval(() => void this.loop(), 200);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await Promise.allSettled([...this.devices.values()].map((d) => d.server.stop()));
  }

  private loopBusy = false;
  private lastLoopError = "";
  private async loop(): Promise<void> {
    if (this.loopBusy) return;
    this.loopBusy = true;
    const t0 = performance.now();
    try {
      const now = Date.now();
      const dtWall = Math.min(2, (now - this.lastWall) / 1000);
      this.lastWall = now;
      if (!this.paused) this.advance(dtWall * this.speed);
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
      this.loopMs = performance.now() - t0;
      this.loopBusy = false;
    }
  }

  /** Simülasyonu ilerlet (döngü, test ve senaryo kullanır). */
  advance(seconds: number): void {
    const hMax = Math.max(0.05, this.spec.sim.physicsStepS);
    let dt = seconds;
    while (dt > 1e-6) {
      const h = Math.min(hMax, dt);
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

  legacySim<T>(key: string | undefined): T | undefined {
    if (!key) return undefined;
    return this.devices.get(key)?.legacy?.sim as T | undefined;
  }

  /** PCS'yi besleyen OG kesicileri kapalı mı (gelen + fider). */
  pcsGridPresent(s: StringLink): boolean {
    if (!s.feeder) return true;
    const st = this.spec.mv.stations.find((x) => x.id === s.feeder!.station);
    const sim = this.legacySim<DemoMvStationSimulator>(s.feeder.station);
    if (!st || !sim) return true;
    const pos = (h: string): boolean => {
      try {
        return sim.cellPosition(h as never);
      } catch {
        return true;
      }
    };
    return st.incomer.every(pos) && pos(s.feeder.cell);
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
      const cb = this.legacySim<CbSimulator>(s.cbKey);
      const cbClosed = cb ? cb.readDiscreteInput(0) : true;
      const bsc = s.bsc;
      const pcs = s.pcs;
      if (pcs) {
        pcs.ambientC = tOut;
        const present = this.pcsGridPresent(s);
        pcs.grid = { present, vLL: present ? this.grid.vLL : 0, hz: present ? this.grid.hz : 0 };
        const vDc = cbClosed && bsc.online.length > 0 ? bsc.busVoltage || bsc.dcVoltage() : 0;
        pcs.step(dt, vDc, this.day());
        const iReq = cbClosed && pcs.dcBreakerClosed ? -pcs.dcCurrent : 0; // + = bataryayı şarj
        bsc.step(dt, this.simT, iReq);
        s.link?.step(dt);
        // izolasyon: konteyner IMD'si ↔ aynı DC baradaki PCS
        const imd = this.legacySim<ImdSimulator>(`C${s.container}.IMD-1`) as unknown as { state?: { alarm: boolean } } | undefined;
        if (imd) {
          const imdAlarm = imd.state?.alarm === true;
          if (imdAlarm && pcs.insulationKohm > 100) pcs.insulationKohm = 60;
          if (!imdAlarm && !this.activeFaultTag(`pcs.insulation:${s.pcsKey}`) && pcs.insulationKohm < 3200) pcs.insulationKohm = 3200;
        }
      } else {
        bsc.step(dt, this.simT, 0);
      }
      // DC metre (DJSF1352) — dizinin DC tarafı
      const meter = this.legacySim<DcMeterSimulator>(s.dcMeterKey);
      if (meter) {
        const v = bsc.online.length ? bsc.busVoltage : 0;
        const i = bsc.sectionCurrent;
        meter.setMeasurements({ voltage: v, current: -i, power: (-i * v) / 1000 });
      }
    }

    // Termal zonlar + HVAC
    for (const [zid, zone] of this.zones) {
      const racks = (this.zoneRacks.get(zid) ?? []).map((x) => this.bscs.get(x.bsc)?.racks[x.rack - 1]).filter((r): r is NonNullable<typeof r> => !!r);
      for (const r of racks) r.airT = zone.airT;
      let heat = racks.reduce((s, r) => s + r.heatToAir, 0);
      const h = this.hvacs.get(zid);
      if (h) {
        h.step(dt, this.simT, zone.airT, tOut);
        heat += h.heatToZone;
        const dev = this.devices.get(zid);
        if (dev && h.inj.powerLoss && dev.server.fault.mode !== "offline") dev.server.setFault({ mode: "offline" });
      }
      zone.step(dt, heat, tOut, solar);
    }

    // Legacy tick
    for (const d of this.devices.values()) {
      const sim = d.legacy?.sim as { tick?: (s: number) => void } | undefined;
      if (typeof sim?.tick === "function") sim.tick(dt);
    }

    // Üstyazım süreleri + seri oynatıcı
    for (const d of this.devices.values()) if (d.overlay.size() > 0) for (const p of d.overlay.expire(this.simT)) this.events.push("info", d.key, `Üstyazım süresi doldu: ${p}`);
    this.series.tick(this.simT);

    this.onStep?.(dt);
  }

  private runAssist(): void {
    if (this.assist.heartbeat) {
      this.hbCounter = (this.hbCounter + 1) % 256;
      for (const b of this.bscs.values()) b.writeHolding(40000, this.hbCounter);
    }
    if (this.assist.hvacServerTemps) {
      for (const [zid, h] of this.hvacs) {
        const racks = (this.zoneRacks.get(zid) ?? []).map((x) => this.bscs.get(x.bsc)?.racks[x.rack - 1]).filter((r): r is NonNullable<typeof r> => !!r && r.rbmsUp);
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

  /** Sahadaki toplamlar (özet şerit). */
  totals(): { pcsKw: number; pcsKvar: number; socAvg: number; onlineRacks: number; racks: number; energyKwh: number; capacityKwh: number } {
    let kw = 0, kvar = 0, soc = 0, n = 0, on = 0, racks = 0, e = 0, cap = 0;
    for (const p of this.pcss.values()) {
      kw += p.pAc;
      kvar += p.qAc;
    }
    for (const b of this.bscs.values()) {
      soc += b.soc();
      n++;
      on += b.online.length;
      racks += b.racks.length;
      for (const r of b.racks) {
        e += r.energyKwh();
        cap += 223.074 * (r.soh / 100);
      }
    }
    void soc;
    void n;
    // SOC: rafların gerçek enerjisinden (BSC 30055 yalnız online rafları sayar; durmuş sahada 0 olur)
    return { pcsKw: kw, pcsKvar: kvar, socAvg: cap > 0 ? (100 * e) / cap : 0, onlineRacks: on, racks, energyKwh: e, capacityKwh: cap };
  }
}
