/** IPeerDisconnector — aktif peer bağlantısını düşürme portu. */
export interface IPeerDisconnector {
  /** Bağlıysa soketi kapatır ve kayıt temizliğini yapar; yoksa no-op. */
  disconnect(peerId: string): void;
}
