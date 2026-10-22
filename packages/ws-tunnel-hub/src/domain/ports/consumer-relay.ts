/**
 * IConsumerRelay — peer'dan gelen opak kontrol mesajlarını tüketiciye ileten port.
 *
 * Hub mesajı YORUMLAMAZ; `{ peerId, message }` olarak opak akıtır.
 */
export interface IConsumerRelay {
  publish(peerId: string, message: unknown): void;
}
