// Saha tanımı (site spec) → genişletilmiş cihaz listesi.
//
// Kullanıcı yalnız sahanın şeklini yazar (konteyner sayısı, konteyner başına BSC/HVAC/
// yardımcı cihaz, PCS eşleşmesi, OG fider dağılımı, port şeması). Register listeleri
// HER ZAMAN kök `configs/` şablonlarından gelir (AGENTS-DEVICE-CONFIG: kök = source of
// truth; projede yalnız deviceId/name/connection değişir). Böylece simülatör, EMS'in
// okuyacağı register setinin aynısını yayınlar.

import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import type { ProfileName } from "../core/profile";
import type { DeviceConfig } from "../config/device-configs";

export type SiteDeviceType =
  | "bsc"
  | "wattox-pcs"
  | "hvac"
  | "cb"
  | "dc-meter"
  | "dc-output"
  | "energy-analyzer"
  | "imd"
  | "fss"
  | "control-panel-io"
  | "demo-mv-station";

/** Kök `configs/` içinde her tipin şablon dosyası (gerçek alet adı). */
export const TEMPLATE_FILES: Record<SiteDeviceType, string> = {
  bsc: "flex-bsc.json",
  "wattox-pcs": "wattox-pcs.json",
  hvac: "hvac.json",
  cb: "dc-switch.json",
  "dc-meter": "acrel-dc-meter.json",
  "dc-output": "dc-output.json",
  "energy-analyzer": "pm5340.json",
  imd: "bender-imd.json",
  fss: "fss.json",
  "control-panel-io": "control-panel-io.json",
  "demo-mv-station": "demo-mv-station.json",
};

/** BSC konnektör izleme cihazı ve BSC→PCS eşleme şablonu (sim türevinden). */
export const CONNECTOR_TEMPLATE = "sim/flex-bsc-sim-with-wattox.json";
export const MAPPING_TEMPLATE = "mappings/bsc-2-pcs-mapping.json";

export interface SiteSpec {
  name: string;
  description?: string;
  /** Kök configs dizini (site dosyasına göre göreli). */
  templatesDir: string;
  network: {
    /** Modbus sunucularının dinlediği arayüz. */
    bindHost: string;
    /** EMS'in (docker içinden) simülatöre ulaştığı host — export edilen config'lere yazılır. */
    emsHost: string;
    containerPortBase: number;
    containerPortStride: number;
    fieldPortBase: number;
  };
  containers: {
    count: number;
    bscPerContainer: number;
    racksPerBsc: number;
    hvacPerContainer: number;
    /** HVAC → raf eşlemesi: "per-bus" = HVAC'lar BSC'lere eşit bölünür, her HVAC ardışık raflardan sorumlu. */
    hvacZoneMap: "per-bus" | "rack-index";
    aux: {
      cb: boolean;
      dcMeter: boolean;
      dcOutput: number;
      pm5340: boolean;
      imd: boolean;
      fss: boolean;
      controlPanelIo: boolean;
    };
  };
  pcs: {
    /** Konteyner başına PCS (= BSC başına bir PCS). Numara: PCS-((c-1)*n + b). */
    perContainer: number;
  };
  mv: {
    stations: { id: string; name?: string; incomer: string[]; feeders: Record<string, number[]> }[];
  };
  initial: { soc: number; tempC: number; containerSoc?: Record<string, number> };
  sim: {
    profile: ProfileName;
    speed: number;
    startHour: number;
    http: { host: string; port: number };
    hvac: { coolingKw: number; heaterKw: number };
    pcs: { altitudeM: number };
    weather: { mode: "sabit" | "gunluk"; fixedC: number; minC: number; maxC: number; solarW: number };
    bscCloseDeviationV: number;
    /** Hücre fiziği yoğunluğu: büyük sahalarda CPU için raf başına hücre çözümü seyrekleştirilir. */
    physicsStepS: number;
  };
}

export interface SiteDevice {
  /** Saha içinde benzersiz anahtar: konteyner cihazı "C3.BSC-1", saha cihazı "PCS-5". */
  key: string;
  deviceId: string;
  name: string;
  type: SiteDeviceType;
  scope: "container" | "field";
  container?: number;
  port: number;
  /** Instantiated EMS config (şablon + proje değişkenleri). */
  config: DeviceConfig;
  /** BSC: eşleşen PCS anahtarı; PCS: eşleşen BSC anahtarı. */
  pair?: string;
  /** PCS BMS yüzü portu. */
  bmsPort?: number;
  /** BSC: konnektör izleme portu + deviceId. */
  connector?: { deviceId: string; port: number };
  /** BSC: konteyner içi sıra (1..). PCS: global sıra. */
  index: number;
  /** BSC: ilişkili DC şalter ve DC metre anahtarları. */
  cbKey?: string;
  dcMeterKey?: string;
  /** PCS: besleyen OG istasyonu + hücre. */
  feeder?: { station: string; cell: string };
}

export interface SiteModel {
  spec: SiteSpec;
  baseDir: string;
  templatesDir: string;
  devices: SiteDevice[];
  /** HVAC anahtarı → raf listesi. */
  zones: Map<string, { bsc: string; rack: number }[]>;
  /** BSC anahtarı → BSC→PCS eşleme (deviceId'ler yerine geçmiş). */
  mappings: Map<string, unknown>;
}

const DEFAULTS: Omit<SiteSpec, "name" | "templatesDir"> = {
  network: { bindHost: "0.0.0.0", emsHost: "host.docker.internal", containerPortBase: 20000, containerPortStride: 100, fieldPortBase: 30000 },
  containers: {
    count: 1,
    bscPerContainer: 2,
    racksPerBsc: 8,
    hvacPerContainer: 8,
    hvacZoneMap: "per-bus",
    aux: { cb: true, dcMeter: true, dcOutput: 2, pm5340: true, imd: true, fss: true, controlPanelIo: true },
  },
  pcs: { perContainer: 2 },
  mv: { stations: [] },
  initial: { soc: 55, tempC: 24 },
  sim: {
    profile: "uyumlu",
    speed: 1,
    startHour: 10,
    http: { host: "0.0.0.0", port: 8090 },
    hvac: { coolingKw: 9, heaterKw: 2 },
    pcs: { altitudeM: 900 },
    weather: { mode: "gunluk", fixedC: 25, minC: 14, maxC: 31, solarW: 1500 },
    bscCloseDeviationV: 10,
    physicsStepS: 0.5,
  },
};

/** Kısmi spec'i varsayılanlarla birleştirir ve doğrular (geçersizse Error fırlatır). */
export function normalizeSiteSpec(raw: Partial<SiteSpec> & { name: string }): SiteSpec {
  const c = { ...DEFAULTS.containers, ...(raw.containers ?? {}) };
  c.aux = { ...DEFAULTS.containers.aux, ...(raw.containers?.aux ?? {}) };
  const spec: SiteSpec = {
    name: raw.name,
    ...(raw.description ? { description: raw.description } : {}),
    templatesDir: raw.templatesDir ?? "../../../configs",
    network: { ...DEFAULTS.network, ...(raw.network ?? {}) },
    containers: c,
    pcs: { ...DEFAULTS.pcs, ...(raw.pcs ?? {}) },
    mv: { stations: raw.mv?.stations ?? [] },
    initial: { ...DEFAULTS.initial, ...(raw.initial ?? {}) },
    sim: {
      ...DEFAULTS.sim,
      ...(raw.sim ?? {}),
      http: { ...DEFAULTS.sim.http, ...(raw.sim?.http ?? {}) },
      hvac: { ...DEFAULTS.sim.hvac, ...(raw.sim?.hvac ?? {}) },
      pcs: { ...DEFAULTS.sim.pcs, ...(raw.sim?.pcs ?? {}) },
      weather: { ...DEFAULTS.sim.weather, ...(raw.sim?.weather ?? {}) },
    },
  };
  const err = (m: string): never => {
    throw new Error(`[site] ${spec.name}: ${m}`);
  };
  if (!Number.isInteger(c.count) || c.count < 1 || c.count > 99) err("containers.count 1..99 olmalı");
  if (!Number.isInteger(c.bscPerContainer) || c.bscPerContainer < 1 || c.bscPerContainer > 4) err("bscPerContainer 1..4 olmalı");
  if (!Number.isInteger(c.racksPerBsc) || c.racksPerBsc < 1 || c.racksPerBsc > 16) err("racksPerBsc 1..16 olmalı");
  if (c.hvacPerContainer < 0 || c.hvacPerContainer > 16) err("hvacPerContainer 0..16 olmalı");
  if (spec.pcs.perContainer !== 0 && spec.pcs.perContainer !== c.bscPerContainer) err("pcs.perContainer 0 veya bscPerContainer olmalı (her BSC bir PCS'e bağlı)");
  if (spec.network.containerPortStride < 60) err("containerPortStride ≥ 60 olmalı");
  const lastField = spec.network.fieldPortBase + 300;
  const lastCont = spec.network.containerPortBase + c.count * spec.network.containerPortStride;
  if (spec.network.fieldPortBase < lastCont && lastField > spec.network.containerPortBase) err("fieldPortBase konteyner port aralığıyla çakışıyor");
  for (const st of spec.mv.stations) {
    for (const [cell, units] of Object.entries(st.feeders)) {
      for (const u of units) if (u < 1 || u > c.count) err(`mv ${st.id}.${cell}: konteyner ${u} yok`);
    }
  }
  return spec;
}

export function loadSiteSpec(file: string): { spec: SiteSpec; baseDir: string } {
  const raw = JSON.parse(readFileSync(file, "utf-8")) as Partial<SiteSpec> & { name: string };
  return { spec: normalizeSiteSpec(raw), baseDir: dirname(resolve(file)) };
}

function readTemplate(dir: string, rel: string): Record<string, unknown> {
  const p = join(dir, rel);
  if (!existsSync(p)) throw new Error(`[site] şablon yok: ${p}`);
  return JSON.parse(readFileSync(p, "utf-8")) as Record<string, unknown>;
}

/** Konteyner içi port ofsetleri (dokümante şema — README "Port şeması"). */
export const PORT_OFFSETS = {
  bsc: (b: number) => b, // +1..+4
  connector: (b: number) => 5 + b, // +6..+9
  hvac: (h: number) => 10 + h, // +11..+26
  cb: (b: number) => 30 + b, // +31..+34
  dcMeter: 41,
  dcOutput: (k: number) => 41 + k, // +42..
  pm5340: 51,
  imd: 52,
  fss: 53,
  controlPanelIo: 54,
} as const;

/** Spec + kök şablonlar → tüm cihazlar, zonlar ve BSC→PCS eşlemeleri. */
export function expandSite(spec: SiteSpec, baseDir: string): SiteModel {
  const templatesDir = isAbsolute(spec.templatesDir) ? spec.templatesDir : resolve(baseDir, spec.templatesDir);
  const tpl = new Map<SiteDeviceType, Record<string, unknown>>();
  const tplOf = (t: SiteDeviceType) => {
    let x = tpl.get(t);
    if (!x) {
      x = readTemplate(templatesDir, TEMPLATE_FILES[t]);
      tpl.set(t, x);
    }
    return x;
  };
  const connectorTpl = readTemplate(templatesDir, CONNECTOR_TEMPLATE) as { connector?: { device?: Record<string, unknown> } };
  const mappingTpl = readTemplate(templatesDir, MAPPING_TEMPLATE) as { mappings: Record<string, unknown>[] } & Record<string, unknown>;

  const devices: SiteDevice[] = [];
  const zones = new Map<string, { bsc: string; rack: number }[]>();
  const mappings = new Map<string, unknown>();
  const net = spec.network;
  const C = spec.containers;

  const instantiate = (type: SiteDeviceType, deviceId: string, name: string, port: number, extra: Record<string, unknown> = {}): DeviceConfig => {
    const t = structuredClone(tplOf(type));
    const conn = { ...(t["connection"] as Record<string, unknown>), host: net.emsHost, port };
    delete (conn as Record<string, unknown>)["unitId"];
    if ((conn as Record<string, unknown>)["slaveId"] === undefined) (conn as Record<string, unknown>)["slaveId"] = 1;
    const cfg = { ...t, deviceId, name, connection: conn, ...extra } as Record<string, unknown>;
    delete cfg["transport"];
    return {
      ...(cfg as unknown as DeviceConfig),
      file: join(templatesDir, TEMPLATE_FILES[type]),
      dir: templatesDir,
      type: (t["type"] as string) ?? type,
      telemetry: (cfg["telemetry"] as DeviceConfig["telemetry"]) ?? [],
    };
  };

  const pcsKeyOf = (c: number, b: number) => `PCS-${(c - 1) * spec.pcs.perContainer + b}`;
  const feederOf = (c: number): { station: string; cell: string } | undefined => {
    for (const st of spec.mv.stations) for (const [cell, units] of Object.entries(st.feeders)) if (units.includes(c)) return { station: st.id, cell };
    return undefined;
  };

  for (let c = 1; c <= C.count; c++) {
    const base = net.containerPortBase + (c - 1) * net.containerPortStride;
    const pre = `C${c}.`;
    const cname = `BESS#${c}`;
    for (let b = 1; b <= C.bscPerContainer; b++) {
      const key = `${pre}BSC-${b}`;
      const connId = `BSC-PCS-CONNECTOR-${b}`;
      const connPort = base + PORT_OFFSETS.connector(b);
      const connDev = structuredClone(connectorTpl.connector?.device ?? {}) as Record<string, unknown>;
      connDev["deviceId"] = connId;
      connDev["connection"] = { host: net.emsHost, port: connPort };
      const cfg = instantiate("bsc", `BSC-${b}`, `${cname} BSC-${b}`, base + PORT_OFFSETS.bsc(b), {
        details: { rackCount: C.racksPerBsc },
        connector: { device: connDev },
      });
      const pcsKey = spec.pcs.perContainer > 0 ? pcsKeyOf(c, b) : undefined;
      devices.push({
        key,
        deviceId: `BSC-${b}`,
        name: `${cname} BSC-${b}`,
        type: "bsc",
        scope: "container",
        container: c,
        port: base + PORT_OFFSETS.bsc(b),
        config: cfg,
        index: b,
        connector: { deviceId: connId, port: connPort },
        ...(pcsKey ? { pair: pcsKey } : {}),
        ...(C.aux.cb ? { cbKey: `${pre}CB-${b}` } : {}),
        ...(C.aux.dcMeter && b === 1 ? { dcMeterKey: `${pre}DC-METER-1` } : {}),
      });
      // BSC→PCS eşleme (şablondaki BSC-x deviceId'leri bu BSC'ye çevrilir)
      const m = structuredClone(mappingTpl) as { mappings: Record<string, unknown>[] } & Record<string, unknown>;
      const fix = (o: unknown): void => {
        if (o && typeof o === "object") {
          const r = o as Record<string, unknown>;
          if (typeof r["deviceId"] === "string" && /^BSC-\d+$/.test(r["deviceId"] as string)) r["deviceId"] = `BSC-${b}`;
          for (const v of Object.values(r)) fix(v);
        }
      };
      fix(m.mappings);
      mappings.set(key, m);
    }
    for (let h = 1; h <= C.hvacPerContainer; h++) {
      const key = `${pre}HVAC-${h}`;
      devices.push({ key, deviceId: `HVAC-${h}`, name: `${cname} HVAC-${h}`, type: "hvac", scope: "container", container: c, port: base + PORT_OFFSETS.hvac(h), config: instantiate("hvac", `HVAC-${h}`, `${cname} HVAC-${h}`, base + PORT_OFFSETS.hvac(h)), index: h });
    }
    // HVAC zon ↔ raf
    if (C.hvacPerContainer > 0) {
      for (let b = 1; b <= C.bscPerContainer; b++) {
        for (let r = 1; r <= C.racksPerBsc; r++) {
          let h: number;
          if (C.hvacZoneMap === "per-bus" && C.hvacPerContainer >= C.bscPerContainer) {
            const perBus = Math.floor(C.hvacPerContainer / C.bscPerContainer);
            const racksPerHvac = Math.ceil(C.racksPerBsc / perBus);
            h = (b - 1) * perBus + Math.min(perBus, Math.ceil(r / racksPerHvac));
          } else {
            h = ((r - 1) % C.hvacPerContainer) + 1;
          }
          const zk = `${pre}HVAC-${h}`;
          const arr = zones.get(zk) ?? [];
          arr.push({ bsc: `${pre}BSC-${b}`, rack: r });
          zones.set(zk, arr);
        }
      }
    } else {
      zones.set(`${pre}ZON`, Array.from({ length: C.bscPerContainer * C.racksPerBsc }, (_, i) => ({ bsc: `${pre}BSC-${Math.floor(i / C.racksPerBsc) + 1}`, rack: (i % C.racksPerBsc) + 1 })));
    }
    if (C.aux.cb) for (let b = 1; b <= C.bscPerContainer; b++) devices.push(aux("cb", `CB-${b}`, `${cname} DC Şalter ${b}`, base + PORT_OFFSETS.cb(b), b));
    if (C.aux.dcMeter) devices.push(aux("dc-meter", "DC-METER-1", `${cname} DC Metre`, base + PORT_OFFSETS.dcMeter, 1));
    for (let k = 1; k <= C.aux.dcOutput; k++) devices.push(aux("dc-output", `DC-${k}`, `${cname} DC Çıkış ${k}`, base + PORT_OFFSETS.dcOutput(k), k));
    if (C.aux.pm5340) devices.push(aux("energy-analyzer", "PM5340-1", `${cname} Enerji Analizörü`, base + PORT_OFFSETS.pm5340, 1));
    if (C.aux.imd) devices.push(aux("imd", "IMD-1", `${cname} IMD`, base + PORT_OFFSETS.imd, 1));
    if (C.aux.fss) devices.push(aux("fss", "FSS-1", `${cname} FSS`, base + PORT_OFFSETS.fss, 1));
    if (C.aux.controlPanelIo) devices.push(aux("control-panel-io", "CONTROL-PANEL-IO-1", `${cname} Kontrol Paneli IO`, base + PORT_OFFSETS.controlPanelIo, 1));

    function aux(type: SiteDeviceType, deviceId: string, name: string, port: number, index: number): SiteDevice {
      return { key: `${pre}${deviceId}`, deviceId, name, type, scope: "container", container: c, port, config: instantiate(type, deviceId, name, port), index };
    }
  }

  // — saha (field) cihazları: PCS + OG istasyonları —
  const fb = net.fieldPortBase;
  if (spec.pcs.perContainer > 0) {
    for (let c = 1; c <= C.count; c++) {
      for (let b = 1; b <= C.bscPerContainer; b++) {
        const n = (c - 1) * spec.pcs.perContainer + b;
        const key = `PCS-${n}`;
        const fd = feederOf(c);
        devices.push({
          key,
          deviceId: key,
          name: `PCS ${n} (BESS#${c})`,
          type: "wattox-pcs",
          scope: "field",
          port: fb + n,
          bmsPort: fb + 100 + n,
          config: instantiate("wattox-pcs", key, `PCS ${n} (BESS#${c})`, fb + n),
          index: n,
          pair: `C${c}.BSC-${b}`,
          container: c,
          ...(fd ? { feeder: fd } : {}),
        });
      }
    }
  }
  spec.mv.stations.forEach((st, i) => {
    devices.push({ key: st.id, deviceId: st.id, name: st.name ?? st.id, type: "demo-mv-station", scope: "field", port: fb + 200 + i + 1, config: instantiate("demo-mv-station", st.id, st.name ?? st.id, fb + 200 + i + 1), index: i + 1 });
  });

  // port çakışması denetimi
  const used = new Map<number, string>();
  for (const d of devices) {
    for (const p of [d.port, d.bmsPort, d.connector?.port]) {
      if (p === undefined) continue;
      const prev = used.get(p);
      if (prev) throw new Error(`[site] port çakışması ${p}: ${prev} ↔ ${d.key}`);
      used.set(p, d.key);
    }
  }
  return { spec, baseDir, templatesDir, devices, zones, mappings };
}
