import { apiClient } from "../../../lib/api-client";
import type {
  ManeuverRecord,
  OperationRunResult,
} from "@gd-monorepo/shared-types";

/**
 * Manevra/operasyon API istemcisi — server kataloğu (KOMUT-MANEVRA-OPERASYON
 * Faz D2: UI kendi kataloğunu TANIMLAMAZ; GET /api/maneuvers'ten okur).
 */

export const maneuverApi = {
  /** Sorgu — sunucu manevra kataloğu (DB > dosya hibrit listesi). */
  list: async (signal?: AbortSignal): Promise<ManeuverRecord[]> => {
    const response = await apiClient.get<{ maneuvers: ManeuverRecord[] }>(
      "/maneuvers",
      { signal },
    );
    return response.data.maneuvers ?? [];
  },

  /** Komut — manevrayı çalıştırır (params + opsiyonel grup kısıtı + timer). */
  execute: async (
    name: string,
    body: {
      params?: Record<string, unknown>;
      deviceIds?: string[];
      timer?: { durationSeconds: number };
    } = {},
  ): Promise<OperationRunResult> => {
    const response = await apiClient.post<OperationRunResult>(
      `/maneuvers/${name}/execute`,
      {
        params: body.params ?? {},
        ...(body.deviceIds !== undefined ? { deviceIds: body.deviceIds } : {}),
        ...(body.timer !== undefined ? { timer: body.timer } : {}),
      },
    );
    return response.data;
  },
};
