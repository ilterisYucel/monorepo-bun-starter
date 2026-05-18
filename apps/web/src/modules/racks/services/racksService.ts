import { apiClient } from "../../../shared/axios";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface TelemetryResponse {
  telemetries: TelemetryData[];
}

export const racksService = {
  getLatest: async (): Promise<TelemetryData[]> => {
    const response =
      await apiClient.get<TelemetryResponse>("/api/racks/latest");
    return response.data.telemetries || [];
  },
};
