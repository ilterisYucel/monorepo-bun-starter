// apps/web/src/features/racks/services/racksApi.ts
import { apiClient } from "../../../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

export const racksApi = {
  getLatest: async (): Promise<TelemetryData[]> => {
    const response = await apiClient.get<LatestResponse>("/racks/latest");
    return response.data.telemetries || [];
  },
};