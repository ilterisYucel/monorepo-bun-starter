// apps/web/src/features/racks/utils/rackHelpers.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { Rack } from "../types/rack";

export const telemetriesToRacks = (
  telemetries: TelemetryData[],
  globalChargeStatus: "Charge" | "Discharge" | "Idle"
): Rack[] => {
  const rackMap = new Map<number, Rack>();

  for (let i = 1; i <= 16; i++) {
    rackMap.set(i, {
      id: i,
      name: `Battery Rack ${i}`,
      status: "offline",
      charge_status: globalChargeStatus,
      soc: null,
      soh: null,
      voltage: null,
      current: null,
      power_kw: null,
      temperature: null,
    });
  }

  for (const telemetry of telemetries) {
    const rackId = telemetry.tags?.rack_id;
    if (!rackId) continue;

    const rack = rackMap.get(parseInt(rackId));
    if (!rack) continue;

    switch (telemetry.name) {
      case "Status":
        rack.status = telemetry.value === 1 ? "online" : "offline";
        break;
      case "SoC":
        rack.soc = telemetry.value as number;
        break;
      case "SoH":
        rack.soh = telemetry.value as number;
        break;
      case "Voltage":
        rack.voltage = telemetry.value as number;
        break;
      case "Current":
        rack.current = telemetry.value as number;
        break;
      case "Power":
        rack.power_kw = telemetry.value as number;
        break;
      case "Temperature":
        rack.temperature = telemetry.value as number;
        break;
    }
  }

  return Array.from(rackMap.values());
};