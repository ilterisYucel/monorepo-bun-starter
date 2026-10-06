import { describe, it, expect } from "vitest";
import { hvacSkeleton } from "./hvacHelpers";

/**
 * hvacSkeleton — katalog-tabanlı yapı (telemetriden bağımsız). Böylece
 * telemetri kesilince bileşenler yer tutucuyla kalır (kaybolma çözümü).
 */
describe("hvacSkeleton", () => {
  it("her HVAC cihazı için standby ünite üretir (telemetrisiz)", () => {
    const units = hvacSkeleton(["HVAC-1", "HVAC-2"]);
    expect(units.map((u) => u.id)).toEqual([1, 2]);
    expect(units.every((u) => u.status === "standby")).toBe(true);
    expect(units.every((u) => u.room === "unknown")).toBe(true);
  });

  it("oda bilgisi roomByDevice'dan gelir", () => {
    const rooms = new Map([["HVAC-3", "room2"]]);
    const units = hvacSkeleton(["HVAC-3"], rooms);
    expect(units[0]!.room).toBe("room2");
  });

  it("id çıkarılamayan cihaz atlanır", () => {
    expect(hvacSkeleton(["HVAC-X", "HVAC-1"])).toHaveLength(1);
  });
});
