// src/modules/telemetry/services/telemetryService.ts
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { apiClient } from "../../../shared/axios";
import type { SystemStatus } from "../types";

interface HistoryResponse {
  history: TelemetryData[];
}

export const telemetryService = {
  async getHistoricalData(
    hours: number = 1,
    limit?: number,
  ): Promise<TelemetryData[]> {
    // 🔥 hours parametresi ile son X saatlik veriyi al
    const params = new URLSearchParams();
    params.append("hours", hours.toString());
    if (limit) params.append("limit", limit.toString());

    const response = await apiClient.get<HistoryResponse>(
      `/racks/history?${params.toString()}`,
    );
    console.log(
      "[telemetryService] Fetched history:",
      response.data.history?.length,
      "records",
    );
    return response.data.history || [];
  },

  extractSystemStatus(telemetries: TelemetryData[]): SystemStatus {
    const chargeStatusTelemetry = telemetries.find(
      (t) =>
        t.name === "ChargeStatus" &&
        (!t.tags || Object.keys(t.tags).length === 0),
    );

    const value = chargeStatusTelemetry?.value;
    let chargeStatus: "Charge" | "Discharge" | "Idle" = "Idle";

    if (value === 1) chargeStatus = "Charge";
    else if (value === 2) chargeStatus = "Discharge";

    return {
      chargeStatus,
      isCharging: chargeStatus === "Charge",
      isDischarging: chargeStatus === "Discharge",
      isIdle: chargeStatus === "Idle",
    };
  },

  getChargeStatus: async (): Promise<"Charge" | "Discharge" | "Idle"> => {
    const response = await apiClient.get<{ telemetries: TelemetryData[] }>(
      "/racks/latest",
    );
    const chargeStatusTelemetry = response.data.telemetries.find(
      (t) =>
        t.name === "ChargeStatus" &&
        (!t.tags || Object.keys(t.tags).length === 0),
    );
    const value = chargeStatusTelemetry?.value;
    if (value === 1) return "Charge";
    if (value === 2) return "Discharge";
    return "Idle";
  },
};
