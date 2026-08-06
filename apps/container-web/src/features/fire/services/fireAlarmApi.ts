import { apiClient } from "../../../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

export const fireAlarmApi = {
  latest: async (): Promise<TelemetryData[]> => {
    const { data } = await apiClient.get<LatestResponse>(
      "/unified/telemetry/latest?deviceIds=EP203",
    );
    return data.telemetries ?? [];
  },

  execute: async (command: string, deviceId: string = "EP203"): Promise<void> => {
    await apiClient.post("/commands/execute", {
      commands: [{ deviceId, command }],
      mode: "sequential",
    });
  },
};
