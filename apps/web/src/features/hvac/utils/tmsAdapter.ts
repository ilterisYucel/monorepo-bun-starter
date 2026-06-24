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

function unitToHvacData(unit: HvacUnit): HvacData {
  return {
    status: unit.status === "running" ? "online" : "offline",
    mode: deriveHvacMode(unit),
  };
}

export function hvacUnitsToTmsProps(units: HvacUnit[]): {
  rooms: RoomData[];
  panel_temp: number;
  status: "online" | "offline";
} {
  const roomMap = new Map<string, HvacUnit[]>();
  for (const u of units) {
    const list = roomMap.get(u.room) ?? [];
    list.push(u);
    roomMap.set(u.room, list);
  }

  const rooms: RoomData[] = [];
  for (const [, roomUnits] of roomMap) {
    const sorted = roomUnits.sort((a, b) => a.id - b.id);
    const hvacs = sorted.slice(0, 2).map(unitToHvacData);
    while (hvacs.length < 2) {
      hvacs.push({ status: "offline", mode: "idle" });
    }
    const avgTemp =
      sorted
        .filter((u) => u.currentTemp !== null)
        .reduce((s, u) => s + (u.currentTemp as number), 0) /
        sorted.length || 22;

    rooms.push({
      temp: Math.round(avgTemp * 10) / 10,
      hvacs: hvacs as [HvacData, HvacData],
    });
  }

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
