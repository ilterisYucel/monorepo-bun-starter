import { FIELD_PROTOCOL_VERSION, DEFAULT_FIELD_OPERATIONAL_CONFIG, fieldOperationalConfigSchema } from "../protocol";

import type { FieldConnectorState, FieldOperationalConfig, HeartbeatMessage, RegisterMessage, TelemetryMessage } from "../protocol";

import { ValidationError } from "@gd-monorepo/result";
import type { ILogger } from "../logger";
import type { ISocketClient, ISocketClientFactory, ITunnelChannel } from "../channel";
import type { ISnapshotSource } from "../snapshot";
import type { ReconnectDelay } from "./reconnect-delay";

/** FieldConnector yapılandırması — bootstrap env'den türetilir (tasarım §6.1). */
export interface FieldConnectorConfig {
  /** Field WS URL listesi — sırayla denenir (ana + yedek). */
  wsUrls: readonly string[];
  /** Service token — upgrade'de `Authorization: Bearer` header'ı olarak taşınır. */
  token: string;
  /** Konteyner kimliği — register mesajının `containerId` alanı. */
  containerId: string;
  /** Heartbeat gönderim aralığı (ms) — operational config ile değişebilir. */
  heartbeatIntervalMs: number;
  /** Telemetri snapshot push aralığı (ms) — operational config ile değişebilir. */
  telemetryIntervalMs: number;
  /** Register sonrası ack bekleme süresi (ms) — aşarsa backoff. */
  registerTimeoutMs: number;
  /** Pong alınmazsa bağlantı yarı-ölü sayılır (ms). */
  livenessTimeoutMs: number;
}

/**
 * FieldConnector — konteyner→field outbound WS istemcisi (tasarım §6).
 *
 * Sorumluluklar (Faz 2): register + 15 sn heartbeat + telemetry snapshot push +
 * PPC durumu (`state()`) + operational config alımı (register-ack.config /
 * config-update — restart'sız). Tünel stream'leri Faz 3'te aynı kanala eklenir.
 *
 * Durum makinesi (tasarım §6 diyagramı):
 * ```
 * offline → connecting: start() veya backoff bitti
 * connecting → registered: register-ack ok
 * connecting → backoff: hata / 401 / register timeout
 * registered → connected: ilk heartbeat gönderildi
 * connected → backoff: WS kapandı / liveness timeout
 * backoff → connecting: exp(2^n·1s)+jitter (ReconnectDelay)
 * connected → offline: stop()
 * ```
 *
 * Yan etkiler: `ws` soketi (enjekte fabrikadan), ILogger (geçiş-odaklı
 * loglar — field_connected/field_disconnected/ws_connection_lost/
 * ws_register_rejected/field_config_rejected/telemetry_push_failed).
 */
export class FieldConnector implements ITunnelChannel {
  private stateValue: FieldConnectorState = "offline";
  private socket?: ISocketClient;
  private generation = 0;
  private attempt = 0;
  private urlIndex = 0;
  private stopped = false;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private telemetryTimer?: ReturnType<typeof setInterval>;
  private registerTimer?: ReturnType<typeof setTimeout>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private lastHeartbeatSentAt?: number;
  private lastPongAt = 0;
  private operational: Required<FieldOperationalConfig>;
  private readonly messageSubscribers: Set<(message: unknown) => void> = new Set();
  private readonly binarySubscribers: Set<(data: Buffer) => void> = new Set();

  // ELEGANT-EXCEPTION: `now` parametresi test determinizmi için varsayılan değer
  // taşır — üretim kodu açıkça enjekte etmez (AlertNotifier deseni, core).
  constructor(
    private readonly config: FieldConnectorConfig,
    private readonly socketFactory: ISocketClientFactory,
    private readonly snapshotSource: ISnapshotSource,
    private readonly reconnectDelay: ReconnectDelay,
    private readonly logger?: ILogger,
    private readonly now: () => number = () => Date.now(),
  ) {
    if (config.wsUrls.length === 0) {
      throw new ValidationError(
        "field-connector.no-url",
        "en az bir FIELD_WS_URL gerekli",
      );
    }
    if (config.token.trim().length === 0) {
      throw new ValidationError(
        "field-connector.no-token",
        "CONTAINER_TOKEN bos olamaz",
      );
    }
    if (config.containerId.trim().length === 0) {
      throw new ValidationError(
        "field-connector.no-container-id",
        "containerId bos olamaz",
      );
    }
    if (config.heartbeatIntervalMs <= 0 || config.telemetryIntervalMs <= 0) {
      throw new ValidationError(
        "field-connector.invalid-interval",
        "heartbeat/telemetry araliklari pozitif olmali",
      );
    }
    this.operational = {
      heartbeatIntervalMs: config.heartbeatIntervalMs,
      telemetryIntervalMs: config.telemetryIntervalMs,
    };
  }

  /** Bağlantı döngüsünü başlatır (komut). Çalışıyorsa no-op. */
  async start(): Promise<void> {
    if (this.stateValue !== "offline") return;
    this.stopped = false;
    this.connect();
  }

  /** Bağlantıyı kapatır, yeniden bağlanmaz (komut). */
  async stop(): Promise<void> {
    this.stopped = true;
    this.clearTimers();
    this.socket?.close();
    this.socket = undefined;
    this.stateValue = "offline";
  }

  /** Güncel durum makinesi durumu (sorgu). */
  state(): FieldConnectorState {
    return this.stateValue;
  }

  /** Field'a bağlı mı — PPC kaynağı (sorgu). */
  fieldConnected(): boolean {
    return this.stateValue === "connected";
  }

  /** Son heartbeat'in gönderildiği zaman (ms epoch) — hiç gönderilmediyse undefined. */
  lastHeartbeatAt(): number | undefined {
    return this.lastHeartbeatSentAt;
  }

  /**
   * Faz 3: tünel katmanının kullandığı kontrol mesajı gönderici (komut).
   * stream-open-ack / stream-window / stream-close / open-session-ack.
   * WS açık değilse no-op.
   */
  sendControl(message: unknown): void {
    this.send(message);
  }

  /** Faz 3: ham binary frame gönderici (9 bayt başlık + payload). WS açıksa. */
  sendBinary(data: Buffer): void {
    if (this.socket?.readyState() === "open") {
      this.socket.sendBinary(data);
    }
  }

  /**
   * Faz 3: tünel kontrol mesajı aboneliği — FieldConnector'ın bilmediği tipler
   * (open-session, stream-*, session-end) abonelere iletilir. Unsubscribe
   * fonksiyonu döner (sorgu + yan etki — abonelik kurulumu).
   */
  onMessage(subscriber: (message: unknown) => void): () => void {
    this.messageSubscribers.add(subscriber);
    return () => this.messageSubscribers.delete(subscriber);
  }

  /** Faz 3: binary frame aboneliği — tünel akış verisi abonelere iletilir. */
  onBinaryFrame(subscriber: (data: Buffer) => void): () => void {
    this.binarySubscribers.add(subscriber);
    return () => this.binarySubscribers.delete(subscriber);
  }

  private connect(): void {
    this.clearTimers();
    this.urlIndex = 0;
    this.stateValue = "connecting";
    const first = this.config.wsUrls[0];
    if (first !== undefined) {
      this.tryUrl(first);
    }
  }

  private tryUrl(url: string): void {
    if (this.stopped) return;
    const gen = ++this.generation;
    const socket = this.socketFactory.create(url, {
      Authorization: `Bearer ${this.config.token}`,
    });
    this.socket = socket;

    socket.onOpen(() => {
      if (gen !== this.generation) return;
      if (this.stopped) return;
      this.lastPongAt = this.now();
      socket.send(this.registerFrame());
      this.registerTimer = setTimeout(() => {
        if (gen !== this.generation) return;
        this.log("warn", "app", "ws_connection_lost", "Field register ack alinamadi", {
          reason: "register-timeout",
        });
        this.closeAndBackoff();
      }, this.config.registerTimeoutMs);
    });

    socket.onMessage((raw) => {
      if (gen !== this.generation) return;
      this.handleMessage(raw);
    });

    socket.onBinaryMessage((data) => {
      if (gen !== this.generation) return;
      this.binarySubscribers.forEach((subscriber) => subscriber(data));
    });

    socket.onClose(() => {
      if (gen !== this.generation) return;
      if (this.stopped) {
        this.stateValue = "offline";
        return;
      }
      this.enterBackoff("ws-closed");
    });

    socket.onError((error) => {
      if (gen !== this.generation) return;
      this.log("warn", "app", "ws_connection_lost", "Field WS soket hatasi", {
        error: error.message,
      });
    });

    socket.onPong(() => {
      if (gen !== this.generation) return;
      this.lastPongAt = this.now();
    });

    socket.onRejected((statusCode) => {
      if (gen !== this.generation) return;
      if (statusCode === 401 || statusCode === 403) {
        this.log("warn", "security", "ws_register_rejected", "Field baglantisi reddedildi", {
          statusCode,
          url,
        });
      }
      this.urlIndex += 1;
      const next = this.config.wsUrls[this.urlIndex];
      if (next !== undefined) {
        this.tryUrl(next);
      } else {
        this.enterBackoff("rejected");
      }
    });
  }

  private handleMessage(raw: string): void {
    let msg: unknown;
    try {
      msg = JSON.parse(raw);
    } catch {
      return; // malform frame — yok say
    }
    const type = (msg as { type?: unknown }).type;
    switch (type) {
      case "register-ack": {
        const ack = msg as { status?: unknown; config?: unknown };
        if (ack.status !== "ok") {
          this.log("warn", "security", "ws_register_rejected", "Field register reddetti", {
            status: String(ack.status ?? "unknown"),
          });
          this.closeAndBackoff();
          return;
        }
        if (this.registerTimer) clearTimeout(this.registerTimer);
        if (ack.config !== undefined) {
          this.applyOperationalConfig(ack.config);
        }
        this.reconnectDelay.reset();
        this.attempt = 0;
        this.stateValue = "registered";
        this.sendHeartbeat(); // registered → connected (ilk heartbeat)
        this.scheduleHeartbeat();
        this.scheduleTelemetry();
        void this.pushSnapshot();
        this.log("info", "app", "field_connected", "Field baglantisi kuruldu", {
          containerId: this.config.containerId,
        });
        return;
      }
      case "config-update": {
        const update = msg as { config?: unknown };
        if (update.config !== undefined) {
          this.applyOperationalConfig(update.config);
        }
        return;
      }
      case "error": {
        const err = msg as { code?: unknown; message?: unknown };
        this.log("warn", "app", "ws_connection_lost", "Field protokol hatasi", {
          code: String(err.code ?? "unknown"),
          message: String(err.message ?? ""),
        });
        return;
      }
      default:
        // Faz 3: tünel kontrol mesajları (open-session, stream-*, session-end)
        this.messageSubscribers.forEach((subscriber) => subscriber(msg));
        return;
    }
  }

  private sendHeartbeat(): void {
    const ts = this.now();
    this.lastHeartbeatSentAt = ts;
    this.socket?.ping();
    if (ts - this.lastPongAt >= this.config.livenessTimeoutMs) {
      this.log("warn", "app", "ws_connection_lost", "Field baglantisi yari-olu", {
        reason: "liveness-timeout",
      });
      this.closeAndBackoff();
      return;
    }
    const frame: HeartbeatMessage = { type: "heartbeat", ts };
    this.send(frame);
    if (this.stateValue === "registered") {
      this.stateValue = "connected";
    }
  }

  private async pushSnapshot(): Promise<void> {
    try {
      const data = await this.snapshotSource.snapshot();
      if (data.length === 0) return;
      if (this.stateValue !== "connected") return;
      const frame: TelemetryMessage = { type: "telemetry", data };
      this.send(frame);
    } catch (error) {
      this.log("warn", "app", "telemetry_push_failed", "Telemetri snapshot alinamadi", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private applyOperationalConfig(input: unknown): void {
    const parsed = fieldOperationalConfigSchema.safeParse(input);
    if (!parsed.success) {
      this.log("warn", "app", "field_config_rejected", "Gecersiz operational config", {
        reason: "schema",
      });
      return;
    }
    this.operational = { ...this.operational, ...parsed.data };
    if (this.stateValue === "connected" || this.stateValue === "registered") {
      this.scheduleHeartbeat();
      this.scheduleTelemetry();
    }
    this.log("info", "app", "field_connected", "Operational config uygulandi", {
      heartbeatIntervalMs: this.operational.heartbeatIntervalMs,
      telemetryIntervalMs: this.operational.telemetryIntervalMs,
    });
  }

  private scheduleHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(
      () => this.sendHeartbeat(),
      this.operational.heartbeatIntervalMs,
    );
  }

  private scheduleTelemetry(): void {
    if (this.telemetryTimer) clearInterval(this.telemetryTimer);
    this.telemetryTimer = setInterval(
      () => void this.pushSnapshot(),
      this.operational.telemetryIntervalMs,
    );
  }

  private closeAndBackoff(): void {
    this.generation += 1; // geç kapanma olaylarını yok say
    this.clearTimers();
    this.socket?.close();
    this.enterBackoff("closed-by-client");
  }

  private enterBackoff(reason: string): void {
    if (this.stopped) return;
    this.clearTimers();
    this.stateValue = "backoff";
    this.attempt += 1;
    const delay = this.reconnectDelay.delayFor(this.attempt);
    this.log("warn", "app", "ws_connection_lost", "Field baglantisi koptu", {
      reason,
      attempt: this.attempt,
      reconnectInMs: delay,
    });
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private clearTimers(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.telemetryTimer) clearInterval(this.telemetryTimer);
    if (this.registerTimer) clearTimeout(this.registerTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.heartbeatTimer = undefined;
    this.telemetryTimer = undefined;
    this.registerTimer = undefined;
    this.reconnectTimer = undefined;
  }

  private registerFrame(): string {
    const frame: RegisterMessage = {
      type: "register",
      containerId: this.config.containerId,
      protocolVersion: FIELD_PROTOCOL_VERSION,
    };
    return JSON.stringify(frame);
  }

  private send(frame: unknown): void {
    if (this.socket?.readyState() === "open") {
      this.socket.send(JSON.stringify(frame));
    }
  }

  private log(
    level: "info" | "warn",
    category: "app" | "security",
    eventCode: string,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (!this.logger) return;
    void this.logger
      .log({ level, category, eventCode, message, context })
      .catch(() => {});
  }
}
