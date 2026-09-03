import type { LogEvent } from "../types";
import type { ILogSink } from "../interfaces";

/** AlertNotifier yapılandırması — tek obje (DI kuralı 3). */
export interface AlertNotifierConfig {
  readonly sinks: ILogSink[];
  readonly cooldownMs?: number;
  readonly now?: () => number;
}

const DEFAULT_COOLDOWN_MS = 300_000;

/**
 * AlertNotifier iskeleti — kural + cooldown: aynı eventCode için varsayılan
 * 5 dk'da en fazla 1 bildirim. Bildirim sink hatası yukarı fırlatılır.
 */
export class AlertNotifier {
  private readonly lastNotified = new Map<string, number>();
  private readonly sinks: ILogSink[];
  private readonly cooldownMs: number;
  private readonly now: () => number;

  constructor(config: AlertNotifierConfig) {
    if (config.sinks.length === 0) {
      throw new Error("[AlertNotifier] en az bir sink gerekli");
    }
    this.sinks = [...config.sinks];
    this.cooldownMs = config.cooldownMs ?? DEFAULT_COOLDOWN_MS;
    this.now = config.now ?? (() => Date.now());
  }

  /** Olayı cooldown kuralına göre sink'lere iletir. */
  async consider(event: LogEvent): Promise<void> {
    const now = this.now();
    const last = this.lastNotified.get(event.eventCode);
    if (last !== undefined && now - last < this.cooldownMs) return;

    const results = await Promise.allSettled(
      this.sinks.map((sink) => sink.write([event])),
    );
    const failure = results.find((result) => result.status === "rejected");
    if (failure !== undefined && failure.status === "rejected") {
      throw failure.reason;
    }
    this.lastNotified.set(event.eventCode, now);
  }
}
