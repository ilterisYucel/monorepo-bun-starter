// apps/web/src/features/devices/services/devicesApi.ts
import { apiClient } from "../../../lib/api-client";
import type { DeviceInfo } from "../types/device";

interface DevicesResponse {
  devices: DeviceInfo[];
}

export const devicesApi = {
  list: async (signal?: AbortSignal): Promise<DeviceInfo[]> => {
    const response = await apiClient.get<DevicesResponse>("/unified/devices", { signal });
    return response.data.devices || [];
  },
};
