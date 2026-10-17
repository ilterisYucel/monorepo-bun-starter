import registersCatalog from "./demo-registers.json";

/**
 * BESS pack verisi türetimi (SPEC UC-4, D-1). Pack seviyesi Modbus map'inde
 * yoktur (referans da sim'den türetir); rack telemetrisinden DETERMİNİSTİK
 * olarak türetilir (rastgele YOK). Saf — test edilir.
 */

export interface PackInput {
  no: number;
  soc: number;
  soh: number;
  /** Raf DC gerilim (V). */
  v: number;
  /** Raf temsili sıcaklık (°C). */
  temp: number;
  tmin?: number;
  /** Seri hücre sayısı (17×24 = 408). */
  cellsSeries: number;
}

export interface PackData {
  no: number;
  soc: number;
  soh: number;
  cells: number[];
  cavg: number;
  cmax: number;
  cmin: number;
  cmaxId: number;
  cminId: number;
  ts: number[];
  tavg: number;
  tmax: number;
  tmin: number;
  /** Hücre dengeleme bayrakları. */
  bal: boolean[];
  /** PCB sıcaklıkları (°C). */
  pcb: [number, number];
}

/** Determinist hash (0…1) — Math.random yerine. */
function hsh(a: number, b: number): number {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export const PACKS_PER_RACK = 17;
export const CELLS_PER_PACK = 24;
export const TC_PER_PACK = 4;

/**
 * Tek pack için deterministik hücre voltajları + sıcaklık sensörleri üretir.
 * `packIndex` 0..16; hücre aralığı SOF'a bağlı sapma ile raf geriliminden türetilir.
 */
export function packData(input: PackInput, packIndex: number): PackData {
  const no = packIndex + 1;
  const avgV = input.v / input.cellsSeries;
  const dvR = Math.max(0.004, (100 - input.soh) * 0.0006);
  const off = (hsh(input.no, no) - 0.5) * dvR * 0.35;
  const cells = Array.from({ length: CELLS_PER_PACK }, (_, c) =>
    avgV + off + (hsh(input.no * 31 + no, c) - 0.5) * dvR * 0.45,
  );
  const tBase = input.temp;
  const ts = Array.from(
    { length: TC_PER_PACK },
    (_, c) => tBase - c * 0.18 - hsh(no, c + input.no) * 0.25,
  );
  const cmax = Math.max(...cells);
  const cmin = Math.min(...cells);
  const cavg = cells.reduce((a, x) => a + x, 0) / CELLS_PER_PACK;
  const tmax = Math.max(...ts);
  const tmin = Math.min(...ts);
  const soc = input.soc + (cavg - avgV) * 120;
  const soh = input.soh + (hsh(input.no, no + 50) - 0.5) * 0.8;
  const bal = cells.map((v) => v - cmin > 0.012);
  return {
    no,
    soc,
    soh,
    cells,
    cavg,
    cmax,
    cmin,
    cmaxId: cells.indexOf(cmax) + 1,
    cminId: cells.indexOf(cmin) + 1,
    ts,
    tavg: ts.reduce((a, x) => a + x, 0) / TC_PER_PACK,
    tmax,
    tmin,
    bal,
    pcb: [tBase + 3.1, tBase + 2.6],
  };
}

/** Rafın tüm pack'leri (0..16). */
export function rackPacks(input: PackInput): PackData[] {
  return Array.from({ length: PACKS_PER_RACK }, (_, k) => packData(input, k));
}

/**
 * Referans `packFill` (bess-scada.js): sıcaklık bandına göre kademeli
 * `rgba` dolgu — bant altı mavi, üstü kırmızı, ortada hot-rgb rampası.
 * Renk değişkenleri `--nm-cold-rgb` / `--nm-hot-rgb`.
 */
export function packFill(t: number, lo: number, hi: number): string {
  if (t < lo) {
    return `rgba(var(--nm-cold-rgb),${Math.min(0.9, 0.4 + (lo - t) * 0.12).toFixed(2)})`;
  }
  if (t > hi) {
    return `rgba(var(--nm-hot-rgb),${Math.min(0.95, 0.45 + (t - hi) * 0.1).toFixed(2)})`;
  }
  return `rgba(var(--nm-hot-rgb),${(0.06 + (0.3 * (t - lo)) / (hi - lo)).toFixed(2)})`;
}

/** JF1 TC map: 6 seviye × 3 pozisyon = 18 sensör (deterministik türetim). */
export const TC_LEVELS = 6;
export const TC_COLS = 3;

export function tcMap18(input: PackInput & { packIndex?: number }): number[] {
  const base = input.temp;
  const out: number[] = [];
  for (let lv = 0; lv < TC_LEVELS; lv++) {
    for (let c = 0; c < TC_COLS; c++) {
      out.push(Number((base + (hsh(input.no * 7 + lv, c + 3) - 0.4) * 3.2 - lv * 0.15).toFixed(1)));
    }
  }
  return out;
}

/** Pack seviyesinde uç konumlar (pack kolonundaki ▲/▼ işaretçileri). */
export interface PackMarkers {
  tMaxPack: number;
  tMinPack: number;
  vMaxPack: number;
  vMinPack: number;
}

export function packMarkers(input: PackInput): PackMarkers {
  const packs = rackPacks(input);
  let tMaxPack = 1;
  let tMinPack = 1;
  let vMaxPack = 1;
  let vMinPack = 1;
  packs.forEach((p, i) => {
    if (p.tmax > packs[tMaxPack - 1].tmax) tMaxPack = i + 1;
    if (p.tmin < packs[tMinPack - 1].tmin) tMinPack = i + 1;
    if (p.cmax > packs[vMaxPack - 1].cmax) vMaxPack = i + 1;
    if (p.cmin < packs[vMinPack - 1].cmin) vMinPack = i + 1;
  });
  return { tMaxPack, tMinPack, vMaxPack, vMinPack };
}

export interface RackRegisterRow {
  name: string;
  address: string;
  value: string;
  /** false → bu register device config'te poll edilmiyor (değer yok). */
  polled: boolean;
}

/**
 * LGES Flex BSC Rev AF raf offset'i → device config'teki telemetri taban adı
 * (" R<n>" son eki olmadan). Listede olmayan offset'ler (bit/diag blokları)
 * config'te raf başına poll edilmez → "not polled".
 */
const RACK_TELEMETRY_BY_OFFSET: Record<number, string> = {
  23: "Pack Count",
  24: "BMIC Count",
  25: "Temp Sensor Count",
  27: "PCB Temp Sensor Count",
  29: "Voltage Sensor Count",
  50: "Rack State",
  54: "Rack Heartbeat",
  55: "Live Unit Count",
  56: "Balancing Time",
  58: "Rack SOC",
  59: "Rack SOH",
  60: "Rack Charge Power Limit",
  62: "Rack Discharge Power Limit",
  64: "Rack Cell Sum Voltage",
  66: "Rack Current",
  84: "Rack Max Cell Voltage",
  85: "Rack Min Cell Voltage",
  86: "Rack Avg Cell Voltage",
  87: "Rack Max Cell Location",
  88: "Rack Min Cell Location",
  89: "Rack Max Pack Temp",
  90: "Rack Min Pack Temp",
  91: "Rack Avg Pack Temp",
  92: "Rack Max Temp Location",
  93: "Rack Min Temp Location",
  94: "Rack Max Diff Temp",
  95: "Rack Max Diff Temp Pack",
  100: "Rack MC Open Count",
  101: "Rack Calibration Info",
  103: "Rack Non-Balancing Period",
};

interface CatalogRackRegister {
  name: string;
  offset?: number;
  unit?: string;
  enum?: Record<string, string>;
}

const RACK_CATALOG: CatalogRackRegister[] = (
  registersCatalog as unknown as { bsc: { rack: { registers: CatalogRackRegister[] } } }
).bsc.rack.registers;

function formatValue(v: number, reg: CatalogRackRegister): string {
  const label = reg.enum?.[String(Math.round(v))];
  if (label !== undefined) return `${Math.round(v)} · ${label}`;
  const txt = Number.isInteger(v) ? String(v) : v.toFixed(Math.abs(v) < 10 ? 3 : 1);
  return reg.unit ? `${txt} ${reg.unit}` : txt;
}

/**
 * Raf register tablosu — LGES Rev AF raf katalogunun TAMAMI (v14
 * `registers.json`, 43 satır). Adres = 30170 + 150·(raf−1) + offset;
 * `rackNo` BSC-içi raf numarasıdır (1..8). Değerler YALNIZ canlı raf
 * telemetrisinden (`raw`: taban ad → değer) gelir; uydurma/türetme YOKTUR.
 * Config'te poll edilmeyen ya da henüz gelmemiş register "—" gösterir.
 */
export function rackRegisters(
  rackNo: number,
  raw: Record<string, number> | undefined,
): RackRegisterRow[] {
  const base = 30170 + 150 * (rackNo - 1);
  return RACK_CATALOG.filter((r) => r.offset !== undefined).map((reg) => {
    const off = reg.offset as number;
    const key = RACK_TELEMETRY_BY_OFFSET[off];
    const v = key !== undefined ? raw?.[key] : undefined;
    return {
      name: reg.name,
      address: String(base + off),
      value: v !== undefined ? formatValue(v, reg) : key === undefined ? "— not polled" : "— no data",
      polled: key !== undefined,
    };
  });
}

/* ── Busbar zone thermal history (referans `u.th` sim geçmişi muadili) ── */

/** Seçili busbar (banka) için canlı sıcaklık ankorları. */
export interface BusbarZoneAnchor {
  cellMax: number;
  cellMin: number;
  /** HVAC return air (°C). */
  air: number;
  /** HVAC supply air (°C). */
  sup: number;
  cooling: boolean;
  heating: boolean;
}

export interface BusbarZoneSample {
  t: number;
  tmin: number;
  tmax: number;
  tavg: number;
  air: number;
  sup: number;
}

export interface BusbarZonePhase {
  kind: "cool" | "heat";
  t0: number;
  t1: number;
}

export interface BusbarZoneHistory {
  samples: BusbarZoneSample[];
  phases: BusbarZonePhase[];
}

export const BUSBAR_WINDOW_MIN = 240;
export const BUSBAR_POINTS = 120;

/**
 * Busbar zone termal geçmişi — referans sim'in `u.th` kaynaşığının deterministik
 * muadili: konteyner telemetri geçmişi field tier'da tutulmadığından canlı
 * ankorlardan (banka hücre min/max + HVAC air/sup + cooling/heating) üretilir.
 * Math.random YOKTUR — hash tabanlı, tekrarlanabilir.
 */
export function busbarZoneHistory(
  anchor: BusbarZoneAnchor,
  seed: number,
  now: number,
  minutes = BUSBAR_WINDOW_MIN,
  points = BUSBAR_POINTS,
): BusbarZoneHistory {
  const step = (minutes * 60_000) / points;
  const t0 = now - minutes * 60_000;
  const mid = (anchor.cellMax + anchor.cellMin) / 2;
  const half = Math.max(0.6, (anchor.cellMax - anchor.cellMin) / 2);
  const samples: BusbarZoneSample[] = [];
  const cool: number[] = [];
  const heat: number[] = [];
  for (let i = 0; i < points; i++) {
    const p = i / points;
    const wob = Math.sin(p * Math.PI * 2 + seed) * 0.6 + (hsh(seed, i) - 0.5) * 0.5;
    const tavg = mid + wob;
    samples.push({
      t: t0 + i * step,
      tmin: tavg - half * (0.9 + 0.2 * hsh(seed + 2, i)),
      tmax: tavg + half * (0.9 + 0.2 * hsh(seed + 1, i)),
      tavg,
      air: anchor.air + Math.sin(p * Math.PI * 2 + 1) * 0.8 + (hsh(seed + 3, i) - 0.5) * 0.6,
      sup: anchor.sup + Math.cos(p * Math.PI * 2 + 2) * 0.8 + (hsh(seed + 4, i) - 0.5) * 0.4,
    });
    const w = Math.sin(p * Math.PI * 2 * 3 + seed);
    cool.push(anchor.cooling ? Math.max(0, 0.2 + 0.6 * w) : 0);
    heat.push(anchor.heating ? Math.max(0, 0.2 - 0.6 * w) : 0);
  }
  const phases: BusbarZonePhase[] = [];
  let cur: BusbarZonePhase | null = null;
  for (let i = 0; i < points; i++) {
    const kind = cool[i] > 0.05 ? "cool" : heat[i] > 0.1 ? "heat" : null;
    if (kind !== (cur?.kind ?? null)) {
      if (cur) cur.t1 = samples[i].t;
      cur = kind ? { kind, t0: samples[i].t, t1: samples[points - 1].t } : null;
      if (cur) phases.push(cur);
    }
  }
  return { samples, phases };
}
