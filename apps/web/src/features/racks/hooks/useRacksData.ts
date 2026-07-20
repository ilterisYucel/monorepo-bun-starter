import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTelemetry } from "@gd-monorepo/ui";
import { useRealtimeStream } from "../../../contexts/RealtimeContext";
import { racksApi } from "../services/racksApi";
import { telemetriesToRacks, telemetriesToRackDetailMap } from "../utils/rackHelpers";
import { useDevicesStore } from "../../../stores/devicesStore";
import type { ChargeStatus } from "@gd-monorepo/shared-types";

export const RACKS_QUERY_KEY = ["racks"];

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

  const { data: realtimeData } = useRealtimeStream();

  const { data: mergedTelemetries } = useTelemetry({
    historicalData: telemetries,
    realtimeData,
  });

  const racks = telemetriesToRacks(mergedTelemetries, chargeStatus, bscDevices);
  const rackDetails = telemetriesToRackDetailMap(mergedTelemetries, chargeStatus, bscDevices);

  return { racks, rackDetails, isLoading, refetch };
};
