// apps/web/src/hooks/useChargeStatus.ts
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "../lib/api-client";
import { useDevicesStore } from "../stores/devicesStore";
import { useRealtimeTelemetry } from "@gd-monorepo/ui";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:5001/ws/telemetry";

export const CHARGE_STATUS_QUERY_KEY = ["chargeStatus"];

export const useChargeStatus = () => {
  const devices = useDevicesStore((s) => s.devices);
  const bscIds = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.type === "xrack").map((d) => d.id),
    [devices],
  );

  const { data: chargeStatus = "Idle", isLoading } = useQuery({
    queryKey: [...CHARGE_STATUS_QUERY_KEY, bscIds],
    queryFn: async () => {
      const response = await apiClient.get<LatestResponse>(
        `/unified/telemetry/latest?deviceIds=${bscIds.join(",")}`,
      );
      const chargeStatusTelemetry = response.data.telemetries.find(
        (t) => t.name === "ChargeStatus",
      );
      const value = chargeStatusTelemetry?.value;
      if (value === 1) return "Charge";
      if (value === 2) return "Discharge";
      return "Idle";
    },
    refetchInterval: 5000,
  });

  const firstBscId = bscIds[0] ?? "";
  useRealtimeTelemetry({
    wsUrl: WS_URL,
    deviceId: firstBscId,
    enabled: firstBscId !== "",
  });

  return { chargeStatus, isLoading };
};