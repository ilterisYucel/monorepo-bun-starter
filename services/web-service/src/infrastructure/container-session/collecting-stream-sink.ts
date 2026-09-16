// Tünel HTTP yanıtını bellekte toplayan IStreamSink — sunucu-tarafı programatik
// istekler için (field → konteyner komut proxy'si; tarayıcı akışı değil).

import type { IStreamSink } from "@gd-monorepo/ws-tunnel";

interface CollectedResponse {
  statusCode: number;
  headers: Record<string, string>;
  body: Buffer;
}

/**
 * CollectingStreamSink — tünel yanıtını toplar ve `completed()` vaadiyle
 * sunar. `destroy()` (RST/kesinti) vaadi reject eder. `onClose` no-op'tur —
 * tüketici gövde tamamlanmasını `completed()` üzerinden bekler.
 */
export class CollectingStreamSink implements IStreamSink {
  private statusCode = 0;
  private headers: Record<string, string> = {};
  private readonly chunks: Buffer[] = [];
  private resolveEnd: (() => void) | undefined;
  private rejectEnd: ((error: Error) => void) | undefined;
  private readonly endPromise = new Promise<void>((resolve, reject) => {
    this.resolveEnd = resolve;
    this.rejectEnd = reject;
  });

  status(code: number, headers?: Record<string, string>): void {
    this.statusCode = code;
    if (headers) this.headers = headers;
  }

  write(chunk: Buffer): void {
    this.chunks.push(chunk);
  }

  end(): void {
    this.resolveEnd?.();
  }

  destroy(): void {
    this.rejectEnd?.(new Error("tunel akisi kesildi"));
  }

  onClose(_callback: () => void): void {
    // toplayıcı sink bağlantı kopmasını destroy() üzerinden görür
  }

  /** Yanıtı bekler (sorgu) — kesinti durumunda reject. */
  async completed(): Promise<CollectedResponse> {
    await this.endPromise;
    return {
      statusCode: this.statusCode,
      headers: this.headers,
      body: Buffer.concat(this.chunks),
    };
  }
}
