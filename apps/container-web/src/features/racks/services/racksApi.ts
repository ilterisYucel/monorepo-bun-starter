// apps/web/src/features/racks/services/racksApi.ts
import { apiClient } from "../../../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

// Filtresiz son telemetriler — canonical eşlemesi client tarafinda
// generic resolver ile yapilir (bkz. rackHelpers.applyCanonicalTelemetry).
export const racksApi = {
  getLatest: async (deviceIds: string[], signal?: AbortSignal): Promise<TelemetryData[]> => {
    const params = new URLSearchParams({ deviceIds: deviceIds.join(",") });
    const response = await apiClient.get<LatestResponse>(
      `/unified/telemetry/latest?${params.toString()}`,
      { signal },
    );
    return response.data.telemetries || [];
  },
};
