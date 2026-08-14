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

function countAlarms(alarms: HvacUnit["alarms"]): number {
  return Object.values(alarms).filter(Boolean).length;
}

function deriveEquipmentStatus(unit: HvacUnit): string {
  if (unit.status === "fault") return "Arıza";
  if (unit.status !== "running") return "Beklemede";
  return "Normal";
}

function unitToHvacData(unit: HvacUnit): HvacData {
  return {
    status: unit.status === "running" ? "online" : "offline",
    mode: deriveHvacMode(unit),
    equipmentStatus: deriveEquipmentStatus(unit),
    alarmCount: countAlarms(unit.alarms),
    supplyTemp: unit.supplyTemp ?? undefined,
    returnTemp: unit.evaporatorTemp ?? undefined,
  };
}

export function hvacUnitsToTmsProps(units: HvacUnit[]): {
  rooms: RoomData[];
  panel_temp: number;
  panel_humidity?: number;
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

    const avgHumidity =
      sorted
        .filter((u) => u.returnHumidity !== null)
        .reduce((s, u) => s + (u.returnHumidity as number), 0) /
        sorted.filter((u) => u.returnHumidity !== null).length || undefined;

    const setTemp =
      sorted[0]?.coolingSetpoint ?? sorted[0]?.heatingSetpoint ?? undefined;

    rooms.push({
      temp: Math.round(avgTemp * 10) / 10,
      humidity: avgHumidity != null ? Math.round(avgHumidity * 10) / 10 : undefined,
      setTemp: setTemp != null ? setTemp : undefined,
      hvacs: hvacs as [HvacData, HvacData],
    });
  }

  const running = units.filter((u) => u.status === "running");
  const panelTemp =
    running.length > 0
      ? running.reduce((s, u) => s + (u.currentTemp ?? 0), 0) /
        running.length
      : 22;

  const panelHumidity =
    running.filter((u) => u.returnHumidity !== null).length > 0
      ? running
          .filter((u) => u.returnHumidity !== null)
          .reduce((s, u) => s + (u.returnHumidity as number), 0) /
        running.filter((u) => u.returnHumidity !== null).length
      : undefined;

  return {
    rooms,
    panel_temp: Math.round(panelTemp * 10) / 10,
    panel_humidity: panelHumidity != null ? Math.round(panelHumidity * 10) / 10 : undefined,
    status: units.some((u) => u.status === "fault") ? "offline" : "online",
  };
}
