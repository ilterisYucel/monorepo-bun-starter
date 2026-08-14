// apps/web/src/features/racks/services/racksApi.ts
import { apiClient } from "../../../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

const CANONICALS = [
  "battery_ready",
  "soc",
  "soh",
  "voltage",
  "current",
  "charge_power",
  "discharge_power",
  "temperature",
];

export const racksApi = {
  getLatest: async (deviceIds: string[], signal?: AbortSignal): Promise<TelemetryData[]> => {
    const params = new URLSearchParams({ deviceIds: deviceIds.join(",") });
    params.set("canonicals", CANONICALS.join(","));
    const response = await apiClient.get<LatestResponse>(
      `/unified/telemetry/latest?${params.toString()}`,
      { signal },
    );
    return response.data.telemetries || [];
  },
};
