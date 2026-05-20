// frontend/src/services/api.ts

import { apiClient } from "../shared/axios";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface TelemetryResponse {
  telemetries: TelemetryData[];
}

export const api = {
  getLatestTelemetries: async (): Promise<TelemetryData[]> => {
    const response = await apiClient.get<TelemetryResponse>("/racks/latest");
    return response.data.telemetries || [];
  },

  getHistoricalTelemetries: async (
    limit: number = 200,
  ): Promise<TelemetryData[]> => {
    const response = await apiClient.get<TelemetryResponse>(
      `/api/racks/history?limit=${limit}`,
    );
    return response.data.telemetries || [];
  },

  setPower: async (
    chargeStatus: "Charge" | "Discharge" | "Idle",
    powerKw: number,
    durationSeconds: number,
  ): Promise<void> => {
    await apiClient.post("/racks/commands/power", {
      charge_status: chargeStatus,
      power_kw: powerKw,
      duration_seconds: durationSeconds,
    });
  },
};
