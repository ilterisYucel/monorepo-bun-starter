/**
 * IPeerBootstrapRepository — peer kimlik yaşam döngüsü portu (hub-servis).
 *
 * Bootstrap üretimi, tek-kullanımlı takas (claim) ve iptal (revoke) bu
 * arayüzden yapılır; sqlite adapter'ı uygular. Domain/application bu portu
 * bilir, sqlite görmez.
 */

/** Bootstrap kaydı — token yalnız hash olarak saklanır. */
export interface BootstrapRecordInput {
  readonly peerId: string;
  readonly tokenHash: string;
  /** Son kullanma zamanı (ms epoch). */
  readonly expiresAt: number;
}

/** Claim girdisi — bootstrap tüketimi + kalıcı secret yazımı (atomik). */
export interface ClaimBootstrapRecord {
  readonly peerId: string;
  readonly bootstrapTokenHash: string;
  readonly secretHash: string;
  /** Şu anki zaman (ms epoch) — TTL kontrolü. */
  readonly now: number;
}

export interface IPeerBootstrapRepository {
  /** Peer için yeni bootstrap yazar; önceki kullanılmamış token geçersiz olur. */
  createBootstrap(input: BootstrapRecordInput): Promise<void>;
  /**
   * Geçerli (eşleşen + kullanılmamış + süresi geçmemiş) bootstrap'ı tüketir ve
   * kalıcı secret hash'ini yazar. Başarısızsa false (fail-closed).
   */
  claim(input: ClaimBootstrapRecord): Promise<boolean>;
  /** Kimliği iptal eder (secret geçersiz) + bekleyen bootstrap'ı siler. */
  revoke(peerId: string): Promise<void>;
}
