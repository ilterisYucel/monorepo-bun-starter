// Field komut API'si — field web-service /api/commands/execute-multi
// (WS4 + FIELD-MANEVRA-KATALOGU-REV01 §8: PCS'ler field device-service'te).

import { apiClient } from "../../../lib/api-client";
import type { StepResult } from "@gd-monorepo/ui";

/** Çoklu komut isteği — container-web controlApi deseni (birebir). */
export interface ExecuteMultiRequest {
  commands: Array<{
    deviceId: string;
    command: string;
    params?: Record<string, unknown>;
  }>;
  mode: "parallel" | "sequential";
  onFailure: "stop" | "continue";
}

/**
 * fieldControlApi — saha cihazlarına (PCS) komut yürütme.
 *
 * Yanıt, komut başına doğrulanmış sonuçtur (success/reason — device-service
 * read-back doğrulamasıyla senkron döner). Konteyner cihaz adımları için
 * `containersApi.executeCommands` (WS4 D5) ayrıdır — bu API yalnızca saha
 * cihazlarını hedefler.
 */
export const fieldControlApi = {
  executeMulti: async (input: ExecuteMultiRequest): Promise<StepResult[]> => {
    const { data } = await apiClient.post<{ results: StepResult[] }>(
      "/commands/execute-multi",
      {
        commands: input.commands.map((c) => ({ ...c, params: c.params ?? {} })),
        mode: input.mode,
        onFailure: input.onFailure,
      },
    );
    return data.results;
  },
};
