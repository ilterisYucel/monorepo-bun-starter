import type { NovaTopology } from "@gd-monorepo/ui";

/**
 * DEMO-FIELD site topolojisi (SPEC UC-2/T-6). 6 sanal ünite: fider A = 1–3,
 * fider B = 4–6. Banka↔BSC↔PCS eşlemesi mapFieldToMimicState'te uygulanır.
 * Gerçek MV modeli olmadığından station hücreleri burada tanımlıdır; canlı
 * pozisyonlar demo-MV cihazı telemetrisinden gelir (yoksa 'closed' varsayılan).
 */
export const DEMO_TOPOLOGY: NovaTopology = {
  id: "DEMO-FIELD",
  name: "GD-PMS · SAHA DEMO",
  location: "Demo",
  powerMW: 30,
  energyMWh: 32.112,

  station: {
    name: "OG KÖŞK #1",
    rating: "36 kV · 630 A · 16 kA · SF6",
    busLabel: "BARA 34,5 kV · 630 A",
    nominalKV: 34.5,
    poiLabel: "OG POI",
    poiCable: "2×(1×400/25) NA2XSY",
    cells: [
      { id: "H01", label: "Gelen hücre", kind: "cb", role: "incomer", es: true, ct: "750/5 A · 5P10", ctPrimary: 750 },
      { id: "H02", label: "İç ihtiyaç ayr.", kind: "lbs", role: "aux" },
      { id: "H03", label: "Ölçü", kind: "vt", role: "measurement", ct: "750/5 A · Cl 0,5 Fs5", vt: "36/√3 – 0,1/√3 kV · Cl 0,5 · 60 VA", ctPrimary: 750 },
      { id: "H04", label: "Fider B kesici", kind: "cb", role: "feeder", feeder: "B", es: true, ct: "400/5 A · 5P10", ctPrimary: 400 },
      { id: "H05", label: "Fider A kesici", kind: "cb", role: "feeder", feeder: "A", es: true, ct: "300/5 A · 5P10", ctPrimary: 300 },
    ],
  },

  feeders: {
    A: { cell: "H05", side: "L", units: [1, 2, 3] },
    B: { cell: "H04", side: "R", units: [4, 5, 6] },
  },

  unit: {
    container: "LGES 40 ft",
    containerMWh: 3.568,
    banks: ["A", "B"],
    racksPerBank: 8,
    cellsSeries: 416,
    dcRangeV: [1000, 1500],
    pcsAcV: 690,
    pcsKVA: 1725,
    pcsMaxMW: 1.7,
    trKVA: 3750,
    trRatio: "34,5/0,69 kV",
    trVector: "Dy11",
    lvLabel: "690 V",
    rmu: [
      { id: "H01", label: "Ayırıcı", kind: "lbs" },
      { id: "H02", label: "Trafo kesici", kind: "cb" },
      { id: "H03", label: "Ayırıcı", kind: "lbs" },
    ],
  },

  limits: {
    socMin: 3.5,
    socMax: 97,
    tempMin: 19,
    tempMax: 25,
    derateC: 28,
    derateReleaseC: 24,
    dTdtWarn: 2,
    dvWarn: 50,
    sohInfo: 95,
  },
};

/** Demo sanal ünite sayısı (SPEC K6). */
export const DEMO_UNIT_COUNT = 6;

/** Demo MV istasyon cihazı (canlı station pozisyonu/kV/Hz + komutlar). */
export const DEMO_MV_DEVICE_ID = "DEMO-MV-1";

/** Field-tier cihazlar (unified telemetri kaynağı; konteyner payload'ında YOK). */
export const FIELD_DEVICE_IDS = ["PCS-1", "PCS-2", DEMO_MV_DEVICE_ID];

/** OG hücre aksiyonu → demo-MV cihaz config komut adı (UC-4). */
export function cellCommandName(
  cellId: string,
  action: "cb_open" | "cb_close" | "es_open" | "es_close",
): string {
  switch (action) {
    case "cb_open":
      return `${cellId}_open`;
    case "cb_close":
      return `${cellId}_close`;
    case "es_close":
      return `${cellId}_earth_close`;
    case "es_open":
      return `${cellId}_earth_open`;
  }
}

/** BSC/PCS cihaz eşlemesi: banka → BSC/PCS deviceId (SPEC K7). */
export const BANK_DEVICE_MAP = {
  A: { bsc: "BSC-1", pcs: "PCS-1" },
  B: { bsc: "BSC-2", pcs: "PCS-2" },
} as const;
