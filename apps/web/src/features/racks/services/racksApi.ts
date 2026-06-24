// apps/web/src/features/racks/services/racksApi.ts
import { apiClient } from "../../../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

export const racksApi = {
  getLatest: async (deviceIds: string[]): Promise<TelemetryData[]> => {
    const response = await apiClient.get<LatestResponse>(
      `/unified/telemetry/latest?deviceIds=${deviceIds.join(",")}`,
    );
    return response.data.telemetries || [];
  },
};