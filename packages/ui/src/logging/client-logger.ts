/** İstemci log tipi — LogEntry ile aynı küme (system_logs uyumluluğu). */
export type ClientLogType = "info" | "success" | "error" | "warning";

/** İstemciden gelen log olayı — POST /api/logs sözleşmesi (T0.8). */
export interface ClientLogEvent {
  type: ClientLogType;
  source: "user";
  message: string;
  details?: string;
}

/**
 * IClientLogTransport — ClientLogger'ın gönderim sözleşmesi.
 * `send` başarısızlıkta fırlatır (retry kararı logger'dadır).
 */
export interface IClientLogTransport {
  send(events: ClientLogEvent[]): Promise<void>;
}

/** ClientLogger yapılandırması — tek obje (DI kuralı 3). */
export interface ClientLoggerConfig {
  readonly transport: IClientLogTransport;
  readonly batchSize?: number;
  readonly batchIntervalMs?: number;
  readonly maxRetries?: number;
  readonly now?: () => number;
}

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_BATCH_INTERVAL_MS = 5000;
const DEFAULT_MAX_RETRIES = 2;

/**
 * ClientLogger — batch'li, retry'li, offline-drop'lu istemci loglayıcısı.
 * Mutable by design (state machine — timer + tampon yaşam döngüsü).
 * `log()` senkron komuttur: olay tampona girer, flush zamanlayıcıyla yapılır.
 */
export class ClientLogger {
  private readonly pendingEvents: ClientLogEvent[] = [];
  private readonly retryQueue: { events: ClientLogEvent[]; retries: number }[] = [];
  private dropped = 0;
  private closed = false;
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly transport: IClientLogTransport;
  private readonly batchSize: number;
  private readonly maxRetries: number;

  constructor(config: ClientLoggerConfig) {
    if (config.transport === undefined || config.transport === null) {
      throw new Error("[ClientLogger] transport zorunludur");
    }
    this.transport = config.transport;
    this.batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
    this.maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.timer = setInterval(() => {
      void this.flush();
    }, config.batchIntervalMs ?? DEFAULT_BATCH_INTERVAL_MS);
  }

  /** Olayı tampona ekler — komut (fire-and-forget). */
  log(event: ClientLogEvent): void {
    if (this.closed) return;
    this.pendingEvents.push(event);
    if (this.pendingEvents.length >= this.batchSize) {
      void this.flush();
    }
  }

  /** Bekleyen olay sayısı (sorgu). */
  pending(): number {
    return this.pendingEvents.length;
  }

  /** Düşen olay sayısı (sorgu). */
  droppedEvents(): number {
    return this.dropped;
  }

  /** Tampon + retry kuyruğunu gönderir — komut. */
  async flush(): Promise<void> {
    if (this.closed && this.pendingEvents.length === 0 && this.retryQueue.length === 0) {
      return;
    }
    const batch = this.pendingEvents.splice(0, this.pendingEvents.length);
    if (batch.length > 0) {
      this.retryQueue.push({ events: batch, retries: 0 });
    }

    const results = await Promise.allSettled(
      this.retryQueue.splice(0, this.retryQueue.length).map((entry) =>
        this.deliver(entry.events, entry.retries),
      ),
    );
    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        this.retryQueue.push(result.value);
      }
    }
  }

  /** Timer'ı durdurur ve kalan tamponu flush eder — komut. */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    void this.flush();
  }

  private async deliver(
    events: ClientLogEvent[],
    retries: number,
  ): Promise<{ events: ClientLogEvent[]; retries: number } | undefined> {
    try {
      await this.transport.send(events);
      return undefined;
    } catch {
      if (retries + 1 > this.maxRetries) {
        this.dropped += events.length;
        return undefined;
      }
      return { events, retries: retries + 1 };
    }
  }
}

/**
 * Global hata yakalayıcıları kurar: window.onerror + unhandledrejection →
 * ClientLogger. Temizleme fonksiyonu döner (uygulama teardown'ında çağrılır).
 */
export function installGlobalErrorHandlers(
  logger: ClientLogger,
): () => void {
  const onError = (event: ErrorEvent): void => {
    logger.log({
      type: "error",
      source: "user",
      message: "window.onerror",
      details: `${event.message} @ ${event.filename ?? "?"}:${event.lineno ?? "?"}`,
    });
  };

  const onRejection = (event: PromiseRejectionEvent): void => {
    logger.log({
      type: "error",
      source: "user",
      message: "unhandledrejection",
      details: String(event.reason),
    });
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
