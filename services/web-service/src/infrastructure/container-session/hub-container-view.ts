import type { PeerConnectionState } from "@gd-monorepo/ws-tunnel";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type {
  ContainerObserver,
  IContainerProxy,
} from "@gd-monorepo/platform-container-access";
import type { DownsampleOptions } from "@gd-monorepo/core";

/** HubContainerView yapılandırması. */
export interface HubContainerViewConfig {
  /** Presence + sorgu için hub consumer client (field tier'da kendi hub'ı). */
  peers: () => Promise<
    ReadonlyArray<{ peerId: string; peerType: string; status: string }>
  >;
  /** Kontrol mesajı gönderimi (telemetry-query). */
  sendControl: (peerId: string, message: unknown) => void;
  /** Gelen kontrol mesajı aboneliği (telemetry + sorgu yanıtları). */
  onControlMessage: (
    subscriber: (peerId: string, message: unknown) => void,
  ) => () => void;
  /** Presence tazeleme aralığı (ms). */
  presenceRefreshMs?: number;
  /** Sorgu zaman aşımı (ms). */
  queryTimeoutMs?: number;
  now?: () => number;
}

interface PendingQuery {
  resolve: (data: TelemetryData[]) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * HubContainerView — field tier `ContainerProxy`'sinin hub-servis tüketicisi
 * karşılığı (P3 Faz 3).
 *
 * Konteynerler artık field hub-servis'e bağlanır; bu view:
 * - **presence:** `GET /peers` polling → connectionStatus/lastSeenAt + geçiş
 *   olayları (PPC publisher için).
 * - **telemetri store:** relay'den gelen `telemetry` frame'leri → latest.
 * - **sorgu:** `telemetry-query` gönderir, `telemetry-result`'ı queryId ile eşler.
 *
 * WS kabulü/token/stream hub-servis'te olduğundan `registerContainer`/
 * `authenticateContainerToken` gibi metotlar hub modunda DESTEKLENMEZ.
 */
export class HubContainerView implements IContainerProxy {
  private readonly peersFn: HubContainerViewConfig["peers"];
  private readonly sendControlFn: HubContainerViewConfig["sendControl"];
  private readonly onControlMessageFn: HubContainerViewConfig["onControlMessage"];
  private readonly presenceRefreshMs: number;
  private readonly queryTimeoutMs: number;
  private readonly now: () => number;

  private presence = new Map<string, { status: PeerConnectionState; lastSeenAt: number }>();
  private telemetry = new Map<string, TelemetryData[]>();
  private readonly observers = new Set<ContainerObserver>();
  private readonly pending = new Map<string, PendingQuery>();
  private presenceTimer?: ReturnType<typeof setInterval>;
  private unsubscribe?: () => void;
  private querySeq = 0;

  constructor(config: HubContainerViewConfig) {
    this.peersFn = config.peers;
    this.sendControlFn = config.sendControl;
    this.onControlMessageFn = config.onControlMessage;
    this.presenceRefreshMs = config.presenceRefreshMs ?? 15_000;
    this.queryTimeoutMs = config.queryTimeoutMs ?? 10_000;
    this.now = config.now ?? (() => Date.now());
  }

  async start(): Promise<void> {
    this.unsubscribe = this.onControlMessageFn((peerId, message) =>
      this.onMessage(peerId, message),
    );
    void this.refresh();
    this.presenceTimer = setInterval(() => void this.refresh(), this.presenceRefreshMs);
  }

  async stop(): Promise<void> {
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    this.presenceTimer = undefined;
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    for (const query of this.pending.values()) clearTimeout(query.timer);
    this.pending.clear();
  }

  /** Presence'ı hub keşfinden tazeler + geçiş olaylarını yayar (komut). */
  async refresh(): Promise<void> {
    let peers: ReadonlyArray<{ peerId: string; peerType: string; status: string }>;
    try {
      peers = await this.peersFn();
    } catch {
      return; // hub erişilemez — eski presence korunur
    }
    const next = new Map<string, { status: PeerConnectionState; lastSeenAt: number }>();
    const timestamp = this.now();
    for (const peer of peers) {
      // Bu view yalnız konteyner peer'larını izler (agent/field peer'ları hariç).
      if (peer.peerType !== "container") continue;
      const status = toPeerConnectionState(peer.status);
      const previous = this.presence.get(peer.peerId);
      next.set(peer.peerId, {
        status,
        lastSeenAt: status === "connected" ? timestamp : (previous?.lastSeenAt ?? timestamp),
      });
      if (previous?.status !== status && previous !== undefined) {
        this.notifyConnectionChange(peer.peerId, status);
      }
    }
    this.presence = next;
  }

  // --- IContainerProxy (tüketici tarafı) ---

  latestTelemetry(containerId: string): TelemetryData[] {
    return this.telemetry.get(containerId) ?? [];
  }

  connectionStatus(): Map<string, PeerConnectionState> {
    const status = new Map<string, PeerConnectionState>();
    for (const [containerId, entry] of this.presence) {
      status.set(containerId, entry.status);
    }
    return status;
  }

  lastSeenAt(containerId: string): number | undefined {
    return this.presence.get(containerId)?.lastSeenAt;
  }

  containerIds(): string[] {
    return [...this.presence.keys()];
  }

  async latestQuery(
    containerId: string,
    options?: { names?: string[]; windowMs?: number },
  ): Promise<TelemetryData[]> {
    return this.query(containerId, "latest", {
      names: options?.names,
      windowMs: options?.windowMs,
    });
  }

  async historical(
    containerId: string,
    params: Omit<DownsampleOptions, "deviceId">,
  ): Promise<TelemetryData[]> {
    return this.query(containerId, "downsampled", {
      from: params.from,
      to: params.to,
      points: params.points,
    });
  }

  addObserver(observer: ContainerObserver): void {
    this.observers.add(observer);
  }

  removeObserver(observer: ContainerObserver): void {
    this.observers.delete(observer);
  }

  async health(containerId: string): Promise<boolean> {
    return this.connectionStatus().get(containerId) === "connected";
  }

  // --- Hub modunda desteklenmeyen (hub-servis yürütür) ---

  registerContainer(): Promise<void> {
    throw new Error("[HubContainerView] registerContainer hub modunda desteklenmez");
  }

  authenticateContainerToken(): Promise<boolean> {
    return Promise.resolve(false);
  }

  unregisterContainer(): void {}

  pushConfigUpdate(): void {}

  // --- iç ---

  private onMessage(peerId: string, message: unknown): void {
    const msg = message as { type?: string; queryId?: string; data?: unknown; message?: string };
    if (msg.type === "telemetry") {
      const data = Array.isArray(msg.data) ? (msg.data as TelemetryData[]) : [];
      this.telemetry.set(peerId, data);
      const entry = this.presence.get(peerId);
      if (entry) entry.lastSeenAt = this.now();
      for (const observer of this.observers) observer.onData(peerId, data);
      return;
    }
    if (msg.type === "telemetry-result" || msg.type === "telemetry-query-error") {
      const queryId = msg.queryId;
      if (typeof queryId !== "string") return;
      const pending = this.pending.get(queryId);
      if (!pending) return;
      clearTimeout(pending.timer);
      this.pending.delete(queryId);
      pending.resolve(msg.type === "telemetry-result" && Array.isArray(msg.data) ? (msg.data as TelemetryData[]) : []);
    }
  }

  private query(
    containerId: string,
    mode: "latest" | "downsampled",
    extra: { names?: string[]; windowMs?: number; from?: Date; to?: Date; points?: number },
  ): Promise<TelemetryData[]> {
    if (!this.presence.has(containerId)) return Promise.resolve([]);
    const queryId = `hubq-${++this.querySeq}-${this.now()}`;
    const windowMs = extra.windowMs ?? 5 * 60 * 1000;
    const to = extra.to ?? new Date(this.now());
    const from = extra.from ?? new Date(this.now() - windowMs);
    const frame = {
      type: "telemetry-query",
      queryId,
      from: from.toISOString(),
      to: to.toISOString(),
      points: extra.points ?? 120,
      mode,
      ...(extra.names !== undefined ? { names: extra.names } : {}),
    };
    return new Promise<TelemetryData[]>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(queryId);
        resolve([]);
      }, this.queryTimeoutMs);
      this.pending.set(queryId, { resolve, timer });
      this.sendControlFn(containerId, frame);
    });
  }

  private notifyConnectionChange(containerId: string, state: PeerConnectionState): void {
    for (const observer of this.observers) observer.onConnectionChange(containerId, state);
  }
}

function toPeerConnectionState(status: string): PeerConnectionState {
  if (status === "connected" || status === "stale" || status === "error" || status === "idle") {
    return status;
  }
  return "idle";
}
