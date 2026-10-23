import type { IRemoteCommandChannel } from "@gd-monorepo/platform-commands";
import type { TamperLogger } from "@gd-monorepo/tamper-logger";
import type { IHubTunnelPort } from "../../../domain/ports/hub-tunnel";
import { SYSTEM_USER_HEADERS } from "../../../infrastructure/hub-tunnel/system-headers";

/** HubManeuverChannel yapılandırması. */
export interface HubManeuverChannelConfig {
  client: IHubTunnelPort;
  /** Container peer'ının duyurduğu servis kimliği (hub access yolu). */
  serviceId: string;
  logger?: TamperLogger;
}

/**
 * HubManeuverChannel — `IRemoteCommandChannel`'ın hub-servis REST uyarlaması.
 *
 * Container peer'ına `/peers/:pid/services/:sid/api/maneuvers/:name/execute`
 * üzerinden POST atar (opak erişim + consumer kimliği). Legacy
 * `TunnelManeuverChannel`'ın (web-service hub) hub-modu karşılığıdır.
 */
export class HubManeuverChannel implements IRemoteCommandChannel {
  constructor(private readonly config: HubManeuverChannelConfig) {}

  async execute(
    system: string,
    maneuver: string,
    params?: Record<string, unknown>,
    timer?: { durationSeconds: number },
  ): Promise<{ ok: boolean; reason?: string }> {
    const body = JSON.stringify({
      params: params ?? {},
      ...(timer !== undefined ? { timer } : {}),
    });

    let response: Response;
    try {
      response = await this.config.client.access({
        peerId: system,
        serviceId: this.config.serviceId,
        path: `/api/maneuvers/${encodeURIComponent(maneuver)}/execute`,
        method: "POST",
        headers: SYSTEM_USER_HEADERS,
        body,
      });
    } catch (error) {
      this.warn(`[HubManeuverChannel] ${system}/${maneuver} erisim basarisiz`, error);
      return { ok: false, reason: "system_unreachable" };
    }

    if (response.status === 200) {
      return { ok: true };
    }
    if (response.status === 404 || response.status === 503) {
      return { ok: false, reason: "system_unreachable" };
    }

    let reason: string | undefined;
    try {
      const parsed = (await response.json()) as { error?: unknown };
      if (typeof parsed.error === "string") reason = parsed.error;
    } catch {
      // gövde JSON değil — aşağıda durum koduna düşülür
    }
    return { ok: false, reason: reason ?? `remote_execution_failed` };
  }

  private warn(message: string, err: unknown): void {
    if (this.config.logger) {
      void this.config.logger
        .log({
          level: "warn",
          category: "app",
          eventCode: "maneuver_remote_failed",
          message,
          context: { error: String(err) },
        })
        .catch(() => undefined);
      return;
    }
    console.warn(message, err);
  }
}
