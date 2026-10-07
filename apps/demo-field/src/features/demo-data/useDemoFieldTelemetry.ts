import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { siteFieldId } from "../../lib/site-field";
import { demoApi } from "./demoApi";
import { FIELD_DEVICE_IDS } from "./demo-topology";

/**
 * useDemoFieldTelemetry — field-tier cihazların (PCS-1/2, DEMO-MV-1) son
 * telemetrisini 5 sn'de bir sorgular. Konteyner payload'ında bulunmadıkları
 * için ayrı unified kaynaktan alınır (SPEC UC-2).
 */
export function useDemoFieldTelemetry(): UseQueryResult<TelemetryData[], Error> {
  const fieldId = siteFieldId();
  return useQuery<TelemetryData[], Error>({
    queryKey: ["demo-field-telemetry", fieldId],
    queryFn: ({ signal }) => demoApi.unifiedLatest(FIELD_DEVICE_IDS, signal),
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0,
  });
}
