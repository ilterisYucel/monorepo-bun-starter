// apps/web/src/features/hvac/services/hvacApi.ts
import { apiClient } from "../../../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

export const hvacApi = {
  getLatest: async (deviceIds: string[], signal?: AbortSignal): Promise<TelemetryData[]> => {
    const response = await apiClient.get<LatestResponse>(
      `/unified/telemetry/latest?deviceIds=${deviceIds.join(",")}`,
      { signal },
    );
    return response.data.telemetries || [];
  },

  getLatestDevice: async (deviceId: string, signal?: AbortSignal): Promise<TelemetryData[]> => {
    const response = await apiClient.get<LatestResponse>(
      `/data/${deviceId}/latest?limit=100`,
      { signal },
    );
    return response.data.telemetries || [];
  },
};
