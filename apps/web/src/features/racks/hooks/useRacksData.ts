import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRealtimeTelemetry, useTelemetry } from "@gd-monorepo/ui";
import { racksApi } from "../services/racksApi";
import { telemetriesToRacks, telemetriesToRackDetailMap } from "../utils/rackHelpers";
import { useDevicesStore } from "../../../stores/devicesStore";
import type { ChargeStatus } from "@gd-monorepo/shared-types";

export const RACKS_QUERY_KEY = ["racks"];

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5001/ws/telemetry";

export const useRacksData = (chargeStatus: "Charge" | "Discharge" | "Idle") => {
  const devices = useDevicesStore((s) => s.devices);
  const bscDevices = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.type === "xrack"),
    [devices],
  );

  const { data: telemetries = [], isLoading, refetch } = useQuery({
    queryKey: [...RACKS_QUERY_KEY, bscDevices.map(d => d.id)],
    queryFn: ({ signal }) => racksApi.getLatest(bscDevices.map(d => d.id), signal),
    refetchInterval: 5000,
  });

  const firstBscId = bscDevices[0]?.id ?? "";
  const { data: realtimeData } = useRealtimeTelemetry({
    wsUrl: WS_URL,
    deviceId: firstBscId,
    enabled: firstBscId !== "",
    getToken: () => localStorage.getItem("auth-token"),
  });

  const { data: mergedTelemetries } = useTelemetry({
    historicalData: telemetries,
    realtimeData,
  });

  const racks = telemetriesToRacks(mergedTelemetries, chargeStatus, bscDevices);
  const rackDetails = telemetriesToRackDetailMap(mergedTelemetries, chargeStatus, bscDevices);

  return { racks, rackDetails, isLoading, refetch };
};
