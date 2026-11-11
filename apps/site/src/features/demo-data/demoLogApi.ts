import { apiClient } from "../../lib/api-client";
import type { LogEntry } from "@gd-monorepo/shared-types";

/**
 * Event log istemcisi (SPEC UC-8/T-20, FR-8.1) — `GET /api/logs`
 * (log_events ∪ system_logs). Yeni endpoint AÇILMAZ (Open-Closed).
 */
export const demoLogApi = {
  list: async (
    opts: { type?: string; limit?: number } = {},
    signal?: AbortSignal,
  ): Promise<LogEntry[]> => {
    const { data } = await apiClient.get<{ logs: LogEntry[] }>("/logs", {
      params: {
        ...(opts.type ? { type: opts.type } : {}),
        limit: opts.limit ?? 50,
      },
      signal,
    });
    return data.logs ?? [];
  },
};
