/**
 * ISocketClient — tünelin kullandığı soket görünümü (jenerik).
 * `ws` paketi `WsSocketClient` adapter'iyle gerçeklenir; testlerde fake soket
 * enjekte edilir (Strategy).
 */
export interface ISocketClient {
  /** Text frame gönderir (kontrol mesajı JSON). */
  send(data: string): void;
  /** Binary frame gönderir (tünel akış verisi — 9 bayt başlık + payload). */
  sendBinary(data: Uint8Array): void;
  /** WS protokol seviyesi ping — liveness tespiti için (pong beklenir). */
  ping(): void;
  /** Soketi kapatır. */
  close(): void;
  /** Bağlantı açıldı (upgrade tamam). */
  onOpen(callback: () => void): void;
  /** Text mesajı alındı. */
  onMessage(callback: (raw: string) => void): void;
  /** Binary mesajı alındı (tünel akış frame'leri). */
  onBinaryMessage(callback: (data: Buffer) => void): void;
  /** Bağlantı kapandı (her koşulda — hata sonrası dahil). */
  onClose(callback: () => void): void;
  /** Soket hatası — ardından onClose da tetiklenir. */
  onError(callback: (error: Error) => void): void;
  /** Pong alındı — liveness saati sıfırlanır. */
  onPong(callback: () => void): void;
  /**
   * Pre-upgrade ret — sunucu upgrade'i reddetti (örn. 401 service token).
   * `statusCode` HTTP yanıt kodudur.
   */
  onRejected(callback: (statusCode: number) => void): void;
  /** Güncel hazırlık durumu. */
  readyState(): "connecting" | "open" | "closing" | "closed";
}

/** Soket üretici sözleşmesi — URL + auth header'ları ile client oluşturur. */
export interface ISocketClientFactory {
  create(url: string, headers: Record<string, string>): ISocketClient;
}

/**
 * ITunnelChannel — client tarafı kanal (TEK outbound bağlantı).
 * TunnelConnector bu sözleşmeyi uygular; TunnelClient `attach(channel)` ile
 * tünel akışlarını aynı WS üzerinden çoklar.
 */
export interface ITunnelChannel {
  onMessage(subscriber: (message: unknown) => void): () => void;
  onBinaryFrame(subscriber: (data: Buffer) => void): () => void;
  sendControl(message: unknown): void;
  sendBinary(data: Buffer): void;
}

/**
 * IHubChannel — hub tarafı kanal (peer başına peerId).
 * Monorepo implementasyonu: `ContainerProxyFieldChannel` (ContainerProxy
 * adapter'i — sendControl/sendBinary/observer + bağlantı durumu).
 * İkinci deployment (boss uplink) aynı sözleşmeyi field kayıtları için uygular.
 */
export interface IHubChannel {
  sendControl(peerId: string, message: unknown): void;
  sendBinary(peerId: string, data: Buffer): void;
  onControlMessage(subscriber: (peerId: string, message: unknown) => void): () => void;
  onBinaryFrame(subscriber: (peerId: string, data: Buffer) => void): () => void;
  isConnected(peerId: string): boolean;
}
