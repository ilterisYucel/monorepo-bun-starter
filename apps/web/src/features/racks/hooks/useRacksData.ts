// apps/web/src/features/racks/hooks/useRacksData.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { racksApi } from "../services/racksApi";
import { telemetriesToRacks } from "../utils/rackHelpers";
import { useDevicesStore } from "../../../stores/devicesStore";

export const RACKS_QUERY_KEY = ["racks"];

export const useRacksData = (chargeStatus: "Charge" | "Discharge" | "Idle") => {
  const devices = useDevicesStore((s) => s.devices);
  const totalRacks = useMemo(() => {
    const bsc = devices.filter((d) => d.type === "bsc" || d.id?.startsWith("BSC-"));
    return bsc.reduce((s, d) => s + (d.rack_count ?? 8), 0);
  }, [devices]);

  const { data: telemetries = [], isLoading, refetch } = useQuery({
    queryKey: RACKS_QUERY_KEY,
    queryFn: racksApi.getLatest,
    refetchInterval: 5000,
  });

  const racks = telemetriesToRacks(telemetries, chargeStatus, totalRacks || 16);

  return { racks, isLoading, refetch };
};
