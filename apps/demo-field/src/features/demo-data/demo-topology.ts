import type { NovaTopology } from "@gd-monorepo/ui";

/**
 * DEMO-FIELD site topolojisi (SPEC UC-1/T-1, K1). gdems `SITE_TOPOLOGY`
 * (ÜNSAL DGES GDE-202030) ile hizalıdır: 9 sanal ünite, fider **A→H04 (1–5)**,
 * **B→H05 (6–9)**. Banka↔BSC↔PCS eşlemesi mapFieldToMimicState'te uygulanır.
 * Gerçek MV modeli olmadığından station hücreleri burada tanımlıdır; canlı
 * pozisyonlar demo-MV cihazı telemetrisinden gelir (yoksa 'closed' varsayılan).
 *
 * `unit.bus`/`sections`/`rack`/`auxLoads`/`fss` alanları UC-4 (Container SCADA)
 * ve UC-5 (Devices/AUX) panellerinin veri kaynağıdır.
 */
export const DEMO_TOPOLOGY: NovaTopology = {
  id: "GDE-202030",
  name: "ÜNSAL DGES",
  location: "Polatlı, Ankara",
  powerMW: 30,
  energyMWh: 32.112,

  station: {
    name: "MV STATION #1",
    rating: "36 kV · 630 A · 16 kA · SF6",
    busLabel: "BUSBAR 34.5 kV · 630 A",
    nominalKV: 34.5,
    poiLabel: "MV POI",
    poiCable: "2×(1×400/25) NA2XSY",
    cells: [
      { id: "H01", label: "Incomer", kind: "cb", role: "incomer", motor: true, es: true, esMotor: false, ct: "750/5 A · 5P10", ctPrimary: 750 },
      { id: "H02", label: "Aux disconnector", kind: "lbs", role: "aux", motor: false, auxTr: true },
      { id: "H03", label: "Metering", kind: "vt", role: "measurement", ct: "750/5 A · Cl 0.5 Fs5", vt: "36/√3 – 0.1/√3 kV · Cl 0.5 · 60 VA", ctPrimary: 750 },
      { id: "H04", label: "Feeder A CB", kind: "cb", role: "feeder", feeder: "A", motor: true, es: true, esMotor: false, ct: "400/5 A · 5P10", ctPrimary: 400 },
      { id: "H05", label: "Feeder B CB", kind: "cb", role: "feeder", feeder: "B", motor: true, es: true, esMotor: false, ct: "300/5 A · 5P10", ctPrimary: 300 },
    ],
  },

  feeders: {
    A: { cell: "H04", side: "L", units: [1, 2, 3, 4, 5] },
    B: { cell: "H05", side: "R", units: [6, 7, 8, 9] },
  },

  unit: {
    container: "LGES 40 ft",
    containerMWh: 3.568,
    banks: ["A", "B"],
    racksPerBank: 8,
    rackKWh: 223,
    cellsSeries: 408,
    bus: { ratingA: 2000, rackFuseA: 220, dcCB: "SYW6GZ-4000", imd: "Bender isoPV1685RTU" },
    rack: { packs: 17, bpu: true, packKWh: 13.118, cellsPerPack: 24 },
    sections: [
      { id: 1, bank: "A", racks: [1, 2, 3, 4], hvac: [1, 2] },
      { id: 2, bank: "A", racks: [5, 6, 7, 8], hvac: [3, 4] },
      { id: 3, bank: "B", racks: [9, 10, 11, 12], hvac: [5, 6] },
      { id: 4, bank: "B", racks: [13, 14, 15, 16], hvac: [7, 8] },
    ],
    auxLoads: [
      { key: "hvac", label: "HVAC · 8 × MC90HDNC1R (220 VAC)", kVA: 32.8, peakKVA: 45.76, ups: false },
      { key: "fans", label: "Rack fans · 8 × SMPS 24 VDC", kVA: 4.7, ups: false },
      { key: "rackCtl", label: "Rack control · SMPS 24 VDC", kVA: 0.557, ups: true },
      { key: "ctl", label: "Control panel", kVA: 1.0, ups: true },
      { key: "dccb", label: "DC breakers · 2 × SYW6GZ-4000", kVA: 0.88, ups: true },
      { key: "fss", label: "Fire suppression system", kVA: 0.178, ups: true },
      { key: "bsc", label: "BSC IPC · network · IMD", kVA: 0.267, ups: true },
      { key: "light", label: "Lighting · 5 × 30 W LED", kVA: 0.15, ups: true },
    ],
    fss: {
      panel: "Sigma XT (K11031M2)",
      zones: ["Smoke detection", "Heat detection", "Gas detection (H₂)"],
      releaseDelayS: 30,
      detectors: 2,
      detector: "Vigilex VIGI-DT1",
      h2AlarmLEL: 10,
      vents: "Vigilex explosion vent panels",
    },
    dcRangeV: [1000, 1500],
    pcsAcV: 690,
    pcsKVA: 1725,
    pcsMaxMW: 1.725,
    trKVA: 3750,
    trRatio: "34.5/0.69 kV",
    trVector: "Dy11y11",
    lvLabel: "690 V",
    rmu: [
      { id: "H01", label: "Load-break switch (in)", kind: "lbs", motor: false },
      { id: "H02", label: "Transformer CB", kind: "cb", motor: true },
      { id: "H03", label: "Load-break switch (out)", kind: "lbs", motor: false },
      { id: "ES", label: "Earthing switch (TR side)", kind: "es", motor: false },
    ],
  },

  aux: {
    trKVA: 400,
    trRatio: "34.5/0.4 kV",
    trVector: "Dyn11",
    lvV: 400,
    station: "Station aux (protection, SCADA, RMU motors, lighting)",
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
    tripC: 32,
    zeroPowerMW: 0.2,
    calibrationIntervalDays: 30,
  },
};

/** Demo sanal ünite sayısı (SPEC K1 — 9 ünite). */
export const DEMO_UNIT_COUNT = 9;

/**
 * Pack künyesi (UC-13 DEV — referans `topology.js#unit.pack` birebir).
 * LGES Grid JF1 1CP Pack EP077170PCB2 (Product Specification Rev AE).
 * Pack şeması (`DemoPackSchematic`) + spec tablosu bu sabiti kullanır.
 */
export const DEMO_PACK_SPEC = {
  model: "EP077170PCB2",
  name: "Grid JF1 1CP Pack",
  config: "3P24S",
  series: 24,
  parallel: 3,
  cells: 72,
  cma: { count: 4, config: "3P6S", series: 6, parallel: 3, cells: 18 },
  capAh: 169.8,
  vNom: 77.28,
  kWh: 13.122,
  vChgEnd: 87.6,
  vDisEnd: 64.8,
  iStd: 42.5,
  iEnd: 8.5,
  pMaxKW: 13.122,
  iPeak: 218.7,
  restAfterChgH: 2,
  restAfterDisH: 8,
  dielectricKV: 4.15,
  ip: "IP20",
  cooling: "Air (front fan)",
  opAmbC: [15, 30] as [number, number],
  recC: "23 ± 4",
  dimMM: { depth: 1357.4, width: 437, widthMtg: 475, height: 114.4 },
  kg: 107,
  bms: "Gen3 PBMS",
  cell: {
    name: "JF1",
    capAh: [56.6, 59.5] as [number, number],
    vNom: 3.22,
    vRange: [2.5, 3.65] as [number, number],
    wh: 182.25,
    dcirMOhm: [1.261, 2.261] as [number, number],
    g: 1077,
  },
} as const;

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
