import type { WebSocket } from "ws";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import type {
  ContainerConnectionState,
  FieldOperationalConfig,
} from "@gd-monorepo/ws-tunnel";
import type { DownsampleOptions } from "@gd-monorepo/core";

export interface ContainerObserver {
  onData(containerId: string, telemetries: TelemetryData[]): void;
  onConnectionChange(containerId: string, state: ContainerConnectionState): void;
  /** Faz 3: telemetry/heartbeat dışı kontrol mesajları (open-session-ack, stream-*). */
  onControlMessage?(containerId: string, message: unknown): void;
  /** Faz 3: konteynerden gelen tünel binary frame'i (9 bayt başlık + payload). */
  onBinaryFrame?(containerId: string, data: Buffer): void;
}

export interface IContainerProxy {
  start(): Promise<void>;
  stop(): Promise<void>;

  /**
   * Konteyner WS'ini kaydeder. `token` = service token (Faz 1): registry'deki
   * token_hash ile eşleşmezse bağlantı reddedilir. `authenticateContainerToken`
   * upgrade anında çağrılmalıdır (pre-upgrade 401 için).
   */
  registerContainer(containerId: string, ws: WebSocket, token?: string): Promise<void>;

  /** Verilen service token'ın hash'i registry'de herhangi bir satırla eşleşiyor mu? */
  authenticateContainerToken(token: string): Promise<boolean>;

  unregisterContainer(containerId: string): void;

  latestTelemetry(containerId: string): TelemetryData[];

  // ELEGANT-EXCEPTION: "historical" is a noun (short for "historical data")
  historical(containerId: string, params: Omit<DownsampleOptions, "deviceId">): Promise<TelemetryData[]>;

  allHistorical(containerIds: string[], params: Omit<DownsampleOptions, "deviceId">): Promise<Record<string, TelemetryData[]>>;

  /** Kayıtlı konteynerlerin bağlantı durumları (Faz 2: "stale" dahil). */
  connectionStatus(): Map<string, ContainerConnectionState>;

  /** Son heartbeat zamanı (ms epoch) — hiç heartbeat alınmadıysa undefined. */
  lastSeenAt(containerId: string): number | undefined;

  /**
   * Canlı operational config push (Faz 2 T2.5) — bağlı konteynere
   * `config-update` frame'i gönderir; restart gerektirmez.
   */
  pushConfigUpdate(containerId: string, config: FieldOperationalConfig): void;

  /**
   * Faz 3: bağlı konteynere kontrol mesajı gönderir (open-session, stream-open,
   * stream-window, stream-close, session-end). WS açık değilse no-op.
   */
  sendControl(containerId: string, message: unknown): void;

  /** Faz 3: bağlı konteynere ham binary frame gönderir. WS açık değilse no-op. */
  sendBinary(containerId: string, data: Buffer): void;

  addObserver(observer: ContainerObserver): void;
  removeObserver(observer: ContainerObserver): void;

  health(containerId: string): Promise<boolean>;
}
