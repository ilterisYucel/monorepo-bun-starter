import { describe, it, expect } from "vitest";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { buildTrendSeries } from "./buildTrendSeries";

const T = (
  name: string,
  value: number,
  ts: string,
  canonical?: string,
  deviceId = "PCS-1",
): TelemetryData => ({
  deviceId,
  name,
  description: name,
  value,
  unit: "",
  timestamp: ts,
  ...(canonical ? { tags: { canonical } } : {}),
});

describe("buildTrendSeries (FR-6.1 / AK-6.1)", () => {
  const t1 = "2026-01-01T00:00:00.000Z";
  const t2 = "2026-01-01T00:05:00.000Z";
  const rows: TelemetryData[] = [
    T("Battery Pack SOC", 60, t1, "soc"),
    T("Battery Pack SOC", 62, t2, "soc"),
    T("Grid Active Power", 500, t1, "power_kw"),
    T("Grid Active Power", 300, t1, "power_kw", "PCS-2"),
    T("Highest Cell Temperature", 24, t1, "max_cell_temp"),
    T("Highest Cell Temperature", 26, t1, "max_cell_temp", "PCS-2"),
  ];

  it("SOC'yi zaman kovasında ortalar", () => {
    const { soc } = buildTrendSeries(rows);
    expect(soc).toHaveLength(2);
    expect(soc[0].value).toBeCloseTo(60, 4);
    expect(soc[1].value).toBeCloseTo(62, 4);
    expect(soc[0].t).toBeLessThan(soc[1].t);
  });

  it("gücü toplar (kW→MW)", () => {
    const { power } = buildTrendSeries(rows);
    expect(power).toHaveLength(1);
    expect(power[0].value).toBeCloseTo(0.8, 4);
  });

  it("sıcaklıkta maks değeri alır", () => {
    const { temp } = buildTrendSeries(rows);
    expect(temp).toHaveLength(1);
    expect(temp[0].value).toBe(26);
  });

  it("boş veride boş seriler döner (AK-6.3)", () => {
    const { soc, power, temp } = buildTrendSeries([]);
    expect(soc).toEqual([]);
    expect(power).toEqual([]);
    expect(temp).toEqual([]);
  });
});
