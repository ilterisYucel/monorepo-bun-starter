import { apiClient } from "../../../lib/api-client";
import type { Field, FieldSummary } from "@gd-monorepo/shared-types";

export const fieldApi = {
  list: async (): Promise<Field[]> => {
    const { data } = await apiClient.get("/fields");
    return data;
  },

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
