// LGES JF1 hücre modeli (3P grup = raftaki tek seri eleman).
// Kaynaklar:
//  • Grid JF1 1CP Pack Spec (EP077170PCB2, Rev AE): 3P24S, 169.8 Ah, 77.28 V nom,
//    hücre 2.5–3.65 V işletme, DCIR 1.261–2.261 mΩ (hücre).
//  • JF1 B-LINK Rack Spec v1.2: 17 paket seri → 408S3P, 1101.6–1468.8 V, 223.074 kWh.
//  • SOC→raf gerilim tablosu (packages/simulators/src/bsc/bsc-math.ts) ÷ 408 → OCV.
//  • JF1 1CP Battery Thermal Sim v1.0: 1CP @23°C maks. ısı atımı 162.8 W/paket (BOL).

import { interp } from "../../core/util";

export const SERIES_PER_RACK = 408;
export const PACKS_PER_RACK = 17;
export const CELLS_PER_PACK = 24;
export const TEMP_SENSORS_PER_PACK = 4;
export const RACK_CAPACITY_AH = 169.8;
export const RACK_NOMINAL_V = 1313.76;
export const RACK_ENERGY_KWH = 223.074;
/** 1CP: raf başına anma şarj/deşarj gücü (paket 13.122 kW × 17). */
export const RACK_POWER_1CP_KW = 223.07;

const SOC_PTS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
const RACK_V_PTS = [
  1101.6, 1224, 1272.96, 1297.44, 1313.76, 1326, 1334.16, 1342.32, 1348.44, 1352.52, 1356.6, 1360.68,
  1366.8, 1374.96, 1387.2, 1403.52, 1423.92, 1436.16, 1456.56, 1464.72, 1468.8,
];
const CELL_OCV_PTS = RACK_V_PTS.map((v) => v / SERIES_PER_RACK);

/** Hücre açık devre gerilimi (V) — SOC %, sıcaklık etkisi (LFP: ~-0.1 mV/K, ihmal edilebilir). */
export function cellOcv(socPct: number, tempC = 25): number {
  return interp(socPct, SOC_PTS, CELL_OCV_PTS) + (tempC - 25) * -0.0001;
}

/** OCV → SOC (ters tablo; düz bölgede belirsizliği bilerek kabul eder — BMS de böyle). */
export function socFromOcv(v: number): number {
  return interp(v, CELL_OCV_PTS, SOC_PTS);
}

/**
 * 3P grup ohmik direnci (Ω) — sıcaklık bağımlı.
 * Hücre DCIR orta değer ~1.76 mΩ → 3P grup ~0.59 mΩ. Burada ani (ohmik) kısım %55,
 * kalan polarizasyon RC ile modellenir.
 */
export function groupR0(tempC: number, factor = 1): number {
  const r25 = 0.00059 * 0.55;
  const k = Math.exp(3200 * (1 / (273.15 + tempC) - 1 / 298.15)); // Arrhenius benzeri
  return r25 * Math.min(4, Math.max(0.7, k)) * factor;
}
export const GROUP_R1 = 0.00059 * 0.45; // polarizasyon direnci
export const RC_TAU_S = 45; // polarizasyon zaman sabiti

/**
 * Paket ısı üretimi (W) — LGES termal simülasyonuna kalibre: 1CP (~170 A) → ~163 W/paket.
 * Q = I² · R_heat ; R_heat = 163 / 170² ≈ 5.64 mΩ/paket.
 */
export const PACK_R_HEAT = 163 / (170 * 170);
/** Paket fan ısısı (W/paket) — termal sim: 10.46 W. */
export const PACK_FAN_HEAT_W = 10.46;
/** Paket ısıl kapasitesi (J/K): 107 kg × ~1050 J/kgK. */
export const PACK_HEAT_CAP = 107 * 1050;
/** Paket → raf havası ısıl direnç (K/W): fan çalışırken / dururken. */
export const PACK_RTH_FAN = 0.055;
export const PACK_RTH_NOFAN = 0.16;
