import { closeSync, fsyncSync, mkdirSync, openSync, writeSync } from "node:fs";
import { dirname } from "node:path";
import type { ILogSink, LogRecord } from "../types";

/** FileSink yapılandırması — tek obje (DI kuralı 3). */
export interface FileSinkConfig {
  readonly path: string;
}

/**
 * FileSink — append-only dosya sink'i. Her kaydı tek JSON satırı olarak yazar
 * (yapısal analiz için). İlk yazımda üst dizini oluşturur; her yazımda fsync
 * (dayanıklılık). `close()` dosya tanıtıcısını kapatır.
 *
 * Fail-open notu: yazma hatası çağırana sızmaz — Logger sink hatalarını yutar.
 */
export class FileSink implements ILogSink {
  private descriptor: number | undefined;
  private closed = false;

  constructor(private readonly config: FileSinkConfig) {}

  write(record: LogRecord): void {
    if (this.closed) {
      throw new Error("[FileSink] kapalı — yazma reddedildi");
    }
    const descriptor =
      this.descriptor ??
      (this.descriptor = (() => {
        mkdirSync(dirname(this.config.path), { recursive: true });
        return openSync(this.config.path, "a");
      })());

    writeSync(descriptor, `${JSON.stringify(record)}\n`);
    fsyncSync(descriptor);
  }

  close(): void {
    this.closed = true;
    if (this.descriptor !== undefined) {
      closeSync(this.descriptor);
      this.descriptor = undefined;
    }
  }
}
