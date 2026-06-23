// apps/web/src/features/hvac/utils/tmsAdapter.ts
import type { HvacUnit } from "../types/hvac";
import type { RoomData, HvacData } from "@gd-monorepo/ui";

function deriveHvacMode(unit: HvacUnit): HvacData["mode"] {
  if (unit.status !== "running") return "idle";
  if (
    unit.coolingSetpoint !== null &&
    unit.currentTemp !== null &&
    unit.currentTemp > unit.coolingSetpoint
  ) {
    return "cooling";
  }
  if (
    unit.heatingSetpoint !== null &&
    unit.currentTemp !== null &&
    unit.currentTemp < unit.heatingSetpoint
  ) {
    return "warming";
  }
  return "idle";
}

const emptyHvac: HvacData = { status: "offline", mode: "idle" };

export function hvacUnitsToTmsProps(units: HvacUnit[]): {
  rooms: RoomData[];
  panel_temp: number;
  status: "online" | "offline";
} {
  const rooms: RoomData[] = units.map((unit) => ({
    temp: unit.currentTemp ?? 22,
    hvacs: [
      {
        status: unit.status === "running" ? "online" : "offline",
        mode: deriveHvacMode(unit),
      },
      emptyHvac,
    ],
  }));

  const running = units.filter((u) => u.status === "running");
  const panelTemp =
    running.length > 0
      ? running.reduce((s, u) => s + (u.currentTemp ?? 0), 0) /
        running.length
      : 22;

  return {
    rooms,
    panel_temp: Math.round(panelTemp * 10) / 10,
    status: units.some((u) => u.status === "fault") ? "offline" : "online",
  };
}
