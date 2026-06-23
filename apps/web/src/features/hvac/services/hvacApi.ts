// apps/web/src/features/hvac/services/hvacApi.ts
import { apiClient } from "../../../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

export const hvacApi = {
  getLatestAll: async (): Promise<TelemetryData[]> => {
    const response = await apiClient.get<LatestResponse>("/unified/hvac/latest");
    return response.data.telemetries || [];
  },

  getLatestDevice: async (deviceId: string): Promise<TelemetryData[]> => {
    const response = await apiClient.get<LatestResponse>(
      `/data/${deviceId}/latest?limit=100`,
    );
    return response.data.telemetries || [];
  },
};
