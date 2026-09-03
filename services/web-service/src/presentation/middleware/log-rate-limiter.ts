/** LogRateLimiter yapılandırması — tek obje (DI kuralı 3). */
export interface LogRateLimiterConfig {
  readonly maxPerMinute?: number;
  readonly now?: () => number;
}

const DEFAULT_MAX_PER_MINUTE = 60;
const WINDOW_MS = 60_000;

/**
 * LogRateLimiter — kayan pencere sayaçlı basit rate-limit (T0.8).
 * `/api/logs` app kategorisi (güvenilmez kaynak) için; tam WAF/rate-limit
 * katmanı Faz 6'dadır.
 */
export class LogRateLimiter {
  private readonly counts = new Map<string, { count: number; windowStart: number }>();
  private readonly maxPerMinute: number;
  private readonly now: () => number;

  constructor(config: LogRateLimiterConfig = {}) {
    this.maxPerMinute = config.maxPerMinute ?? DEFAULT_MAX_PER_MINUTE;
    this.now = config.now ?? (() => Date.now());
  }

  /** Anahtarın mevcut pencerede bir istek hakkı var mı? (sorgu — sayaç artırır) */
  allow(key: string): boolean {
    const now = this.now();
    const entry = this.counts.get(key);

    if (entry === undefined || now - entry.windowStart >= WINDOW_MS) {
      this.counts.set(key, { count: 1, windowStart: now });
      return true;
    }
    if (entry.count >= this.maxPerMinute) {
      return false;
    }
    entry.count++;
    return true;
  }
}
