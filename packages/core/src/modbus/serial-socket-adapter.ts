import { EventEmitter } from "node:events";

/**
 * bun-serialport port yüzeyi — adapter yalnız bu sözleşmeyi bilir.
 * Gerçek port `connect()` içinde dinamik import ile üretilip enjekte edilir
 * (Node tabanlı test/araçlar `bun:ffi`yi yüklemesin).
 */
export interface SerialPortLike {
  readonly isOpen: boolean;
  on(event: "open", handler: () => void): unknown;
  on(event: "data", handler: (chunk: Uint8Array) => void): unknown;
  on(event: "error", handler: (error: Error) => void): unknown;
  on(event: "close", handler: (error?: unknown) => void): unknown;
  open(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
}

/**
 * SerialSocketAdapter — `bun-serialport` portunu jsmodbus RTU'nun beklediği
 * socket sözleşmesine bağlar:
 *
 * - `'open'` olayı + `isOpen` (jsmodbus bağlantı kurulumunu bunlarla yapar)
 * - `write(buffer, callback)` (jsmodbus callback bekler; burada Promise'e köprü)
 * - `'data'` olayı `Buffer` olarak iletilir (bun-serialport `Uint8Array` verir)
 * - `'error'` / `'close'` birebir aktarılır
 *
 * Bun-only: port üretimi `bun:ffi` kullanır (Node'da çalışmaz). Bilinçli
 * tercih — bkz. KAPANIŞ A.14. Kaynak sarmalayıcısıdır (mutable by design).
 */
export class SerialSocketAdapter extends EventEmitter {
  constructor(private readonly port: SerialPortLike) {
    super();
    this.port.on("open", () => this.emit("open"));
    this.port.on("data", (chunk: Uint8Array) =>
      this.emit("data", Buffer.from(chunk)),
    );
    this.port.on("error", (error: Error) => this.emit("error", error));
    this.port.on("close", (error?: unknown) => this.emit("close", error));
  }

  get isOpen(): boolean {
    return this.port.isOpen;
  }

  /**
   * Portu aç (dinleyiciler bağlandıktan SONRA çağrılmalı). `autoOpen` kapalı
   * üretilir — açılış 'open' olayı kimse dinlemeden kaçmasın.
   */
  open(): void {
    void this.port.open().catch((error: Error) => this.emit("error", error));
  }

  /** jsmodbus `write(payload, callback)` sözleşmesi — callback hata alır. */
  write(data: Uint8Array, callback?: (error?: Error) => void): void {
    this.port.write(data).then(
      () => callback?.(),
      (error: Error) => callback?.(error),
    );
  }

  close(): void {
    // Best-effort: açık değilken close() reddeder (bun-serialport) — yutulur.
    void this.port.close().catch(() => undefined);
  }
}
