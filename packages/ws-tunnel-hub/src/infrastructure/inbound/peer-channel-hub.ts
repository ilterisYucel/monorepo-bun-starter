import type { WebSocket } from "ws";
import type {
  HubPeerRegistry,
  IHubChannel,
  ILogger,
} from "@gd-monorepo/ws-tunnel";
import type { IConsumerRelay } from "../../domain/ports/consumer-relay";
import type { IPeerDisconnector } from "../../domain/ports/peer-disconnector";
import type { PeerConnectionTracker } from "../../domain/peer-connection-tracker";
import type { RegisterPeer } from "../../application/register-peer";
import type { DisconnectPeer } from "../../application/disconnect-peer";

export interface PeerChannelHubDeps {
  readonly registry: HubPeerRegistry;
  readonly tracker: PeerConnectionTracker;
  readonly registerPeer: RegisterPeer;
  readonly disconnectPeer: DisconnectPeer;
  readonly consumerRelay: IConsumerRelay;
  /** Peer yeniden kaydolduğunda çağrılır (bayat oturumları düşürmek için). */
  readonly onPeerRegistered?: (peerId: string) => void;
  readonly logger?: ILogger;
  /** Stale sweep aralığı (ms). */
  readonly sweepIntervalMs?: number;
}

interface RegisterFrame {
  type?: unknown;
  peerId?: unknown;
  peerType?: unknown;
  services?: unknown;
}

/**
 * PeerChannelHub — `/ws/peer` inbound adapter'ı ve `IHubChannel` uygulaması.
 *
 * Yalnız taşıma yapar: register frame'ini use-case'e devreder, heartbeat'i
 * tracker'a bildirir, bilinmeyen kontrol mesajlarını consumer portuna aktarır.
 * İş mantığı use-case'lerde; framework yalnız bu adapter'dadır.
 */
export class PeerChannelHub implements IHubChannel, IPeerDisconnector {
  private readonly sockets = new Map<string, WebSocket>();
  private readonly controlSubs = new Set<(peerId: string, message: unknown) => void>();
  private readonly binarySubs = new Set<(peerId: string, data: Buffer) => void>();
  private sweepTimer?: ReturnType<typeof setInterval>;

  constructor(private readonly deps: PeerChannelHubDeps) {}

  /** Periyodik stale sweep'i başlatır (komut). */
  start(): void {
    const interval = this.deps.sweepIntervalMs ?? 1000;
    this.sweepTimer = setInterval(() => this.deps.tracker.sweep(), interval);
  }

  /** Sweep'i durdurur ve açık soketleri kapatır (komut). */
  stop(): void {
    if (this.sweepTimer) clearInterval(this.sweepTimer);
    this.sweepTimer = undefined;
    for (const socket of this.sockets.values()) {
      try {
        socket.close(1001, "server-stopping");
      } catch {
        // kapanmış soket — yok say
      }
    }
    this.sockets.clear();
    this.controlSubs.clear();
    this.binarySubs.clear();
  }

  /** Fastify WS handler'ı çağırır — token pre-upgrade header'dan gelir. */
  accept(socket: WebSocket, token: string): void {
    let peerId: string | undefined;
    let registerHandled = false;

    socket.on("message", (raw: Buffer, isBinary: boolean) => {
      if (isBinary) {
        if (peerId !== undefined) {
          this.binarySubs.forEach((cb) => cb(peerId!, raw));
        }
        return;
      }
      let frame: unknown;
      try {
        frame = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (!registerHandled) {
        registerHandled = true;
        void this.handleRegister(socket, token, frame).then((id) => {
          peerId = id;
        });
        return;
      }
      if (peerId === undefined) return;
      if (isHeartbeat(frame)) {
        this.deps.tracker.markHeartbeat(peerId);
        return;
      }
      // Bilinmeyen kontrol mesajları: önce paket domain'ine (SessionGateway/
      // TunnelProxy), sonra opak olarak consumer kanalına.
      this.controlSubs.forEach((cb) => cb(peerId!, frame));
      this.deps.consumerRelay.publish(peerId, frame);
    });

    socket.on("close", () => {
      if (peerId !== undefined) this.detach(peerId, socket);
    });
    socket.on("error", () => {
      if (peerId !== undefined) this.deps.tracker.markError(peerId);
    });
  }

  // --- IHubChannel ---

  sendControl(peerId: string, message: unknown): void {
    const socket = this.sockets.get(peerId);
    if (socket?.readyState === 1) socket.send(JSON.stringify(message));
  }

  sendBinary(peerId: string, data: Buffer): void {
    const socket = this.sockets.get(peerId);
    if (socket?.readyState === 1) socket.send(data, { binary: true });
  }

  onControlMessage(
    subscriber: (peerId: string, message: unknown) => void,
  ): () => void {
    this.controlSubs.add(subscriber);
    return () => this.controlSubs.delete(subscriber);
  }

  onBinaryFrame(
    subscriber: (peerId: string, data: Buffer) => void,
  ): () => void {
    this.binarySubs.add(subscriber);
    return () => this.binarySubs.delete(subscriber);
  }

  isConnected(peerId: string): boolean {
    return this.sockets.has(peerId);
  }

  /** Aktif peer bağlantısını düşürür (revocation). */
  disconnect(peerId: string): void {
    const socket = this.sockets.get(peerId);
    if (socket === undefined) return;
    this.sockets.delete(peerId);
    try {
      socket.close(1008, "revoked");
    } catch {
      // yok say
    }
    this.deps.disconnectPeer.execute(peerId);
  }

  // --- iç ---

  private async handleRegister(
    socket: WebSocket,
    token: string,
    frame: unknown,
  ): Promise<string | undefined> {
    const msg = frame as RegisterFrame;
    if (
      msg.type !== "register" ||
      typeof msg.peerId !== "string" ||
      typeof msg.peerType !== "string"
    ) {
      this.reject(socket, "bad-register");
      return undefined;
    }

    const result = await this.deps.registerPeer.execute({
      token,
      peerId: msg.peerId,
      peerType: msg.peerType,
      services: msg.services,
    });
    if (result.isErr()) {
      this.reject(socket, result.error().message);
      return undefined;
    }

    const previous = this.sockets.get(msg.peerId);
    if (previous !== undefined && previous !== socket) {
      try {
        previous.close(1000, "replaced");
      } catch {
        // yok say
      }
    }
    this.sockets.set(msg.peerId, socket);
    // Yeniden kayıt: peer yeniden başlamış olabilir → bayat oturumları düşür.
    this.deps.onPeerRegistered?.(msg.peerId);
    socket.send(
      JSON.stringify({
        type: "register-ack",
        status: "ok",
        serverTime: new Date().toISOString(),
      }),
    );
    return msg.peerId;
  }

  private reject(socket: WebSocket, reason: string): void {
    try {
      socket.send(
        JSON.stringify({
          type: "register-ack",
          status: "rejected",
          reason,
          serverTime: new Date().toISOString(),
        }),
      );
      socket.close(1008, reason);
    } catch {
      // yok say
    }
  }

  private detach(peerId: string, socket: WebSocket): void {
    if (this.sockets.get(peerId) !== socket) return;
    this.sockets.delete(peerId);
    this.deps.disconnectPeer.execute(peerId);
  }
}

function isHeartbeat(frame: unknown): boolean {
  return (
    typeof frame === "object" &&
    frame !== null &&
    (frame as { type?: unknown }).type === "heartbeat"
  );
}
