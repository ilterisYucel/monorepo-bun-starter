import type { PeerConnectionState } from "@gd-monorepo/ws-tunnel";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type {
  ContainerObserver,
  IContainerProxy,
} from "@gd-monorepo/platform-container-access";
import type { DownsampleOptions } from "@gd-monorepo/core";
import type { HubAccessRequest } from "../hub-consumer";
import { HubTtlCache } from "./hub-ttl-cache";
import { SYSTEM_USER_HEADERS } from "../hub-consumer/system-headers";

/** HubContainerView yapılandırması. */
export interface HubContainerViewConfig {
  /** Presence sorgusu (`GET /peers`). */
  peers: () => Promise<
    ReadonlyArray<{ peerId: string; peerType: string; status: string }>
  >;
  /** Hub opak erişimi (consumer kimliğiyle) — container'ın kendi HTTP uçlarına. */
  access: (request: HubAccessRequest) => Promise<Response>;
  /** Container peer'ının duyduğu servis kimliği (ör. "container-api"). */
  serviceId: string;
  /** Presence tazeleme aralığı (ms). */
  presenceRefreshMs?: number;
  /** latestQuery sonucu TTL'i (ms) — varsayılan 2000. */
  latestCacheTtlMs?: number;
  /** HTTP sorgu zaman aşımı (ms) — varsayılan 10 000. */
  queryTimeoutMs?: number;
  /** Relay çağrılarına eklenecek audit başlıkları (varsayılan: system). */
  userHeaders?: Record<string, string>;
  now?: () => number;
}

/**
 * HubContainerView — field tier `ContainerProxy`'sinin hub-servis tüketicisi.
 *
 * Veri yolu: **hub opak relay → container'ın kendi generic HTTP uçları**
 * (`/api/unified/telemetry/latest-per-name`; `/api/unified/telemetry/downsampled`).
 * Kontrol-kanalı telemetri mesajları YOKTUR; latest sonucu kısa TTL cache'te
 * tutulur, `latestTelemetry` son bilinen değeri (TTL'e bakmadan) döner.
 *
 * - presence: `GET /peers` polling → connectionStatus/lastSeenAt + geçiş olayları.
 * - relay açılamazsa boş dizi döner (fail-safe); cache varsa son değer kullanılır.
 */
export class HubContainerView implements IContainerProxy {
  private readonly peersFn: HubContainerViewConfig["peers"];
  private readonly accessFn: HubContainerViewConfig["access"];
  private readonly serviceId: string;
  private readonly presenceRefreshMs: number;
  private readonly queryTimeoutMs: number;
  private readonly userHeaders: Record<string, string>;
  private readonly now: () => number;
  private readonly cache: HubTtlCache<TelemetryData[]>;

  private presence = new Map<string, { status: PeerConnectionState; lastSeenAt: number }>();
  private readonly observers = new Set<ContainerObserver>();
  private presenceTimer?: ReturnType<typeof setInterval>;

  constructor(config: HubContainerViewConfig) {
    this.peersFn = config.peers;
    this.accessFn = config.access;
    this.serviceId = config.serviceId;
    this.presenceRefreshMs = config.presenceRefreshMs ?? 15_000;
    this.queryTimeoutMs = config.queryTimeoutMs ?? 10_000;
    this.userHeaders = config.userHeaders ?? SYSTEM_USER_HEADERS;
    this.now = config.now ?? (() => Date.now());
    this.cache = new HubTtlCache<TelemetryData[]>({
      ttlMs: config.latestCacheTtlMs ?? 2_000,
      now: this.now,
    });
  }

  async start(): Promise<void> {
    void this.refresh();
    this.presenceTimer = setInterval(() => void this.refresh(), this.presenceRefreshMs);
  }

  async stop(): Promise<void> {
    if (this.presenceTimer) clearInterval(this.presenceTimer);
    this.presenceTimer = undefined;
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
        // Yeniden bağlanan peer'ın bayat telemetrisi kullanılmasın.
        if (status === "connected") this.cache.delete(peer.peerId);
        this.notifyConnectionChange(peer.peerId, status);
      }
    }
    this.presence = next;
  }

  // --- IContainerProxy (tüketici tarafı) ---

  /** Son bilinen telemetri (TTL'e bakmaz; hiç çekilmediyse boş). */
  latestTelemetry(containerId: string): TelemetryData[] {
    return this.cache.peek(containerId) ?? [];
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
    if (!this.presence.has(containerId)) return [];
    const cached = this.cache.get(containerId);
    if (cached !== undefined) return cached;

    const query = new URLSearchParams({
      windowMs: String(options?.windowMs ?? 5 * 60 * 1000),
    });
    if (options?.names !== undefined && options.names.length > 0) {
      query.set("names", options.names.join(","));
    }
    const data = await this.fetchTelemetry(
      containerId,
      `/api/unified/telemetry/latest-per-name?${query.toString()}`,
    );
    if (data !== undefined) {
      this.cache.set(containerId, data);
      return data;
    }
    return this.cache.peek(containerId) ?? [];
  }

  async historical(
    containerId: string,
    params: Omit<DownsampleOptions, "deviceId">,
  ): Promise<TelemetryData[]> {
    if (!this.presence.has(containerId)) return [];
    const query = new URLSearchParams({
      from: params.from.toISOString(),
      to: params.to.toISOString(),
      points: String(params.points ?? 120),
    });
    if (params.names !== undefined && params.names.length > 0) {
      query.set("names", params.names.join(","));
    }
    if (params.tag !== undefined) query.set("tag", params.tag);
    const data = await this.fetchTelemetry(
      containerId,
      `/api/unified/telemetry/downsampled?${query.toString()}`,
    );
    return data ?? [];
  }

  /**
   * Toplu tarihsel sorgu — `field-routes#/telemetry/downsampled` tüketicisi.
   * Konteyner başına `historical` çağrılır; hata alan konteyner sonuçtan
   * düşer (kademeli bozulma, throw yok).
   */
  async allHistorical(
    containerIds: string[],
    params: Omit<DownsampleOptions, "deviceId">,
  ): Promise<Record<string, TelemetryData[]>> {
    const results = await Promise.allSettled(
      containerIds.map(async (containerId) => {
        const rows = await this.historical(containerId, params);
        return [containerId, rows] as const;
      }),
    );
    const out: Record<string, TelemetryData[]> = {};
    for (const result of results) {
      if (result.status === "fulfilled") out[result.value[0]] = result.value[1];
    }
    return out;
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

  /**
   * Container'ın generic telemetri ucundan veri çeker (hub opak relay).
   * Erişim/zaman aşımı/parse hatasında `undefined` (çağıran cache'e düşer).
   */
  private async fetchTelemetry(
    containerId: string,
    path: string,
  ): Promise<TelemetryData[] | undefined> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error("hub query timeout")), this.queryTimeoutMs);
    });
    try {
      const response = await Promise.race([
        this.accessFn({
          peerId: containerId,
          serviceId: this.serviceId,
          path,
          method: "GET",
          headers: this.userHeaders,
        }),
        timeout,
      ]);
      if (!response.ok) return undefined;
      const body = (await response.json()) as { telemetries?: unknown };
      return Array.isArray(body.telemetries) ? (body.telemetries as TelemetryData[]) : [];
    } catch {
      return undefined;
    } finally {
      if (timer !== undefined) clearTimeout(timer);
    }
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
