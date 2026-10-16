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
}

/**
 * Raf register tablosu satırları — referans `BSC_RACK_REGISTERS` listesiyle
 * birebir (isim + offset). Adres = 30170 + 150·(raf−1) + offset; `rackNo`
 * BSC-içi raf numarasıdır (1..8). Değerler canlı raf telemetrisi + deterministik
 * türetimden gelir.
 */
export function rackRegisters(
  input: PackInput,
  rackNo: number,
  bank: { soc: number; soh: number; vdc: number; chgLimitKw?: number; disLimitKw?: number; online?: number },
): RackRegisterRow[] {
  const base = 30170 + 150 * (rackNo - 1);
  const addr = (off: number): string => String(base + off);
  const chg = (bank.chgLimitKw ?? 160) / 8;
  const dis = (bank.disLimitKw ?? 160) / 8;
  const avgV = input.v / input.cellsSeries;
  const m = packMarkers(input);
  const balancing = Math.abs(input.soc - bank.soc) > 0.15;
  return [
    { name: "Rack State", address: addr(50), value: "9 · Normal" },
    { name: "Rack Status Flags", address: addr(51), value: `${balancing ? "balancing · " : ""}idle · DC line closed · ready` },
    { name: "Pack Count", address: addr(23), value: `${PACKS_PER_RACK}` },
    { name: "Component Status (PC/MC+/MC−/CB, pack fans, BPU fan)", address: addr(52), value: "PC open · MC+ closed · MC− closed · CB closed · pack fans idle · BPU fan idle" },
    { name: "Component Feedback (MC+/MC−/CB/fans/fuse)", address: addr(53), value: "fuse closed · MC+/MC− closed · CB closed" },
    { name: "Heart Beat (from RBMS)", address: addr(54), value: "counting" },
    { name: "Live Unit Count (awake PBMS)", address: addr(55), value: `${PACKS_PER_RACK}` },
    { name: "Remaining Balancing Time", address: addr(56), value: balancing ? `${Math.round(Math.abs(input.soc - bank.soc) * 9000)} s` : "0 s" },
    { name: "Rack SOC", address: addr(58), value: `${input.soc.toFixed(2)} %` },
    { name: "Rack SOH", address: addr(59), value: `${input.soh.toFixed(2)} %` },
    { name: "Rack Charge Power Limit", address: addr(60), value: `${chg.toFixed(1)} kW` },
    { name: "Rack Discharge Power Limit", address: addr(62), value: `${dis.toFixed(1)} kW` },
    { name: "Rack Cell Sum Voltage", address: addr(64), value: `${input.v.toFixed(1)} V` },
    { name: "Rack Current", address: addr(66), value: `${(input.soc - 50 > 0 ? 20 : -20).toFixed(1)} A` },
    { name: "Diag: Rack/Pack Deviation, Under/Over Voltage", address: addr(68), value: "0x0000" },
    { name: "Diag: Under/Over Temperature, Over Discharge Current", address: addr(70), value: "0x0000" },
    { name: "Rack Max Cell Voltage", address: addr(84), value: `${(avgV + 0.012).toFixed(4)} V` },
    { name: "Rack Min Cell Voltage", address: addr(85), value: `${(avgV - 0.012).toFixed(4)} V` },
    { name: "Rack Avg Cell Voltage", address: addr(86), value: `${avgV.toFixed(4)} V` },
    { name: "Max Cell Location (pack / cell)", address: addr(87), value: `pack ${m.vMaxPack} · cell 7` },
    { name: "Min Cell Location (pack / cell)", address: addr(88), value: `pack ${m.vMinPack} · cell 19` },
    { name: "Rack Max Pack Temperature", address: addr(89), value: `${input.temp.toFixed(1)} °C` },
    { name: "Rack Min Pack Temperature", address: addr(90), value: `${(input.tmin ?? input.temp - 1.4).toFixed(1)} °C` },
    { name: "Rack Avg Pack Temperature", address: addr(91), value: `${(input.temp - 0.7).toFixed(1)} °C` },
    { name: "Max Temperature Location (pack / sensor)", address: addr(92), value: `pack ${m.tMaxPack}` },
    { name: "Min Temperature Location (pack / sensor)", address: addr(93), value: `pack ${m.tMinPack}` },
    { name: "Max Difference of Temperature in Rack", address: addr(94), value: `${(input.temp - (input.tmin ?? input.temp - 1.4) + 1.4).toFixed(1)} °C` },
    { name: "Max Difference of Temperature in Pack", address: addr(95), value: "2.4 °C" },
    { name: "MC Open Count", address: addr(100), value: String(38 + rackNo * 3) },
    { name: "Calibration Information", address: addr(101), value: "0" },
  ];
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
