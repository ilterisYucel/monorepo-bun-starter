import raw from "./demo-registers.json";

/**
 * Admin veri kataloğu — referans konsol `dist/registers.json` portu (SPEC UC-8).
 * BSC/PCS/HVAC register katalogları + rack registerları + komutlar + alarmlar +
 * poll planları + ekran öğesi eşlemesi (49) + cihaz IP planı (54, referans).
 * Saf veri + saf yardımcılar; IO yok.
 */

export interface DemoRegister {
  id: string;
  name: string;
  addr?: number;
  offset?: number;
  fc?: number;
  type?: string;
  scale?: number;
  unit?: string;
  prio: string;
  note?: string;
  access?: string;
  param?: string;
  enum?: Record<string, string>;
  /** Kaynak katalog (bsc/pcs/hvac/BSC rack). */
  src?: string;
}

export interface DemoDeviceMeta {
  id: string;
  vendor: string;
  model: string;
  protocol: string;
  port: number;
  unitId: number;
  doc?: string;
}

export interface DemoMappingEntry {
  key: string;
  label: string;
  shownOn: string;
  device: string;
  register: string;
}

export interface DemoDevicePlan {
  id: string;
  kind: string;
  unit: number;
  bank?: string;
  ip: string;
  port: number;
  unitId: number;
}

export interface DemoPollPlan {
  fc: number;
  from: number;
  count: number;
  every: string;
  what: string;
}

export type DemoCatalogKey = "bsc" | "pcs" | "hvac" | "cmd-bsc" | "cmd-pcs" | "cmd-hvac";

const R = raw as unknown as {
  bsc: {
    device: DemoDeviceMeta;
    registers: DemoRegister[];
    rack: { base: number; stride: number; registers: Array<Omit<DemoRegister, "prio">> };
    commands: Record<string, number>;
    pollPlan: DemoPollPlan[];
  };
  pcs: {
    device: DemoDeviceMeta;
    registers: DemoRegister[];
    faultBits: Record<string, Record<string, string>>;
    pollPlan: DemoPollPlan[];
  };
  hvac: {
    device: DemoDeviceMeta;
    registers: DemoRegister[];
    alarms: DemoRegister[];
    pollPlan: DemoPollPlan[];
    powerEstimate: Record<string, unknown>;
  };
  mapping: DemoMappingEntry[];
  devices: DemoDevicePlan[];
};

export const DEMO_BSC = R.bsc;
export const DEMO_PCS = R.pcs;
export const DEMO_HVAC = R.hvac;
export const DEMO_MAPPING: DemoMappingEntry[] = R.mapping;
export const DEMO_DEVICES: DemoDevicePlan[] = R.devices;

/** Rack register adresi: base + 150·(rack−1) + offset. */
export const rackAddr = (rack: number, offset: number): number =>
  R.bsc.rack.base + R.bsc.rack.stride * (rack - 1) + offset;

const rackRegisters: DemoRegister[] = R.bsc.rack.registers.map((r) => ({
  ...r,
  fc: 4,
  prio: "rack",
  src: "BSC rack",
}));

const withSrc = (regs: DemoRegister[], src: string): DemoRegister[] => regs.map((r) => ({ ...r, src }));

const BSC_MAIN = withSrc(R.bsc.registers.filter((r) => r.prio !== "command"), "BSC");
const BSC_CMD = withSrc(R.bsc.registers.filter((r) => r.prio === "command"), "BSC");
const PCS_MAIN = withSrc(R.pcs.registers.filter((r) => r.prio !== "command"), "PCS");
const PCS_CMD = withSrc(R.pcs.registers.filter((r) => r.prio === "command"), "PCS");
const HVAC_MAIN = withSrc(R.hvac.registers.filter((r) => r.prio !== "command"), "HVAC").concat(
  withSrc(R.hvac.alarms, "HVAC"),
);
const HVAC_CMD = withSrc(R.hvac.registers.filter((r) => r.prio === "command"), "HVAC");

/** Mapping dropdown'u için katalog grupları (referans `CATALOG`). */
export function demoCatalog(key: DemoCatalogKey): DemoRegister[] {
  switch (key) {
    case "bsc":
      return [...BSC_MAIN, ...rackRegisters];
    case "cmd-bsc":
      return BSC_CMD;
    case "pcs":
      return PCS_MAIN;
    case "cmd-pcs":
      return PCS_CMD;
    case "hvac":
      return HVAC_MAIN;
    case "cmd-hvac":
      return HVAC_CMD;
    default:
      return [];
  }
}

/** Tüm register id → kayıt (live value + trace eşlemesi). */
export const ALL_DEMO_REGISTERS: Record<string, DemoRegister> = Object.fromEntries(
  (["bsc", "cmd-bsc", "pcs", "cmd-pcs", "hvac", "cmd-hvac"] as DemoCatalogKey[])
    .flatMap((k) => demoCatalog(k))
    .map((r) => [r.id, r]),
);

/** Adres metni — rack ise stride, aksi sabit decimal (hex yok). */
export function addrText(r: DemoRegister | undefined): string {
  if (!r) return "—";
  if (r.offset !== undefined) return `${rackAddr(1, r.offset)} + 150·(rack−1)`;
  if (r.addr === undefined) return "—";
  return String(r.addr);
}

/** Type · scale · unit metni. */
export function typeText(r: DemoRegister | undefined): string {
  if (!r) return "";
  const scale = r.scale ? ` × ${r.scale}` : "";
  const unit = r.unit ? ` · ${r.unit}` : "";
  return `${r.type ?? ""}${scale}${unit}`;
}

/** Termal model sabitleri (referans topology `thermal`). */
export const DEMO_THERMAL = {
  cBattKJK: 16 * 1954 * 1.0,
  cAirKJK: 2500,
  uaBattAirKWK: 20,
  uaWallKWK: 0.46,
  solarKW: 1.84,
  intKW: 0.47,
  coolKW: 80,
  heatKW: 24,
  airflowKWK: 0.97,
  pcsMaxMW: 1.725,
} as const;
