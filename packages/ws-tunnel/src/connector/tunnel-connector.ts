import { TUNNEL_PROTOCOL_VERSION, DEFAULT_TUNNEL_OPERATIONAL_CONFIG, tunnelOperationalConfigSchema } from "../protocol";

import type { TunnelConnectorState, TunnelOperationalConfig, HeartbeatMessage, RegisterMessage, ServiceAnnouncement, TunnelPeerType } from "../protocol";

import { ValidationError } from "../result";
import type { ILogger } from "../logger";
import type { ISocketClient, ISocketClientFactory, ITunnelChannel } from "../channel";
import type { ReconnectDelay } from "./reconnect-delay";

/** TunnelConnector yapılandırması — bootstrap env'den türetilir (tasarım §6.1). */
export interface TunnelConnectorConfig {
  /** Hub WS URL listesi — sırayla denenir (ana + yedek). */
  wsUrls: readonly string[];
  /** Service token — upgrade'de `Authorization: Bearer` header'ı olarak taşınır. */
  token: string;
  /** Peer kimliği — register mesajının `peerId` alanı. */
  peerId: string;
  /** Peer türü — hub kayıt/doğrulama tarafını seçer. Varsayılan: "container". */
  peerType?: TunnelPeerType;
  /**
   * Peer'ın sunduğu OPAK servisler (opsiyonel). Register mesajına yalnızca
   * doluysa eklenir; hub hedef adresi bilmez (bkz. ServiceAnnouncement).
   */
  services?: readonly ServiceAnnouncement[];
  /** Heartbeat gönderim aralığı (ms) — operational config ile değişebilir. */
  heartbeatIntervalMs: number;
  /**
   * Log olay kodları — nötr varsayılanlar; tüketici kendi (domain) kodlarını
   * enjekte eder. Paket domain sözlüğü bilmez.
   */
  eventCodes?: Partial<TunnelConnectorEventCodes>;
  /** Register sonrası ack bekleme süresi (ms) — aşarsa backoff. */
  registerTimeoutMs: number;
  /** Pong alınmazsa bağlantı yarı-ölü sayılır (ms). */
  livenessTimeoutMs: number;
}

/** Connector log olay kodları — nötr varsayılanlar. */
export interface TunnelConnectorEventCodes {
  connected: string;
  connectionLost: string;
  registerRejected: string;
  configRejected: string;
}

/** Varsayılan olay kodları — transport-nötr. */
export const DEFAULT_TUNNEL_EVENT_CODES: Readonly<TunnelConnectorEventCodes> =
  Object.freeze({
    connected: "tunnel_connected",
    connectionLost: "tunnel_connection_lost",
    registerRejected: "tunnel_register_rejected",
    configRejected: "tunnel_config_rejected",
  });

/**
 * TunnelConnector — client→hub outbound WS istemcisi (tasarım §6).
 *
 * Sorumluluklar: register + heartbeat + PPC durumu (`state()`) + operational
 * config alımı (register-ack.config / config-update — restart'sız). Tünel
 * stream'leri aynı kanala eklenir.
 *
 * Domain mesajları (telemetri/operasyon/olay) TAŞIMAZ; bilinmeyen tipler
 * `onMessage` abonelerine akar.
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
 * Yan etkiler: `ws` soketi (enjekte fabrikadan), ILogger (geçiş-odaklı loglar —
 * kodlar `eventCodes` ile enjekte edilir; varsayılanlar nötrdür).
 */
export class TunnelConnector implements ITunnelChannel {
  private stateValue: TunnelConnectorState = "offline";
  private socket?: ISocketClient;
  private generation = 0;
  private attempt = 0;
  private urlIndex = 0;
  private stopped = false;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private registerTimer?: ReturnType<typeof setTimeout>;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private lastHeartbeatSentAt?: number;
  private lastPongAt = 0;
  private operational: Required<TunnelOperationalConfig>;
  private readonly eventCodes: TunnelConnectorEventCodes;
  private readonly messageSubscribers: Set<(message: unknown) => void> = new Set();
  private readonly binarySubscribers: Set<(data: Buffer) => void> = new Set();

  // ELEGANT-EXCEPTION: `now` parametresi test determinizmi için varsayılan değer
  // taşır — üretim kodu açıkça enjekte etmez (AlertNotifier deseni, core).
  constructor(
    private readonly config: TunnelConnectorConfig,
    private readonly socketFactory: ISocketClientFactory,
    private readonly reconnectDelay: ReconnectDelay,
    private readonly logger?: ILogger,
    private readonly now: () => number = () => Date.now(),
  ) {
    if (config.wsUrls.length === 0) {
      throw new ValidationError(
        "tunnel-connector.no-url",
        "en az bir hub WS URL gerekli",
      );
    }
    if (config.token.trim().length === 0) {
      throw new ValidationError(
        "tunnel-connector.no-token",
        "service token bos olamaz",
      );
    }
    if (config.peerId.trim().length === 0) {
      throw new ValidationError(
        "tunnel-connector.no-peer-id",
        "peerId bos olamaz",
      );
    }
    if (config.heartbeatIntervalMs <= 0) {
      throw new ValidationError(
        "tunnel-connector.invalid-interval",
        "heartbeat araligi pozitif olmali",
      );
    }
    this.operational = {
      heartbeatIntervalMs: config.heartbeatIntervalMs,
    };
    this.eventCodes = {
      ...DEFAULT_TUNNEL_EVENT_CODES,
      ...config.eventCodes,
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
  state(): TunnelConnectorState {
    return this.stateValue;
  }

  /** Hub'a bağlı mı — PPC kaynağı (sorgu). */
  connected(): boolean {
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
   * Faz 3: tünel kontrol mesajı aboneliği — TunnelConnector'ın bilmediği tipler
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
        this.log("warn", "app", this.eventCodes.connectionLost, "Hub register ack alinamadi", {
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
      this.log("warn", "app", this.eventCodes.connectionLost, "Hub WS soket hatasi", {
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
        this.log("warn", "security", this.eventCodes.registerRejected, "Hub baglantisi reddedildi", {
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
          this.log("warn", "security", this.eventCodes.registerRejected, "Hub register reddetti", {
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
        this.log("info", "app", this.eventCodes.connected, "Hub baglantisi kuruldu", {
          peerId: this.config.peerId,
          peerType: this.peerType(),
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
        this.log("warn", "app", this.eventCodes.connectionLost, "Hub protokol hatasi", {
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
      this.log("warn", "app", this.eventCodes.connectionLost, "Hub baglantisi yari-olu", {
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

  private applyOperationalConfig(input: unknown): void {
    const parsed = tunnelOperationalConfigSchema.safeParse(input);
    if (!parsed.success) {
      this.log("warn", "app", this.eventCodes.configRejected, "Gecersiz operational config", {
        reason: "schema",
      });
      return;
    }
    this.operational = { ...this.operational, ...parsed.data };
    if (this.stateValue === "connected" || this.stateValue === "registered") {
      this.scheduleHeartbeat();
    }
    this.log("info", "app", this.eventCodes.connected, "Operational config uygulandi", {
      heartbeatIntervalMs: this.operational.heartbeatIntervalMs,
    });
  }

  private scheduleHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(
      () => this.sendHeartbeat(),
      this.operational.heartbeatIntervalMs,
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
    this.log("warn", "app", this.eventCodes.connectionLost, "Hub baglantisi koptu", {
      reason,
      attempt: this.attempt,
      reconnectInMs: delay,
    });
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  private clearTimers(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.registerTimer) clearTimeout(this.registerTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.heartbeatTimer = undefined;
    this.registerTimer = undefined;
    this.reconnectTimer = undefined;
  }

  private registerFrame(): string {
    const services = this.config.services;
    const frame: RegisterMessage = {
      type: "register",
      peerId: this.config.peerId,
      peerType: this.peerType(),
      protocolVersion: TUNNEL_PROTOCOL_VERSION,
      // Yalnızca doluysa eklenir — services'siz mesaj mevcut v2 ile birebir aynı.
      ...(services && services.length > 0
        ? { services: [...services] }
        : {}),
    };
    return JSON.stringify(frame);
  }

  /** Peer türü — varsayılan "container" (geriye uyumluluk). */
  private peerType(): TunnelPeerType {
    return this.config.peerType ?? "container";
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
