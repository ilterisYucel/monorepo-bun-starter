/**
 * HubTtlCache — küçük, saf TTL cache (container telemetri snapshot'ı için).
 *
 * Sözleşme:
 * - `get(key)`: TTL içindeyse değeri döner; süresi geçmişse `undefined` (kayıt `peek` için kalır).
 * - `peek(key)`: TTL'e BAKMADAN son değeri döner (latestTelemetry fallback'i).
 * - `set/delete/clear` komutlardır (void).
 * - `now` enjekte edilebilir (deterministik test).
 */
export interface HubTtlCacheConfig {
  /** TTL (ms). 0/negatif → TTL yok (her `get` taze sayılır). */
  readonly ttlMs: number;
  readonly now?: () => number;
}

export class HubTtlCache<T> {
  private readonly ttlMs: number;
  private readonly now: () => number;
  private readonly entries = new Map<string, { value: T; at: number }>();

  constructor(config: HubTtlCacheConfig) {
    this.ttlMs = config.ttlMs;
    this.now = config.now ?? (() => Date.now());
  }

  get(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (entry === undefined) return undefined;
    if (this.ttlMs > 0 && this.now() - entry.at >= this.ttlMs) {
      // Silme: `peek` son bilinen değeri fallback olarak dönebilsin.
      return undefined;
    }
    return entry.value;
  }

  /** TTL'e bakmadan son değer (fallback). */
  peek(key: string): T | undefined {
    return this.entries.get(key)?.value;
  }

  set(key: string, value: T): void {
    this.entries.set(key, { value, at: this.now() });
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }
}
