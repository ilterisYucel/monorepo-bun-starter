/**
 * IStreamSink — tünel proxy'sinin yazdığı HTTP yanıt görünümü (jenerik).
 * Monorepo implementasyonu: `FastifyStreamSink` (web-service — `reply.raw`
 * ServerResponse'unu sarar). RST/destroy akış iptalidir.
 */
export interface IStreamSink {
  /** HTTP durum kodu + başlıklar (writeHead karşılığı). */
  status(code: number, headers?: Record<string, string>): void;
  /** Gövde parçası yazar. */
  write(chunk: Buffer): void;
  /** Yanıtı normal sonlandırır. */
  end(): void;
  /** Yanıtı iptal eder (RST / istemci kopması). */
  destroy(): void;
  /** İstemci bağlantısı kapandığında bildirir. */
  onClose(callback: () => void): void;
}
