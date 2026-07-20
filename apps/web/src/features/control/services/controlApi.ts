// apps/web/src/features/control/services/controlApi.ts
import { apiClient } from "../../../lib/api-client";

interface ExecuteResult {
  deviceId: string;
  command: string;
  success: boolean;
  validated?: boolean;
  reason?: string;
}

export const controlApi = {
  executeCommand: async (
    deviceId: string,
    command: string,
    params?: Record<string, unknown>,
  ): Promise<ExecuteResult> => {
    const response = await apiClient.post<ExecuteResult>("/commands/execute", {
      deviceId,
      command,
      params: params ?? {},
    });
    return response.data;
  },

  executeMulti: async (
    commands: Array<{ deviceId: string; command: string; params?: Record<string, unknown> }>,
  ): Promise<{ results: ExecuteResult[] }> => {
    const response = await apiClient.post<{ results: ExecuteResult[] }>("/commands/execute-multi", {
      commands: commands.map((c) => ({ ...c, params: c.params ?? {} })),
    });
    return response.data;
  },
};
