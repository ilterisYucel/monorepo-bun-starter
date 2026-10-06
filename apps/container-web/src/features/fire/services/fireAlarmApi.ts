import { apiClient } from "../../../lib/api-client";
import type { TelemetryData } from "@gd-monorepo/shared-types";

interface LatestResponse {
  telemetries: TelemetryData[];
}

export const fireAlarmApi = {
  latest: async (): Promise<TelemetryData[]> => {
    // Yangın telemetrisi CONTROL-PANEL-IO (EP203 kuru kontak) cihazında tutulur.
    const { data } = await apiClient.get<LatestResponse>(
      "/unified/telemetry/latest?deviceIds=CONTROL-PANEL-IO-1",
    );
    return data.telemetries ?? [];
  },

  execute: async (command: string, deviceId: string = "CONTROL-PANEL-IO-1"): Promise<void> => {
    await apiClient.post("/commands/execute", {
      commands: [{ deviceId, command }],
      mode: "sequential",
    });
  },
};
