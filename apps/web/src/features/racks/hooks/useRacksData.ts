// apps/web/src/features/racks/hooks/useRacksData.ts
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { racksApi } from "../services/racksApi";
import { telemetriesToRacks, telemetriesToRackDetailMap } from "../utils/rackHelpers";
import { useDevicesStore } from "../../../stores/devicesStore";
import type { ChargeStatus } from "@gd-monorepo/shared-types";

export const RACKS_QUERY_KEY = ["racks"];

export const useRacksData = (chargeStatus: ChargeStatus) => {
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

  const racks = telemetriesToRacks(telemetries, chargeStatus, bscDevices);
  const rackDetails = telemetriesToRackDetailMap(telemetries, chargeStatus, bscDevices);

  return { racks, rackDetails, isLoading, refetch };
};
