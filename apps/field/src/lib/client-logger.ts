import { ClientLogger, installGlobalErrorHandlers } from "@gd-monorepo/ui";
import type { IClientLogTransport, ClientLogEvent } from "@gd-monorepo/ui";
import { apiClient } from "./api-client";

/**
 * ApiLogTransport — ClientLogger gönderimini axios üzerinden POST /api/logs
 * batch formatına bağlar ({ events: [...] }).
 */
export class ApiLogTransport implements IClientLogTransport {
  async send(events: ClientLogEvent[]): Promise<void> {
    await apiClient.post("/logs/", { events });
  }
}

/** Uygulama geneli ClientLogger singleton'ı (T0.8). */
export const clientLogger = new ClientLogger({
  transport: new ApiLogTransport(),
});

/** Global hata yakalayıcılarını kurar — teardown fonksiyonu döner. */
export function installClientLogging(): () => void {
  return installGlobalErrorHandlers(clientLogger);
}
