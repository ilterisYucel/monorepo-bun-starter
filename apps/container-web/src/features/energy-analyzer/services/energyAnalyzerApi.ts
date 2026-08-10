import { apiClient } from "../../../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

const ALL_NAMES = [
  "Current A", "Current B", "Current C", "Current N", "Current Avg",
  "Current Unbalance A", "Current Unbalance B", "Current Unbalance C", "Current Unbalance Worst",
  "Voltage L-L AB", "Voltage L-L BC", "Voltage L-L CA", "Voltage L-L Avg",
  "Voltage L-N A", "Voltage L-N B", "Voltage L-N C", "Voltage L-N Avg",
  "Active Power Total", "Active Power A", "Active Power B", "Active Power C",
  "Reactive Power Total", "Reactive Power A", "Reactive Power B", "Reactive Power C",
  "Apparent Power Total", "Apparent Power A", "Apparent Power B", "Apparent Power C",
  "Power Factor Total", "Power Factor A", "Power Factor B", "Power Factor C",
  "Frequency",
  "Active Energy Delivered", "Active Energy Received",
  "Reactive Energy Delivered", "Reactive Energy Received",
  "Apparent Energy",
  "THD Current A", "THD Current B", "THD Current C",
  "THD Voltage L-L AB", "THD Voltage L-L BC", "THD Voltage L-L CA",
  "THD Voltage L-N A", "THD Voltage L-N B", "THD Voltage L-N C",
  "Present Demand Power", "Peak Demand Power", "Present Demand Current",
];

export const energyAnalyzerApi = {
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
