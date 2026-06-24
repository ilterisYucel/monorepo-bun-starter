// apps/web/src/features/racks/hooks/useRacksData.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { racksApi } from "../services/racksApi";
import { telemetriesToRacks } from "../utils/rackHelpers";
import { useDevicesStore } from "../../../stores/devicesStore";

export const RACKS_QUERY_KEY = ["racks"];

export const useRacksData = (chargeStatus: "Charge" | "Discharge" | "Idle") => {
  const devices = useDevicesStore((s) => s.devices);
  const bscDevices = useMemo(
    () => devices.filter((d) => d.type === "bsc" || d.type === "xrack"),
    [devices],
  );

  const { data: telemetries = [], isLoading, refetch } = useQuery({
    queryKey: [...RACKS_QUERY_KEY, bscDevices.map(d => d.id)],
    queryFn: () => racksApi.getLatest(bscDevices.map(d => d.id)),
    refetchInterval: 5000,
  });

  const racks = telemetriesToRacks(telemetries, chargeStatus, bscDevices);

  return { racks, isLoading, refetch };
};
