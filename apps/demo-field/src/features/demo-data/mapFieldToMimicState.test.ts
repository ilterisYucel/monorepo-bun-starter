import { describe, it, expect } from "vitest";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { FieldContainer } from "./demoApi";
import { DEMO_TOPOLOGY } from "./demo-topology";
import { fanOutUnits } from "./fanOutUnits";
import { mapFieldToMimicState } from "./mapFieldToMimicState";
import type { NovaUnitState } from "@gd-monorepo/ui";

function T(
  deviceId: string,
  name: string,
  value: number | boolean | string,
  tags?: Record<string, string>,
): TelemetryData {
  return {
    deviceId,
    name,
    description: name,
    value,
    unit: "",
    timestamp: "2026-01-01T00:00:00.000Z",
    ...(tags ? { tags } : {}),
  };
}

function container(telemetry: TelemetryData[]): FieldContainer {
  return {
    containerId: "container-1",
    connectionStatus: "connected",
    latestTelemetry: telemetry,
  };
}

const REAL_TELEMETRY: TelemetryData[] = [
  T("BSC-1", "SOC", 60, { canonical: "soc", rack_id: "system" }),
  T("BSC-1", "SOH", 98, { canonical: "soh", rack_id: "system" }),
  T("BSC-1", "Voltage", 1300, { canonical: "voltage", rack_id: "system" }),
  T("BSC-1", "Rack Max Pack Temp R1", 24, { rack_id: "1" }),
  T("BSC-1", "Rack Min Pack Temp R1", 20, { rack_id: "1" }),
  T("BSC-1", "Rack Max Cell Voltage R1", 3.4),
  T("BSC-1", "Rack Min Cell Voltage R1", 3.35),
  T("BSC-1", "Rack SOC R1", 61),
  T("BSC-1", "Rack Cell Sum Voltage R1", 1298),
  T("BSC-1", "Rack Current R1", 120),
  T("BSC-2", "SOC", 55, { canonical: "soc", rack_id: "system" }),
  T("BSC-2", "SOH", 97, { canonical: "soh", rack_id: "system" }),
  T("BSC-2", "Voltage", 1290, { canonical: "voltage", rack_id: "system" }),
  T("PCS-1", "PCS Operation Status", 2),
  T("PCS-1", "Grid Active Power", -600),
  T("PCS-1", "IGBT Temp A1", 45),
  T("PCS-2", "PCS Operation Status", 3),
  T("PCS-2", "Grid Active Power", 400),
  T("PCS-2", "IGBT Temp A1", 41),
  T("DEMO-MV-1", "H05 Breaker", true),
  T("DEMO-MV-1", "Bus Voltage", 34.5),
  T("DEMO-MV-1", "Frequency", 50),
];

describe("fanOutUnits (FR-2.1)", () => {
  const proto: Omit<NovaUnitState, "n"> = {
    rmu: { H01: "closed", H02: "closed", H03: "closed", es: false },
    banks: [{ id: "A", soc: 50, soh: 100, vdc: 1300, tmax: 24, dvmV: 0, racks: [24], dcb: "closed" }],
    pcs: [{ id: "A", state: "dis", pMW: 1.2, igbtC: 40, limited: false }],
  };

  it("verilen sayıda ünite üretir ve deterministiktir", () => {
    const a = fanOutUnits(proto, 9);
    const b = fanOutUnits(proto, 9);
    expect(a).toHaveLength(9);
    expect(a).toEqual(b);
    expect(a[0].n).toBe(1);
    expect(a[8].n).toBe(9);
  });

  it("PCS gücünü ünite sayısına böler", () => {
    const [u] = fanOutUnits(proto, 9);
    expect(u.pcs[0].pMW).toBeCloseTo(1.2 / 9, 6);
  });
});

describe("mapFieldToMimicState (FR-2.2..FR-2.6)", () => {
  it("tek konteyneri 9 üniteye fan-out eder", () => {
    const state = mapFieldToMimicState([container(REAL_TELEMETRY)], DEMO_TOPOLOGY);
    expect(state.units).toHaveLength(9);
  });

  it("her fiderin son ünitesinde H03 (hat sonu) yoktur", () => {
    const state = mapFieldToMimicState([container(REAL_TELEMETRY)], DEMO_TOPOLOGY);
    const byN = new Map(state.units.map((u) => [u.n, u]));
    expect(byN.get(5)?.rmu.H03).toBeNull();
    expect(byN.get(9)?.rmu.H03).toBeNull();
    expect(byN.get(4)?.rmu.H03).toBe("closed");
  });

  it("banka A→BSC-1, banka B→BSC-2 eşler (birebir — sunumsal offset yok)", () => {
    const state = mapFieldToMimicState([container(REAL_TELEMETRY)], DEMO_TOPOLOGY);
    const u1 = state.units[0];
    expect(u1.banks[0].soc).toBeCloseTo(60, 4);
    expect(u1.banks[1].soc).toBeCloseTo(55, 4);
  });

  it("PCS durum kodlarını eşler (2→chg, 3→dis)", () => {
    const state = mapFieldToMimicState([container(REAL_TELEMETRY)], DEMO_TOPOLOGY);
    expect(state.units[0].pcs[0].state).toBe("chg");
    expect(state.units[0].pcs[1].state).toBe("dis");
  });

  it("saha toplam gücünü korur (POI işaretli)", () => {
    const state = mapFieldToMimicState([container(REAL_TELEMETRY)], DEMO_TOPOLOGY);
    // -600 kW şarj + 400 kW deşarj = -0.20 MW
    expect(state.poiMW).toBeCloseTo(-0.2, 3);
  });

  it("hücre ΔV türetir (3.400−3.350 V → 50 mV)", () => {
    const state = mapFieldToMimicState([container(REAL_TELEMETRY)], DEMO_TOPOLOGY);
    expect(state.units[0].banks[0].dvmV).toBe(50);
  });

  it("raf başına SOC/V/I türetir (UC-5, FR-5.2)", () => {
    const state = mapFieldToMimicState([container(REAL_TELEMETRY)], DEMO_TOPOLOGY);
    const b = state.units[0].banks[0];
    expect(b.rackSoc).toEqual([61]);
    expect(b.rackV).toEqual([1298]);
    expect(b.rackI).toEqual([120]);
  });

  it("BSC state (30036) ve çevrimiçi raf (30038) telemetrisini banka durumuna taşır", () => {
    const tel = [
      ...REAL_TELEMETRY,
      T("BSC-1", "BSC State", 3),
      T("BSC-1", "Online Rack No", 8),
      T("BSC-2", "BSC State", 5),
      T("BSC-2", "Online Rack No", 0),
    ];
    const state = mapFieldToMimicState([container(tel)], DEMO_TOPOLOGY);
    expect(state.units[0].banks[0].bscState).toBe(3);
    expect(state.units[0].banks[0].online).toBe(8);
    expect(state.units[0].banks[1].bscState).toBe(5);
    expect(state.units[0].banks[1].online).toBe(0);
  });

  it("demo-MV telemetrisinden station pozisyonu okur", () => {
    const state = mapFieldToMimicState([container(REAL_TELEMETRY)], DEMO_TOPOLOGY);
    expect(state.station.H05).toBe("closed");
    expect(state.station.kV).toBe(34.5);
  });

  it("MV telemetrisi yokken varsayılan kapalı + nominal kV", () => {
    const noMv = REAL_TELEMETRY.filter((r) => r.deviceId !== "DEMO-MV-1");
    const state = mapFieldToMimicState([container(noMv)], DEMO_TOPOLOGY);
    expect(state.station.H05).toBe("closed");
    expect(state.station.kV).toBe(DEMO_TOPOLOGY.station.nominalKV);
  });

  it("boş konteynerde boş ünite listesi döner", () => {
    const state = mapFieldToMimicState([], DEMO_TOPOLOGY);
    expect(state.units).toEqual([]);
  });
});

describe("mapFieldToMimicState — container cihazları (UC-9)", () => {
  const WITH_DEVICES: TelemetryData[] = [
    ...REAL_TELEMETRY,
    T("HVAC-1", "Equipment Status", 1),
    T("HVAC-1", "Compressor Status", true),
    T("HVAC-1", "Supply Temp", 21),
    T("HVAC-1", "Current Temp", 23),
    T("HVAC-1", "Outside Temp", 14),
    T("PM5340-1", "Active Power Total", 20),
    T("PM5340-1", "Frequency", 50),
    T("CONTROL-PANEL-IO-1", "System OK", true),
    T("CONTROL-PANEL-IO-1", "Fault", false),
    T("IMD-1", "Insulation Resistance", 900000),
    T("DC-METER-1", "DC Voltage", 1300),
    T("DC-METER-1", "DC Current", 100),
  ];

  it("AK-9.1: HVAC/AUX/FSS/IMD/DC ünite durumuna bağlanır", () => {
    const state = mapFieldToMimicState([container(WITH_DEVICES)], DEMO_TOPOLOGY);
    const u = state.units[0];
    expect(u.hvac?.[0].id).toBe(1);
    expect(u.hvac?.[0].supplyT).toBe(21);
    expect(u.aux?.kW).toBe(20);
    expect(u.fss?.systemOk).toBe(true);
    expect(u.imdMOhm).toBe(900000);
    expect(u.dc?.voltage).toBe(1300);
  });

  it("AK-9.2: fan-out yeni cihazları 9 üniteye kopyalar; ambient outside temp", () => {
    const state = mapFieldToMimicState([container(WITH_DEVICES)], DEMO_TOPOLOGY);
    expect(state.units).toHaveLength(9);
    expect(state.units.every((u) => u.hvac?.[0].supplyT === 21)).toBe(true);
    expect(state.units.every((u) => u.aux?.kW === 20)).toBe(true);
    expect(state.ambient).toBe(14);
  });

  it("AK-9.3: cihaz telemetrisi yoksa alanlar tanımsız, throw yok", () => {
    const state = mapFieldToMimicState([container(REAL_TELEMETRY)], DEMO_TOPOLOGY);
    const u = state.units[0];
    expect(u.hvac).toBeUndefined();
    expect(u.aux).toBeUndefined();
    expect(u.fss).toBeUndefined();
    expect(state.ambient).toBeUndefined();
  });
});
