// TunnelManeuverChannel — IRemoteCommandChannel tünel adaptörü (Faz C1).
// Kaynak tasarım: KOMUT-MANEVRA-OPERASYON §6 + WS-TUNNEL-KAPASITE §5.1
// (field-container-commands deseni: konteyner siyah kutudur; manevra yürütme
// KONTEYNER web-service'inin kendi /api/maneuvers/:name/execute rotasına
// gider — katman sızmaz).

import type { SessionGateway, TunnelProxy } from "@gd-monorepo/ws-tunnel";
import type { IContainerProxy } from "@gd-monorepo/platform-container-access";
import type { IRemoteCommandChannel } from "@gd-monorepo/platform-commands";
import type { TamperLogger } from "@gd-monorepo/tamper-logger";
import { CollectingStreamSink } from "../container-session/collecting-stream-sink";

/** TunnelManeuverChannel yapılandırması — tek obje (DI kuralı 3). */
export interface TunnelManeuverChannelConfig {
  /** Bu field tier'ın kimliği — oturum açılışında kullanılır. */
  fieldId: string;
  containerProxy: IContainerProxy;
  gateway: SessionGateway;
  tunnelProxy: TunnelProxy;
  logger?: TamperLogger;
}

const SYSTEM_SESSION = {
  sessionId: "programatic",
  peerId: "",
  user: {
    id: "system",
    username: "system",
    role: "admin" as const,
    name: "system",
    fieldIds: [],
    mustChangePassword: false,
    createdAt: "",
  },
  peerRole: "admin" as const,
  createdAt: 0,
  lastActivityAt: 0,
  bytesIn: 0,
  bytesOut: 0,
};

/**
 * TunnelManeuverChannel — uzak sistemde manevra çalıştırma (§6 uzak adım):
 * tünel proxy üzerinden hedef konteynerin manevra yürütme rotasına POST atar.
 *
 * Sözleşme (test: tunnel-maneuver-channel.test.ts):
 * - Bağlantı "connected" değilse `{ok:false, reason:"system_unreachable"}`
 *   (kopuk peer — kademeli bozulma; §7.2 best-effort kompanzasyon).
 * - Oturum: mevcut peer oturumu yeniden kullanılır; yoksa programatik açılır
 *   (açılamazsa system_unreachable).
 * - Yanıt: upstream durum kodu 200 → ok (rolled_back DAHİL — kompanzasyon
 *   tamamlandı); diğer kodlar → ok:false + gövdedeki reason.
 * - Stream/oturum hatası → ok:false (reason: tunnel_stream_failed).
 */
export class TunnelManeuverChannel implements IRemoteCommandChannel {
  private readonly fieldId: string;
  private readonly containerProxy: IContainerProxy;
  private readonly gateway: SessionGateway;
  private readonly tunnelProxy: TunnelProxy;
  private readonly logger: TamperLogger | undefined;

  constructor(config: TunnelManeuverChannelConfig) {
    this.fieldId = config.fieldId;
    this.containerProxy = config.containerProxy;
    this.gateway = config.gateway;
    this.tunnelProxy = config.tunnelProxy;
    this.logger = config.logger;
  }

  /** Komut — hedef sistemde manevrayı çalıştırır (tünel üzerinden). */
  async execute(
    system: string,
    maneuver: string,
    params?: Record<string, unknown>,
  ): Promise<{ ok: boolean; reason?: string }> {
    const state = this.containerProxy.connectionStatus().get(system);
    if (state !== "connected") {
      return { ok: false, reason: "system_unreachable" };
    }

    const existing = this.gateway.sessionForPeer(system);
    let token: string;
    if (existing) {
      token = existing.token;
    } else {
      const opened = await this.gateway.openSession({
        fieldId: this.fieldId,
        peerId: system,
        user: SYSTEM_SESSION.user,
        remoteIp: "127.0.0.1",
      });
      if (opened.isErr()) {
        return { ok: false, reason: "system_unreachable" };
      }
      token = opened.unwrap().token;
    }

    const sink = new CollectingStreamSink();
    try {
      await this.tunnelProxy.startHttpStream({
        session: {
          ...(existing ?? { ...SYSTEM_SESSION, peerId: system }),
          token,
        },
        method: "POST",
        path: `/api/maneuvers/${maneuver}/execute`,
        headers: {
          "content-type": "application/json",
          cookie: `container_session=${token}`,
        },
        raw: sink,
        requestBody: Buffer.from(
          JSON.stringify({ params: params ?? {} }),
        ),
      });
      const collected = await sink.completed();

      if (collected.statusCode === 200) {
        return { ok: true };
      }
      const body = parseBody(collected.body);
      return {
        ok: false,
        reason: typeof body?.error === "string" ? body.error : "remote_execution_failed",
      };
    } catch (error) {
      this.warn(`[TunnelManeuverChannel] ${system}/${maneuver} akisi basarisiz`, error);
      return { ok: false, reason: "tunnel_stream_failed" };
    }
  }

  private warn(message: string, err: unknown): void {
    if (this.logger) {
      void this.logger
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

function parseBody(body: Buffer): { error?: string } | undefined {
  try {
    return JSON.parse(body.toString("utf-8")) as { error?: string };
  } catch {
    return undefined;
  }
}
