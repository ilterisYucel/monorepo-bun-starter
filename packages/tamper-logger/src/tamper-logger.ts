import { randomUUID } from "node:crypto";
import type { LogLevel } from "./types";
import type { LogEvent, LogEventInput } from "./types";
import {
  GENESIS_HASH,
  enrichEvent,
  signEvent,
  nextState,
  redactEvent,
} from "./pipeline";
import type { SigningState } from "./pipeline";
import { DEFAULT_REDACTION_KEYS, LEVEL_RANK } from "./config";
import type { TamperLoggerConfig } from "./config";
import type { ILogSink } from "./interfaces";
import { AlertNotifier } from "./sinks/alert-notifier";

/** Drop sayaçları — hata seviyesi ayrı sayılır (health kararı için). */
export interface DropCounters {
  readonly error: number;
  readonly nonError: number;
  readonly total: number;
}

/** Logger sağlık durumu. */
export interface LoggerHealth {
  readonly status: "healthy" | "degraded";
  readonly pendingBatch: number;
  readonly dropped: DropCounters;
  readonly lastFlushAt?: string;
}

/**
 * TamperLogger — tamper kanıtlı, config tabanlı log altyapısı.
 *
 * Mutable by design (state machine — kapatılabilir, zincir ilerler):
 * pipeline filter → redact → enrich → sign (HMAC + prevHash zinciri) → fan-out.
 * Sink yazımları write zinciriyle serileştirilir; olay sırası korunur.
 */
export class TamperLogger {
  private state: SigningState = { seq: 1, prevHash: GENESIS_HASH };
  private readonly pending: LogEvent[] = [];
  private readonly ring: LogEvent[] = [];
  private dropped = { error: 0, nonError: 0 };
  private closed = false;
  private degraded = false;
  private lastFlushAt: string | undefined;
  private writeChain: Promise<void> = Promise.resolve();
  private readonly timer: ReturnType<typeof setInterval>;
  private readonly sinks: ILogSink[];
  private readonly level: LogLevel;
  private readonly redactionKeys: string[];
  private readonly batchSize: number;
  private readonly ringBufferSize: number;
  private readonly signingKey: string;
  private readonly service: string;
  private readonly host: string;
  private readonly correlationIdFactory: () => string;
  private readonly alertNotifier: AlertNotifier | undefined;
  private readonly alertEventCodes: Set<string>;
  private readonly alertSinks: ILogSink[] = [];
  private readonly eventCodeValidator: ((code: string) => boolean) | undefined;

  constructor(config: TamperLoggerConfig) {
    if (config.sinks.length === 0) {
      throw new Error("[TamperLogger] en az bir sink gerekli");
    }
    if (config.signingKey.trim().length === 0) {
      throw new Error("[TamperLogger] signingKey boş olamaz");
    }
    this.sinks = [...config.sinks];
    this.level = config.level ?? "debug";
    this.redactionKeys = config.redactionKeys ?? [
      ...DEFAULT_REDACTION_KEYS,
    ];
    this.batchSize = config.batchSize ?? 50;
    this.ringBufferSize = config.ringBufferSize ?? 1024;
    this.signingKey = config.signingKey;
    this.service = config.service;
    this.host = config.host ?? "unknown";
    this.correlationIdFactory =
      config.correlationIdFactory ?? (() => randomUUID());
    this.eventCodeValidator = config.eventCodeValidator;
    // Faz 6 T6.7: alert kuralları — en iyi çaba (audit zincirini etkilemez).
    if (config.alertRules && config.alertRules.sinks.length > 0) {
      this.alertSinks.push(...config.alertRules.sinks);
      this.alertNotifier = new AlertNotifier({
        sinks: config.alertRules.sinks,
        cooldownMs: config.alertRules.cooldownMs,
      });
      this.alertEventCodes = new Set(config.alertRules.eventCodes);
    } else {
      this.alertNotifier = undefined;
      this.alertEventCodes = new Set();
    }
    this.timer = setInterval(() => {
      void this.flush();
    }, config.batchIntervalMs ?? 1000);
    this.timer.unref?.();
  }

  /** Olayı işler: filter → redact → enrich → sign → fan-out. */
  async log(input: LogEventInput): Promise<void> {
    if (this.closed) {
      throw new Error("[TamperLogger] kapatıldı — log kabul edilmez");
    }
    if (
      this.eventCodeValidator !== undefined &&
      !this.eventCodeValidator(input.eventCode)
    ) {
      throw new Error(
        `[TamperLogger] geçersiz eventCode: ${input.eventCode}`,
      );
    }
    if (
      input.category === "app" &&
      LEVEL_RANK[input.level] < LEVEL_RANK[this.level]
    ) {
      return;
    }
    const redacted = redactEvent(input, this.redactionKeys);
    const enriched = enrichEvent(
      redacted,
      this.state,
      this.service,
      this.host,
      this.correlationIdFactory,
    );
    const signed = signEvent(enriched, this.signingKey);
    this.state = nextState(this.state, signed.signature);
    this.pushRing(signed);

    if (input.category === "app") {
      this.pending.push(signed);
      if (this.pending.length >= this.batchSize) {
        await this.flush();
      }
      return;
    }

    // audit/security — fail-closed: önce kalan batch'i boşalt (sıra korunur),
    // sonra anında yaz; başarısızlık çağırana yayılır.
    await this.flush();
    await this.writeImmediate([signed]);
  }

  /** Düşen olay sayaçları (sorgu). */
  droppedEvents(): DropCounters {
    const { error, nonError } = this.dropped;
    return { error, nonError, total: error + nonError };
  }

  /** Ring buffer'daki son işlenmiş olaylar (sorgu). */
  recentEvents(limit?: number): LogEvent[] {
    const count = limit ?? this.ringBufferSize;
    return [...this.ring.slice(-count)];
  }

  /** Logger sağlık durumu (sorgu). */
  health(): LoggerHealth {
    const dropped = this.droppedEvents();
    return {
      status:
        this.degraded || dropped.error > 0 ? "degraded" : "healthy",
      pendingBatch: this.pending.length,
      dropped,
      lastFlushAt: this.lastFlushAt,
    };
  }

  /** Kalan batch'i flush eder ve sink'leri kapatır. */
  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    clearInterval(this.timer);
    await this.flush();
    await Promise.allSettled(this.sinks.map((sink) => sink.close()));
    await Promise.allSettled(this.alertSinks.map((sink) => sink.close()));
  }

  private pushRing(event: LogEvent): void {
    this.ring.push(event);
    if (this.ring.length > this.ringBufferSize) {
      this.ring.shift();
    }
  }

  private flush(): Promise<void> {
    const batch = this.pending.splice(0, this.pending.length);
    if (batch.length === 0) return Promise.resolve();
    return this.writeSerialized(batch, false);
  }

  private writeImmediate(events: LogEvent[]): Promise<void> {
    return this.writeSerialized(events, true);
  }

  private writeSerialized(
    events: LogEvent[],
    failClosed: boolean,
  ): Promise<void> {
    const task = this.writeChain.then(() => this.deliver(events, failClosed));
    this.writeChain = task.then(
      () => undefined,
      () => undefined,
    );
    return task;
  }

  private async deliver(
    events: LogEvent[],
    failClosed: boolean,
  ): Promise<void> {
    const results = await Promise.allSettled(
      this.sinks.map((sink) => sink.write(events)),
    );
    const failures = results.filter((result) => result.status === "rejected");

    // Faz 6 T6.7: eşleşen olaylar için en iyi çaba bildirimi — başarısızlık
    // sayılmaz/çökertmez (alert ≠ audit; audit fail-closed aşağıda).
    if (this.alertNotifier) {
      for (const event of events) {
        if (this.alertEventCodes.has(event.eventCode)) {
          this.alertNotifier
            .consider(event)
            .catch(() => {
              // alert hatası sessiz — health/drop sayaçları audit içindir
            });
        }
      }
    }

    if (failures.length > 0) {
      if (failClosed) {
        throw new Error(
          "[TamperLogger] audit/security sink yazımı başarısız — fail-closed",
        );
      }
      for (const event of events) {
        if (event.level === "error" || event.level === "fatal") {
          this.dropped.error++;
          this.degraded = true;
        } else {
          this.dropped.nonError++;
        }
      }
    }
    this.lastFlushAt = new Date().toISOString();
  }
}
