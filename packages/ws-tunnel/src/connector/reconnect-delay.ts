import { ValidationError } from "@gd-monorepo/result";

/** ReconnectDelay yapılandırması — tüm alanlar zorunlu (birincil constructor). */
export interface ReconnectDelayConfig {
  /** Taban gecikme (ms) — attempt 1'deki değer. */
  baseMs: number;
  /** Maksimum gecikme (ms) — üstel büyüme bu değeri aşamaz. */
  maxMs: number;
  /** Jitter açıklığı (ms) — [0, jitterSpanMs) aralığında ekleme. */
  jitterSpanMs: number;
  /** [0, 1) aralığında rastgele değer üretici — testlerde deterministik enjekte edilir. */
  jitter: () => number;
}

/**
 * ReconnectDelay — üstel backoff hesaplayıcı (tasarım §6):
 *
 * `delayFor(attempt)` = `min(maxMs, baseMs · 2^(attempt-1) + jitter() · jitterSpanMs)`.
 * `reset()` başarılı bağlantıda çağrılır — bir sonraki kopuş yeniden tabandan başlar
 * (reconnect fırtınası önlenir, tasarım §12.4).
 *
 * Immutable — durum yalnızca `reset()` komutuyla değişir (Elegant Object kural 3).
 */
export class ReconnectDelay {
  private readonly baseMs: number;
  private readonly maxMs: number;
  private readonly jitterSpanMs: number;
  private readonly jitter: () => number;

  constructor(config: ReconnectDelayConfig) {
    if (!Number.isInteger(config.baseMs) || config.baseMs <= 0) {
      throw new ValidationError(
        "reconnect.invalid-base",
        "baseMs pozitif tamsayi olmali",
        { context: { baseMs: config.baseMs } },
      );
    }
    if (!Number.isInteger(config.maxMs) || config.maxMs < config.baseMs) {
      throw new ValidationError(
        "reconnect.invalid-max",
        "maxMs tabandan kucuk olamaz",
        { context: { baseMs: config.baseMs, maxMs: config.maxMs } },
      );
    }
    if (!Number.isFinite(config.jitterSpanMs) || config.jitterSpanMs < 0) {
      throw new ValidationError(
        "reconnect.invalid-jitter-span",
        "jitterSpanMs negatif olamaz",
        { context: { jitterSpanMs: config.jitterSpanMs } },
      );
    }
    this.baseMs = config.baseMs;
    this.maxMs = config.maxMs;
    this.jitterSpanMs = config.jitterSpanMs;
    this.jitter = config.jitter;
  }

  /** `attempt` (1 tabanlı) için beklenmesi gereken gecikmeyi döndürür (ms). */
  delayFor(attempt: number): number {
    if (!Number.isInteger(attempt) || attempt < 1) {
      throw new ValidationError(
        "reconnect.invalid-attempt",
        "attempt 1 tabanli pozitif tamsayi olmali",
        { context: { attempt } },
      );
    }
    const jittered = this.jitter();
    if (!(jittered >= 0 && jittered < 1)) {
      throw new ValidationError(
        "reconnect.invalid-jitter",
        "jitter [0, 1) araliginda olmali",
        { context: { jitter: jittered } },
      );
    }
    const exponential = this.baseMs * 2 ** (attempt - 1);
    return Math.min(this.maxMs, exponential + Math.floor(jittered * this.jitterSpanMs));
  }

  /** Başarılı bağlantıda çağrılır — bir sonraki kopuş tabandan başlar. */
  reset(): void {
    // Durum yok — hesaplama attempt girdisine dayanır; FieldConnector sayaç
    // tutar ve reset sonrası attempt'ı 1'e döndürür.
  }
}
