// src/modules/racks/utils/rackHelpers.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { Rack } from "../types";

export const telemetriesToRacks = (
  telemetries: TelemetryData[],
  globalChargeStatus: "Charge" | "Discharge" | "Idle",
): Rack[] => {
  const rackMap = new Map<number, Rack>();

  // Her rack için temel yapı
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

  // Telemetry'leri rack'lere ata
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

      case "ChargeStatus":
        rack.charge_status =
          telemetry.value === 1
            ? "Charge"
            : telemetry.value === 2
              ? "Discharge"
              : "Idle";
        break;
    }
  }

  return Array.from(rackMap.values());
};

export const calculateSystemAverages = (racks: Rack[]) => {
  const validRacks = racks.filter((r) => r.status === "online");
  if (validRacks.length === 0) {
    return { avgSoC: 0, avgSoH: 0, avgVoltage: 0, avgCurrent: 0, avgPower: 0 };
  }

  return {
    avgSoC:
      validRacks.reduce((sum, r) => sum + (r.soc || 0), 0) / validRacks.length,
    avgSoH:
      validRacks.reduce((sum, r) => sum + (r.soh || 0), 0) / validRacks.length,
    avgVoltage:
      validRacks.reduce((sum, r) => sum + (r.voltage || 0), 0) /
      validRacks.length,
    avgCurrent:
      validRacks.reduce((sum, r) => sum + (r.current || 0), 0) /
      validRacks.length,
    avgPower:
      validRacks.reduce((sum, r) => sum + (r.power_kw || 0), 0) /
      validRacks.length,
  };
};
