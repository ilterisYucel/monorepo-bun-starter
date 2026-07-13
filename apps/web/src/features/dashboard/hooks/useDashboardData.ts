// apps/web/src/features/dashboard/hooks/useDashboardData.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api-client";
import { useDevicesStore } from "../../../stores/devicesStore";
import { useRealtimeTelemetry, useTelemetry } from "@gd-monorepo/ui";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type { DeviceInfo } from "../../../features/devices/types/device";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5001/ws/telemetry";

interface LatestResponse {
  telemetries: TelemetryData[];
}

export interface Rack {
  id: number;
  deviceId: string;
  name: string;
  status: "online" | "offline";
  charge_status: "Charge" | "Discharge" | "Idle";
  soc: number | null;
  soh: number | null;
  voltage: number | null;
  current: number | null;
  power_kw: number | null;
  temperature: number | null;
}

export interface Averages {
  avgSoC: number;
  avgSoH: number;
  avgVoltage: number;
  avgCurrent: number;
  avgPower: number;
}

const telemetriesToRacks = (
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

    switch (telemetry.name) {
      case "Battery Ready":
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
      case "Temperature": {
        const agg = telemetry.tags?.aggregation;
        if (!agg || agg === "avg") {
          rack.temperature = telemetry.value as number;
        }
        break;
      }
    }
  }

  return Array.from(rackMap.values());
};

const extractSystemLevel = (
  telemetries: TelemetryData[],
): Averages => {
  const result: Averages = { avgSoC: 0, avgSoH: 0, avgVoltage: 0, avgCurrent: 0, avgPower: 0 };

  for (const t of telemetries) {
    if (t.tags?.rack_id !== "system") continue;

    switch (t.name) {
      case "SOC":
        if (!t.tags?.aggregation) result.avgSoC = t.value as number;
        break;
      case "SOH":
        if (!t.tags?.aggregation) result.avgSoH = t.value as number;
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
  chargeStatus: "Charge" | "Discharge" | "Idle",
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
    queryFn: async () => {
      const response = await apiClient.get<LatestResponse>(
        `/unified/telemetry/latest?deviceIds=${bscDevices.map(d => d.id).join(",")}`,
      );
      return response.data.telemetries || [];
    },
    refetchInterval: 5000,
  });

  const firstBscId = bscDevices[0]?.id ?? "";
  const { data: realtimeDashData } = useRealtimeTelemetry({
    wsUrl: WS_URL,
    deviceId: firstBscId,
    enabled: firstBscId !== "",
  });

  const { data: mergedTelemetries } = useTelemetry({
    historicalData: telemetries,
    realtimeData: realtimeDashData,
  });

  const racks = telemetriesToRacks(mergedTelemetries, chargeStatus, bscDevices);
  const averages = extractSystemLevel(mergedTelemetries);

  return { racks, averages, isLoading, refetch };
};
