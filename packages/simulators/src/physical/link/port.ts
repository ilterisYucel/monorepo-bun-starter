// Cihaz portları — modelin pipe uçlarına bağlanma noktası (SPEC §6.2).
//
// Sözleşme:
// - Port bildirimi model kodundadır (tipli); hangi pipe'a bağlı olduğu site
//   JSON'dan gelir (UC-3).
// - `InputPort.read` bir sorgudur: son sinyal → pipe default → port fallback.
// - `OutputPort.publish` bir komuttur; değer kanala tick sınırında görünür.
// - Basit transform `BmsLink#MappingEntry` alt kümesidir: bit seçimi ya da
//   `ratio × value + offset` (işaretsiz 16-bit maskeleme BmsLink ile aynı).

import type { PipeSet } from "./pipe";

/** Basit sayısal transform — bit seçimi önceliklidir. */
export interface BitTransform {
  readonly ratio?: number;
  readonly offset?: number;
  /** Verilirse değerin bu biti (0|1) döner; ratio/offset yok sayılır. */
  readonly bit?: number;
}

export interface InputPortConfig {
  /** Bağlanılacak kanal adı. */
  readonly pipe: string;
  /** Kanalda ne sinyal ne default varsa kullanılacak değer (bağımsız ünite). */
  readonly fallback?: unknown;
  readonly transform?: BitTransform;
}

/**
 * Giriş portu — tüketici ucu.
 * Pipe bağlı değilken `fallback` ile çalışır (FR-2.1); hiçbiri yoksa `undefined`.
 */
export class InputPort<T = unknown> {
  constructor(
    private readonly set: PipeSet,
    private readonly config: InputPortConfig,
  ) {}

  /** Sorgu — güncel değer (transform uygulanmış). */
  read(tick = 0): T | undefined {
    const signal = this.set.read(this.config.pipe, tick);
    const raw = signal?.value ?? this.config.fallback;
    if (raw === undefined) return undefined;
    if (this.config.transform === undefined) return raw as T;
    if (typeof raw !== "number") return raw as T;
    return applyTransform(raw, this.config.transform) as T;
  }
}

/** Çıkış portu — yayıncı ucu. */
export class OutputPort {
  constructor(
    private readonly set: PipeSet,
    private readonly pipe: string,
  ) {}

  /** Komut — değeri kanala yazar (tick sınırında görünür). */
  publish(value: unknown, source: string, tick = 0): void {
    this.set.publish({ name: this.pipe, value, tick, source });
  }
}

/** Bit seçimi ya da ölçekleme; sonuç işaretsiz 16-bit'e maskelenir. */
function applyTransform(value: number, transform: BitTransform): number {
  if (transform.bit !== undefined) return (value >> transform.bit) & 1;
  const scaled = Math.round(value * (transform.ratio ?? 1) + (transform.offset ?? 0));
  return scaled & 0xffff;
}
