// apps/web/src/features/devices/services/devicesApi.ts
import { apiClient } from "../../../lib/api-client";
import type { DeviceInfo } from "../types/device";
import type { TelemetryConfigResponse } from "../types/telemetry-config";

interface DevicesResponse {
  devices: DeviceInfo[];
}

export const devicesApi = {
  list: async (signal?: AbortSignal): Promise<DeviceInfo[]> => {
    const response = await apiClient.get<DevicesResponse>("/unified/devices", { signal });
    return response.data.devices || [];
  },

  getTelemetryConfig: async (deviceId: string): Promise<TelemetryConfigResponse> => {
    const response = await apiClient.get<TelemetryConfigResponse>(
      `/unified/devices/${deviceId}/telemetry-config`,
    );
    return response.data;
  },
};
