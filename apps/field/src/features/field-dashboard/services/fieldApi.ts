import { apiClient } from "../../../lib/api-client";
import type { FieldSummary } from "@gd-monorepo/shared-types";

/**
 * 2026-08-28: `list` (GET /api/fields) KALDIRILDI — tek saha modeli; saha
 * kimliği VITE_FIELD_ID env'inden gelir (bkz. lib/site-field.ts).
 */
export const fieldApi = {
  summary: async (fieldId: string): Promise<FieldSummary> => {
    const { data } = await apiClient.get(`/fields/${fieldId}/summary`);
    return data;
  },

  containers: async (fieldId: string) => {
    const { data } = await apiClient.get(`/fields/${fieldId}/containers`);
    return data;
  },

  latestTelemetry: async (fieldId: string) => {
    const { data } = await apiClient.get(`/fields/${fieldId}/telemetry/latest`);
    return data;
  },
};
