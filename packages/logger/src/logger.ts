// packages/logger/src/logger.ts
//
// Genel logger — pino'yu İNCE sarmalar (K1). pino; seviye filtresi, child
// binding ve JSON serialization'ı yapar; bizim katmanımız ise her pino kaydını
// `ILogSink` listesine dağıtan ince bir fanout'tur. Kendi stringify/level
// makinemiz YAZILMAZ.

import { Writable } from "node:stream";
import pino from "pino";
import type { ILogSink, LogLevel, LogRecord, LoggerConfig } from "./types";
import { LOG_LEVELS } from "./types";
import { ConsoleSink } from "./sinks/console-sink";

type PinoInstance = ReturnType<typeof pino>;

/**
 * Sink kayıt defteri — kayıtları tüm sink'lere dağıtır.
 *
 * ELEGANT-EXCEPTION: sink listesi mutable by design — `addSink`/`removeSink`
 * özelliğin kendisidir; diğer tüm alanlar readonly.
 */
export class SinkRegistry {
  // ELEGANT-EXCEPTION: add/remove ile çalışma zamanında değişen tek alan.
  private readonly sinks: ILogSink[] = [];

  /** Sink'i ekler — aynı referans iki kez eklenirse tek sayılır. */
  add(sink: ILogSink): void {
    if (!this.sinks.includes(sink)) this.sinks.push(sink);
  }

  /** Sink'i çıkarır — listede yoksa no-op. */
  remove(sink: ILogSink): void {
    const index = this.sinks.indexOf(sink);
    if (index >= 0) this.sinks.splice(index, 1);
  }

  /**
   * Kaydı tüm sink'lere yazar. Fail-open (K5): bir sink'in senkron throw'u veya
   * reddedilen Promise'i diğer sink'leri ve çağıranı ETKİLEMEZ.
   */
  dispatch(record: LogRecord): void {
    for (const sink of this.sinks) {
      try {
        const result = sink.write(record);
        if (result !== undefined) {
          void result.catch(() => {});
        }
      } catch {
        // fail-open — yut
      }
    }
  }

  /** Tüm sink'leri kapatır; kapatma hataları yutulur. */
  async close(): Promise<void> {
    await Promise.allSettled(
      this.sinks.map((sink) => {
        try {
          return sink.close?.();
        } catch {
          return undefined;
        }
      }),
    );
  }
}

/**
 * pino çıktısını (her satır bir JSON kayıt) `ILogSink`'lere dağıtan Writable.
 * Sub-level kayıtlar pino tarafından buraya HİÇ ulaşmaz (FR-1.4).
 */
class SinkFanout extends Writable {
  constructor(private readonly registry: SinkRegistry) {
    super();
  }

  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    try {
      const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
      for (const line of text.split("\n")) {
        if (line.length === 0) continue;
        const record = toRecord(line);
        if (record) this.registry.dispatch(record);
      }
    } catch {
      // fail-open (K5) — bozuk satır loglamayı kesmez
    }
    callback();
  }
}

/** pino JSON satırını `LogRecord` sözleşmesine çevirir; geçersizse undefined. */
function toRecord(line: string): LogRecord | undefined {
  const parsed = JSON.parse(line) as Record<string, unknown>;
  const level = parsed.level;
  if (!isLogLevel(level)) return undefined;

  const component = parsed.component;
  const context = parsed.context;
  return {
    ts: typeof parsed.time === "string" ? parsed.time : new Date().toISOString(),
    level,
    service: typeof parsed.service === "string" ? parsed.service : "",
    ...(typeof component === "string" && component.length > 0 ? { component } : {}),
    message: typeof parsed.message === "string" ? parsed.message : "",
    ...(context !== null && typeof context === "object"
      ? { context: context as Record<string, unknown> }
      : {}),
  };
}

function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && (LOG_LEVELS as readonly string[]).includes(value);
}

/**
 * `child()` tarafından kullanılan iç bağlantı bilgisi (public constructor'ın
 * ikincil argümanı). Dışarıdan kullanım için DEĞİLDİR — barrel'dan export edilmez.
 */
export interface LoggerInternals {
  readonly registry: SinkRegistry;
  readonly pino: PinoInstance;
}

/**
 * Genel amaçlı logger.
 *
 * Sözleşme:
 * - `new Logger({ service, level? })` — kök logger; `level` yoksa `info`.
 *   `service` boş olamaz (throw). Varsayılan sink `ConsoleSink`'tir.
 * - `child(component)` — service/level/sink listesini devralır, `component` ekler.
 * - `debug/info/warn/error(message, context?)` — komutlar; `void` döner (CQS).
 *   Seviye altı çağrı sink'e ulaşmaz (pino erken filtre).
 * - `addSink`/`removeSink` — çalışma zamanında sink yönetimi.
 * - `close()` — tüm sink'leri kapatır; hata yutulur.
 * - Loglama asla throw ETMEZ (fail-open, K5).
 */
export class Logger {
  private readonly serviceName: string;
  private readonly levelName: LogLevel;
  private readonly registry: SinkRegistry;
  private readonly pino: PinoInstance;

  constructor(config: LoggerConfig, internals?: LoggerInternals) {
    if (config.service.trim().length === 0) {
      throw new Error("[Logger] service boş olamaz");
    }
    this.serviceName = config.service;
    this.levelName = config.level ?? "info";

    const registry = internals?.registry ?? new SinkRegistry();
    if (internals === undefined) registry.add(new ConsoleSink());
    this.registry = registry;

    this.pino =
      internals?.pino ??
      pino(
        {
          level: config.level ?? "info",
          base: { service: config.service },
          messageKey: "message",
          timestamp: pino.stdTimeFunctions.isoTime,
          formatters: { level: (label) => ({ level: label }) },
        },
        new SinkFanout(registry),
      );
  }

  /** Aynı service/level/sink listesini devralan component'li logger üretir. */
  child(component: string): Logger {
    return new Logger(
      { service: this.serviceName, level: this.levelName },
      { registry: this.registry, pino: this.pino.child({ component }) },
    );
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.emit("debug", message, context);
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.emit("info", message, context);
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.emit("warn", message, context);
  }

  error(message: string, context?: Record<string, unknown>): void {
    this.emit("error", message, context);
  }

  addSink(sink: ILogSink): void {
    this.registry.add(sink);
  }

  removeSink(sink: ILogSink): void {
    this.registry.remove(sink);
  }

  async close(): Promise<void> {
    await this.registry.close();
  }

  private emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    try {
      if (context === undefined) {
        this.pino[level](message);
      } else {
        this.pino[level]({ context }, message);
      }
    } catch {
      // fail-open (K5) — loglama asla throw etmez
    }
  }
}
