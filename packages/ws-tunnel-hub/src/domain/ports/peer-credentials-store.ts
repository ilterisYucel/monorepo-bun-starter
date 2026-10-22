/**
 * IPeerCredentialsStore — peer kimlik doğrulama portu.
 *
 * Domain/application bu arayüzü bilir; env-dosya veya sqlite adapter'ı
 * uygular. İP-2 bootstrap/revocation akışı bu portun genişlemesidir.
 */
export interface IPeerCredentialsStore {
  /** Gelen token geçerli mi? (fail-closed — hata/eksik → false) */
  authenticate(token: string): Promise<boolean>;
}
