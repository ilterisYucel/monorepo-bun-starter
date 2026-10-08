import { describe, it, expect } from "vitest";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { buildAux, buildDc, buildFss, buildHvacList, buildImd } from "./buildDevices";

function T(deviceId: string, name: string, value: number | boolean | string): TelemetryData {
  return {
    deviceId,
    name,
    description: name,
    value,
    unit: "",
    timestamp: "2026-01-01T00:00:00.000Z",
  };
}

const hvac1: TelemetryData[] = [
  T("HVAC-1", "Equipment Status", 1),
  T("HVAC-1", "Compressor Status", true),
  T("HVAC-1", "Electric Heating On", false),
  T("HVAC-1", "Supply Temp", 22.5),
  T("HVAC-1", "Current Temp", 24.1),
  T("HVAC-1", "Outside Temp", 12),
  T("HVAC-1", "Internal Fan Speed", 900),
  T("HVAC-1", "High Temp Alarm", false),
  T("HVAC-1", "Under Voltage Alarm", true),
];

describe("buildDevices (UC-9, AK-9.1/9.3)", () => {
  it("HVAC satırlarından durum/mode/sıcaklık/alarm türetir", () => {
    const map = new Map([["HVAC-1", hvac1]]);
    const hvac = buildHvacList(map);
    expect(hvac).toHaveLength(1);
    expect(hvac[0].id).toBe(1);
    expect(hvac[0].mode).toBe("cool");
    expect(hvac[0].comp).toBe(true);
    expect(hvac[0].supplyT).toBe(22.5);
    expect(hvac[0].returnT).toBe(24.1);
    expect(hvac[0].outsideT).toBe(12);
    expect(hvac[0].alarms).toContain("Under Voltage Alarm");
  });

  it("HVAC telemetrisi yoksa undefined (güvenli varsayılan)", () => {
    expect(buildHvacList(new Map())).toEqual([]);
  });

  it("PM5340 satırlarından AUX ölçümü", () => {
    const aux = buildAux([
      T("PM5340-1", "Active Power Total", 18.5),
      T("PM5340-1", "Reactive Power Total", 3),
      T("PM5340-1", "Voltage L-L Avg", 400),
      T("PM5340-1", "Current Avg", 27),
      T("PM5340-1", "Frequency", 50),
      T("PM5340-1", "Power Factor Total", 0.98),
    ]);
    expect(aux?.kW).toBe(18.5);
    expect(aux?.v).toBe(400);
    expect(aux?.pf).toBe(0.98);
  });

  it("CONTROL-PANEL-IO kuru kontaklarından FSS durumu", () => {
    const fss = buildFss(
      [T("CONTROL-PANEL-IO-1", "System OK", true), T("CONTROL-PANEL-IO-1", "Discharged", true)],
      undefined,
      { zones: ["Smoke", "Heat", "Gas"], detector: "VIGI-DT1", h2AlarmLEL: 10 },
    );
    expect(fss?.status).toBe("fire");
    expect(fss?.released).toBe(true);
    expect(fss?.zones).toHaveLength(3);
  });

  it("FSS disablements + vents okunur", () => {
    const fss = buildFss(
      [T("CONTROL-PANEL-IO-1", "System OK", true)],
      [T("FSS-1", "Disable dE", true), T("FSS-1", "Vents Open", true)],
      { zones: ["Smoke"], detector: "VIGI-DT1", h2AlarmLEL: 10 },
    );
    expect(fss?.disablements.dE).toBe(true);
    expect(fss?.ventsOpen).toBe(true);
    expect(fss?.disablements.dt).toBe(false);
  });

  it("FSS telemetrisi yoksa undefined", () => {
    expect(buildFss(undefined, undefined, undefined)).toBeUndefined();
  });

  it("IMD ve DC ölçümü", () => {
    expect(buildImd([T("IMD-1", "Insulation Resistance", 1_200_000)])).toBe(1_200_000);
    const dc = buildDc([
      T("DC-METER-1", "DC Voltage", 1300),
      T("DC-METER-1", "DC Current", 120),
      T("DC-METER-1", "DC Power", 156),
    ]);
    expect(dc?.powerKw).toBe(156);
  });
});
