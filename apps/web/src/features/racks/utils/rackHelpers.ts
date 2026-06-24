// apps/web/src/features/racks/utils/rackHelpers.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { Rack } from "../types/rack";
import type { DeviceInfo } from "../../devices/types/device";

export const telemetriesToRacks = (
  telemetries: TelemetryData[],
  globalChargeStatus: "Charge" | "Discharge" | "Idle",
  bscDevices: DeviceInfo[],
): Rack[] => {
  const rackMap = new Map<string, Rack>();

  for (const device of bscDevices) {
    for (let i = 1; i <= (device.rack_count ?? 0); i++) {
      const key = `${device.id}-${i}`;
      rackMap.set(key, {
        id: i,
        deviceId: device.id,
        name: `${device.id} Rack ${i}`,
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
  }

  for (const telemetry of telemetries) {
    const raw = telemetry.tags?.rack_id;
    if (!raw || raw === "system") continue;
    const rackId = parseInt(raw, 10);
    if (isNaN(rackId)) continue;

    const key = `${telemetry.deviceId}-${rackId}`;
    const rack = rackMap.get(key);
    if (!rack) continue;

    const name = telemetry.name.replace(/\s+R\d+$/, "");

    switch (name) {
      case "Status":
        rack.status = telemetry.value === 1 ? "online" : "offline";
        break;
      case "SOC":
        rack.soc = telemetry.value as number;
        break;
      case "SOH":
        rack.soh = telemetry.value as number;
        break;
      case "Voltage":
        rack.voltage = telemetry.value as number;
        break;
      case "Current":
        rack.current = telemetry.value as number;
        break;
      case "ChargePower":
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
      case "Rack SOC":
        rack.soc = telemetry.value as number;
        break;
      case "Rack SOH":
        rack.soh = telemetry.value as number;
        break;
      case "Rack Cell Sum Voltage":
        rack.voltage = telemetry.value as number;
        break;
      case "Rack Current":
        rack.current = telemetry.value as number;
        break;
      case "Rack Max Pack Temp":
        rack.temperature = telemetry.value as number;
        break;
    }
  }

  return Array.from(rackMap.values());
};