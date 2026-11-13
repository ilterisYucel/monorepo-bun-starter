// Pipe çekirdeği — cihaz modelleri arası sinyal taşıma kontratı (SPEC §6.1).
//
// Sözleşme:
// - Pipe KARAR VERMEZ — yalnız son değeri taşır (K1); etki tüketici modelin
//   state machine'inde yaşar.
// - Pull-based (K3): yayıncı `publish` (komut), tüketici `read` (sorgu).
//   Yayınlanan değer `commit()` sonrası görünür olur → aynı tick içinde okuyan
//   önceki değeri görür (tek tick gecikme, deterministik).
// - Yayıncısız kanal mock default döner; default yoksa bir kez uyarı basılır (FR-1.2).
// - Sinyal immutable'dır: `publish` gelen sinyali dondurarak saklar (FR-1.3).
//
// Transport değişebilir (K2): bugün `InMemoryTransport`; ileride `TcpTransport`.

/** Kanalda taşınan son değer — immutable DTO. */
export interface Signal<T = unknown> {
  /** Kanal adı (ör. "branch.H04.energized"). */
  readonly name: string;
  readonly value: T;
  /** Yayın anındaki simülasyon saniyesi. */
  readonly tick: number;
  /** Yayıncı anahtarı (cihaz ya da solver kimliği). */
  readonly source: string;
}

/** Taşıma katmanı sözleşmesi — in-memory bugün, TCP İleri İş (A1). */
export interface IPipeTransport {
  /** Komut — kanalın son değerini sahne alanına yazar (commit'e kadar görünmez). */
  publish(signal: Signal): void;
  /** Sorgu — son commit edilmiş değer; yayın yoksa `undefined`. */
  read(name: string): Signal | undefined;
  /** Komut — sahne alanındaki yayınları görünür kılar (tick sınırı). */
  commit(): void;
}

/** Servis içi transport — son değer, tek tick gecikmeli görünürlük. */
export class InMemoryTransport implements IPipeTransport {
  private readonly staged = new Map<string, Signal>();
  private readonly committed = new Map<string, Signal>();

  publish(signal: Signal): void {
    this.staged.set(signal.name, snapshot(signal));
  }

  read(name: string): Signal | undefined {
    return this.committed.get(name);
  }

  commit(): void {
    for (const [name, signal] of this.staged) this.committed.set(name, signal);
    this.staged.clear();
  }
}

/**
 * Null-object transport — yayınları yok sayar, hiçbir değer döndürmez.
 * Bağımsız ünite senaryosu: cihaz yalnız kendi mock default'larıyla çalışır (K2).
 */
export class MockTransport implements IPipeTransport {
  publish(): void {
    // mock: yayıncı yok — komut yok sayılır
  }

  read(): undefined {
    return undefined;
  }

  commit(): void {
    // mock: sahne alanı yok
  }
}

/** Yayın anında derin kopya + dondurma — kanal değeri dışarıdan bozulamaz (FR-1.3). */
function snapshot(signal: Signal): Signal {
  return Object.freeze({ ...signal, value: deepFreeze(structuredClone(signal.value)) });
}

function deepFreeze<T>(value: T): T {
  if (typeof value === "object" && value !== null) {
    Object.freeze(value);
    for (const nested of Object.values(value)) deepFreeze(nested);
  }
  return value;
}

export interface PipeSetConfig {
  /** Varsayılan: `InMemoryTransport`. */
  readonly transport?: IPipeTransport;
  /** Kanal başına mock default (site JSON'dan). */
  readonly defaults?: Readonly<Record<string, unknown>>;
  /** Tanımsız kanal uyarısı — kanal başına bir kez çağrılır. */
  readonly warn?: (name: string) => void;
}

/**
 * Adlandırılmış kanal seti — yayıncılar `publish`, tüketiciler `read` eder.
 * Mock default önceliği: son sinyal → pipe default → (port fallback, `port.ts`).
 */
export class PipeSet {
  private readonly transport: IPipeTransport;
  private readonly defaults: Readonly<Record<string, unknown>>;
  private readonly warn: (name: string) => void;
  private readonly warned = new Set<string>();

  constructor(config: PipeSetConfig = {}) {
    this.transport = config.transport ?? new InMemoryTransport();
    this.defaults = config.defaults ?? {};
    this.warn = config.warn ?? (() => undefined);
  }

  /** Komut — yayıncı sinyali kanala yazar. */
  publish(signal: Signal): void {
    this.transport.publish(signal);
  }

  /** Sorgu — son değer; yoksa mock default; ikisi de yoksa uyarı + `undefined`. */
  read(name: string, tick = 0): Signal | undefined {
    const signal = this.transport.read(name);
    if (signal !== undefined) return signal;
    const value = this.defaults[name];
    if (value !== undefined) return { name, value, tick, source: "mock" };
    if (!this.warned.has(name)) {
      this.warned.add(name);
      this.warn(name);
    }
    return undefined;
  }

  /** Komut — tick sınırı; sahne alanındaki yayınları görünür kılar. */
  commit(): void {
    this.transport.commit();
  }
}
