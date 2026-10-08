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
 * Raf register tablosu satırları (referans BSC_RACK_REGISTERS düzeni).
 * Canlı raf telemetrisi + deterministik türetim; kalan alanlar referans
 * değerleriyle doldurulur (gerçek simülatör sonra).
 */
export function rackRegisters(
  input: PackInput,
  rackNo: number,
  bank: { soc: number; soh: number; vdc: number; chgLimitKw?: number; disLimitKw?: number; online?: number },
): RackRegisterRow[] {
  const rooms = Math.max(1, Math.round((100 - input.soh) * 0.4) + 20);
  const base = 30170 + 150 * (rackNo - 1);
  const addr = (off: number): string => String(base + off);
  const chg = (bank.chgLimitKw ?? 160) / 8;
  const dis = (bank.disLimitKw ?? 160) / 8;
  return [
    { name: "Pack count", address: addr(0), value: String(PACKS_PER_RACK) },
    { name: "Rack state", address: addr(2), value: "3 · Running" },
    { name: "Status flags", address: addr(4), value: "idle · DC line closed · ready" },
    { name: "Component status", address: addr(6), value: "PC open · MC+ closed · MC− closed · CB closed · pack fans idle · BPU fan idle" },
    { name: "Component feedback", address: addr(8), value: "fuse closed · MC+/MC− closed · CB closed" },
    { name: "Heartbeat", address: addr(10), value: "counting" },
    { name: "Live units", address: addr(12), value: String(PACKS_PER_RACK) },
    { name: "Balancing time", address: addr(14), value: `${rooms * 12} s` },
    { name: "SOC", address: addr(16), value: `${input.soc.toFixed(2)} %` },
    { name: "SOH", address: addr(18), value: `${input.soh.toFixed(2)} %` },
    { name: "Charge limit", address: addr(20), value: `${chg.toFixed(1)} kW` },
    { name: "Discharge limit", address: addr(22), value: `${dis.toFixed(1)} kW` },
    { name: "Voltage", address: addr(24), value: `${input.v.toFixed(1)} V` },
    { name: "Current", address: addr(26), value: `${(input.soc - 50 > 0 ? 20 : -20).toFixed(1)} A` },
    { name: "Diagnosis voltage", address: addr(28), value: "0x0000" },
    { name: "Diagnosis temperature", address: addr(30), value: "0x0000" },
    { name: "Cell V avg", address: addr(32), value: `${(input.v / input.cellsSeries).toFixed(4)} V` },
    { name: "Cell V max", address: addr(34), value: `${(input.v / input.cellsSeries + 0.012).toFixed(4)} V` },
    { name: "Cell V min", address: addr(36), value: `${(input.v / input.cellsSeries - 0.012).toFixed(4)} V` },
    { name: "Cell Vmax location", address: addr(38), value: `pack ${packMarkers(input).vMaxPack} · cell 7` },
    { name: "Cell Vmin location", address: addr(40), value: `pack ${packMarkers(input).vMinPack} · cell 19` },
    { name: "T max", address: addr(42), value: `${input.temp.toFixed(1)} °C` },
    { name: "T min", address: addr(44), value: `${(input.tmin ?? input.temp - 1.4).toFixed(1)} °C` },
    { name: "T avg", address: addr(46), value: `${(input.temp - 0.7).toFixed(1)} °C` },
    { name: "T max location", address: addr(48), value: `pack ${packMarkers(input).tMaxPack}` },
    { name: "T min location", address: addr(50), value: `pack ${packMarkers(input).tMinPack}` },
    { name: "ΔT rack", address: addr(52), value: `${(input.temp - (input.tmin ?? input.temp - 1.4) + 1.4).toFixed(1)} °C` },
    { name: "ΔT pack", address: addr(54), value: "2.4 °C" },
    { name: "MC open count", address: addr(56), value: String(38 + rackNo * 3) },
    { name: "Calibration info", address: addr(58), value: "0" },
  ];
}
