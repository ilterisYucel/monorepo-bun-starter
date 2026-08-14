import { apiClient } from "../../../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

const ALL_NAMES = [
  "Fault", "Fire", "1st Stage Alarm", "2nd Stage Alarm",
  "Discharged", "Extract", "Mode Auto", "Hold", "Abort", "Reset", "Local Fire",
];

export const firePanelApi = {
  getLatest: async (deviceIds: string[], signal?: AbortSignal): Promise<TelemetryData[]> => {
    const params = new URLSearchParams({ deviceIds: deviceIds.join(",") });
    params.set("names", ALL_NAMES.join(","));
    const response = await apiClient.get<LatestResponse>(
      `/unified/telemetry/latest?${params.toString()}`,
      { signal },
    );
    return response.data.telemetries || [];
  },
};
