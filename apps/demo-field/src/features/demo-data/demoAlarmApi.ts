import { apiClient } from "../../lib/api-client";
import type { DeviceAlarmState } from "@gd-monorepo/shared-types";

/**
 * Faults backend istemcisi (SPEC UC-6, K6): mevcut alarm uçlarını tüketir —
 * `GET /api/unified/alarms` + `POST /api/unified/alarms/resolve` (notlu).
 * Yeni endpoint AÇILMAZ (Open-Closed).
 */
export const demoAlarmApi = {
  list: async (signal?: AbortSignal): Promise<DeviceAlarmState[]> => {
    const { data } = await apiClient.get<{ alarms: DeviceAlarmState[] }>(
      "/unified/alarms",
      { signal },
    );
    return data.alarms ?? [];
  },

  resolve: async (
    deviceId: string,
    alarmName: string,
    note?: string,
  ): Promise<{ resolved: boolean }> => {
    const clean = note?.trim();
    const { data } = await apiClient.post<{ resolved: boolean }>(
      "/unified/alarms/resolve",
      { deviceId, alarmName, ...(clean ? { note: clean } : {}) },
    );
    return data;
  },
};
