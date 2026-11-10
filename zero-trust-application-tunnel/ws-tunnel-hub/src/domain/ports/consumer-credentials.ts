/**
 * IConsumerCredentials — consumer (domain tüketicisi) kimlik portu.
 *
 * Peer token'ından AYRIDIR: peer'lar consumer kanalını açamaz (kanal izolasyonu).
 */
export interface IConsumerCredentials {
  verify(token: string): boolean;
}
