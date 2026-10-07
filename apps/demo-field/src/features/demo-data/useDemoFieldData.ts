import { useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { siteFieldId } from "../../lib/site-field";
import { demoApi } from "./demoApi";
import type { FieldContainer } from "./demoApi";

/**
 * useDemoFieldData — saha konteynerlerini + latest telemetriyi 5 sn'de bir
 * sorgular (SPEC FR-1.1). Tek veri kaynağı: `latestTelemetry`.
 */
export function useDemoFieldData(): UseQueryResult<FieldContainer[], Error> {
  const fieldId = siteFieldId();
  return useQuery<FieldContainer[], Error>({
    queryKey: ["demo-field-containers", fieldId],
    queryFn: () => demoApi.containers(fieldId),
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    enabled: fieldId.length > 0,
  });
}
