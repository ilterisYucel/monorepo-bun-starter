// apps/web/src/features/dashboard/hooks/useDashboardData.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api-client";
import { useDevicesStore } from "../../../stores/devicesStore";
import { useTelemetry } from "@gd-monorepo/ui";
import { useRealtimeStream } from "../../../contexts/RealtimeContext";
import type { TelemetryData, ChargeStatus } from "@gd-monorepo/shared-types";
import { telemetriesToRacks } from "../../racks/utils/rackHelpers";

interface LatestResponse {
  telemetries: TelemetryData[];
}

// Konvansiyon: alan adlari "avg" + capitalize(canonical) — canonical tag'i ile
// generic eşleme yapilabilir (bkz. extractSystemLevel).
export interface Averages {
  avgSoc: number;
  avgSoh: number;
  avgVoltage: number;
  avgCurrent: number;
  avgPower: number;
}

const extractSystemLevel = (
  telemetries: TelemetryData[],
): Averages => {
  const result: Averages = { avgSoc: 0, avgSoh: 0, avgVoltage: 0, avgCurrent: 0, avgPower: 0 };

  for (const t of telemetries) {
    if (t.tags?.rack_id !== "system") continue;

    // Canonical eşlemesi (generic) — eski name eşlemesi fallback olarak durur
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

export const DASHBOARD_QUERY_KEY = ["dashboard"];

export const useDashboardData = (
  chargeStatus: ChargeStatus,
) => {
  const devices = useDevicesStore((s) => s.devices);
  const bscDevices = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.type === "xrack"),
    [devices],
  );

  const {
    data: telemetries = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [...DASHBOARD_QUERY_KEY, bscDevices.map(d => d.id)],
    queryFn: async ({ signal }) => {
      const response = await apiClient.get<LatestResponse>(
        `/unified/telemetry/latest?deviceIds=${bscDevices.map(d => d.id).join(",")}`,
        { signal },
      );
      return response.data.telemetries || [];
    },
    refetchInterval: 5000,
  });

  const { data: realtimeDashData } = useRealtimeStream();

  const { data: mergedTelemetries } = useTelemetry({
    historicalData: telemetries,
    realtimeData: realtimeDashData,
  });

  // ui TelemetryEntry ile shared-types TelemetryData yapısal uyumlu değilse cast gerekir
  const racks = telemetriesToRacks(
    mergedTelemetries as unknown as TelemetryData[],
    chargeStatus,
    bscDevices,
  );
  const averages = extractSystemLevel(mergedTelemetries as unknown as TelemetryData[]);

  return { racks, averages, isLoading, refetch };
};
