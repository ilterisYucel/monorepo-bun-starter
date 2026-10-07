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
    const a = fanOutUnits(proto, 6);
    const b = fanOutUnits(proto, 6);
    expect(a).toHaveLength(6);
    expect(a).toEqual(b);
    expect(a[0].n).toBe(1);
    expect(a[5].n).toBe(6);
  });

  it("PCS gücünü ünite sayısına böler", () => {
    const [u] = fanOutUnits(proto, 6);
    expect(u.pcs[0].pMW).toBeCloseTo(1.2 / 6, 6);
  });
});

describe("mapFieldToMimicState (FR-2.2..FR-2.6)", () => {
  it("tek konteyneri 6 üniteye fan-out eder", () => {
    const state = mapFieldToMimicState([container(REAL_TELEMETRY)], DEMO_TOPOLOGY);
    expect(state.units).toHaveLength(6);
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
