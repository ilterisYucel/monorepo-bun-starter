// apps/web/src/features/dashboard/hooks/useDashboardData.ts
import { useMemo } from "react";
import { useDevicesStore } from "../../../stores/devicesStore";
import { useDeviceTelemetry } from "../../telemetry/hooks/useDeviceTelemetry";
import type { TelemetryData, ChargeStatus } from "@gd-monorepo/shared-types";
import { telemetriesToRacks } from "../../racks/utils/rackHelpers";

// Konvansiyon: alan adlari "avg" + capitalize(canonical) — canonical tag'i ile
// generic eşleme yapilabilir (bkz. extractSystemLevel).
export interface Averages {
  avgSoc: number;
  avgSoh: number;
  avgVoltage: number;
  avgCurrent: number;
  avgPower: number;
}

const EMPTY_AVERAGES: Averages = {
  avgSoc: 0,
  avgSoh: 0,
  avgVoltage: 0,
  avgCurrent: 0,
  avgPower: 0,
};

// Girdi zaten `dedupeLatest` ile (deviceId,name,rack_id) başına TEK satıra
// indirilmiştir; burada her eşleşme son değeri yazar (en yeni kazanır).
const extractSystemLevel = (telemetries: TelemetryData[]): Averages => {
  const result: Averages = { ...EMPTY_AVERAGES };

  for (const t of telemetries) {
    if (t.tags?.rack_id !== "system") continue;

    const canonical = t.tags?.canonical;
    if (canonical) {
      if (canonical === "charge_power") {
        result.avgPower = t.value as number;
        continue;
      }
      if (canonical === "discharge_power") {
        result.avgPower = -(t.value as number);
        continue;
      }
      const field = `avg${canonical.charAt(0).toUpperCase()}${canonical.slice(1)}`;
      if (field in result) {
        if (!t.tags?.aggregation) {
          (result as unknown as Record<string, number>)[field] = t.value as number;
        }
        continue;
      }
    }

    switch (t.name) {
      case "SOC":
        if (!t.tags?.aggregation) result.avgSoc = t.value as number;
        break;
      case "SOH":
        if (!t.tags?.aggregation) result.avgSoh = t.value as number;
        break;
      case "Voltage":
        if (!t.tags?.aggregation) result.avgVoltage = t.value as number;
        break;
      case "Current":
        if (!t.tags?.aggregation) result.avgCurrent = t.value as number;
        break;
      case "ChargePower":
        result.avgPower = t.value as number;
        break;
    }
  }

  return result;
};

export const useDashboardData = (chargeStatus: ChargeStatus) => {
  const devices = useDevicesStore((s) => s.devices);
  const bscDevices = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.type === "xrack"),
    [devices],
  );

  // Component-kapsamlı: BSC bloğu yalnız kendi deviceIds'i ile veri çeker.
  const { telemetries, isLoading } = useDeviceTelemetry({
    deviceIds: useMemo(() => bscDevices.map((d) => d.id), [bscDevices]),
    intervalMs: 5000,
  });

  const racks = telemetriesToRacks(telemetries, chargeStatus, bscDevices);
  const averages = extractSystemLevel(telemetries);

  return { racks, averages, isLoading };
};
