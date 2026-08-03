// apps/web/src/features/racks/services/racksApi.ts
import { apiClient } from "../../../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

const ALL_NAMES = [
  "AnticipatedVoltage",
  "BalanceTime",
  "Battery Ready",
  "CellLocation",
  "CellVoltage",
  "ChargePower",
  "ChargeStatus",
  "CloseCurrent",
  "Count",
  "Current",
  "DischargePower",
  "Heartbeat",
  "Last Accepted Req",
  "NonBalancePeriod",
  "Online Rack No",
  "OpenCount",
  "Rack Cell Sum Voltage",
  "Rack Current",
  "Rack Max Pack Temp",
  "Rack SOC",
  "Rack SOH",
  "Request Acknowledge",
  "SOC",
  "SOH",
  "SWName",
  "SensorType",
  "SerialNumber",
  "State",
  "Temperature",
  "Type",
  "Version",
  "Voltage",
];

export const racksApi = {
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
