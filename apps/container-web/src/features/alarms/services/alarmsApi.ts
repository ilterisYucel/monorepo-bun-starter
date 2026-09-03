import { apiClient } from "../../../lib/api-client";
import type { DeviceAlarmState } from "@gd-monorepo/shared-types";

interface AlarmListResponse {
  alarms: DeviceAlarmState[];
}

/** Cihaz alarm API'si (Faz 0 eki) — durum tablosu okuma + çözme işareti. */
export const alarmsApi = {
  list: async (): Promise<DeviceAlarmState[]> => {
    const response = await apiClient.get<AlarmListResponse>("/unified/alarms");
    return response.data.alarms ?? [];
  },

  resolve: async (deviceId: string, alarmName: string): Promise<void> => {
    await apiClient.post("/unified/alarms/resolve", { deviceId, alarmName });
  },
};
