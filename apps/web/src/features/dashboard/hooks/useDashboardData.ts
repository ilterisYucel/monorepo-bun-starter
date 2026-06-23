// apps/web/src/features/dashboard/hooks/useDashboardData.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../../../lib/api-client";
import { useDevicesStore } from "../../../stores/devicesStore";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

export interface Rack {
  id: number;
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
  rackCount: number = 16,
): Rack[] => {
  const rackMap = new Map<number, Rack>();

  for (let i = 1; i <= rackCount; i++) {
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

    const name = telemetry.name.replace(/\s+R\d+$/, "");

    switch (name) {
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

const calculateAverages = (racks: Rack[]): Averages => {
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

export const DASHBOARD_QUERY_KEY = ["dashboard"];

export const useDashboardData = (
  chargeStatus: "Charge" | "Discharge" | "Idle",
) => {
  const devices = useDevicesStore((s) => s.devices);
  const totalRacks = useMemo(() => {
    const bsc = devices.filter((d) => d.type === "bsc" || d.id?.startsWith("BSC-"));
    return bsc.reduce((s, d) => s + (d.rack_count ?? 8), 0);
  }, [devices]);

  const {
    data: telemetries = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get<LatestResponse>(
        "/unified/racks/latest",
      );
      return response.data.telemetries || [];
    },
    refetchInterval: 5000,
  });

  const racks = telemetriesToRacks(telemetries, chargeStatus, totalRacks || 16);
  const averages = calculateAverages(racks);

  return { racks, averages, isLoading, refetch };
};
