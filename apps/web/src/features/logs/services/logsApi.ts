import { apiClient } from "../../../lib/api-client";
import type { LogEntry } from "@gd-monorepo/shared-types";

interface LogListParams {
  type?: string;
  source?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

interface LogListResponse {
  logs: LogEntry[];
}

function buildListParams(params: LogListParams): string {
  const sp = new URLSearchParams();
  if (params.type) sp.append("type", params.type);
  if (params.source) sp.append("source", params.source);
  if (params.from) sp.append("from", params.from);
  if (params.to) sp.append("to", params.to);
  if (params.limit) sp.append("limit", String(params.limit));
  if (params.offset) sp.append("offset", String(params.offset));
  return sp.toString();
}

export const logsApi = {
  list: async (params: LogListParams): Promise<LogEntry[]> => {
    const qs = buildListParams(params);
    const response = await apiClient.get<LogListResponse>(`/logs?${qs}`);
    return response.data.logs ?? [];
  },

  create: async (entry: {
    type: string;
    source: string;
    message: string;
    details?: string;
  }): Promise<LogEntry> => {
    const response = await apiClient.post<LogEntry>("/logs", entry);
    return response.data;
  },
};
