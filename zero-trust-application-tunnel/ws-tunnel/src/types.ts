/**
 * ws-tunnel jenerik alan tipleri — domain'e özgü DEĞİLDİR.
 *
 * Tünel bu tipleri YORUMLAMAZ: rolü tüketici eşler, yetkiyi tüketici RBAC'ı
 * uygular. Domain verisi kanaldan opak akar; tüketici kendi tiplerini bu
 * şekillere eşler.
 */

/** Tünel rolü — serbest string; eşleme/doğrulama tüketiciye aittir. */
export type TunnelRole = string;

/** Oturum kullanıcısı — tüketici tarafında EŞLENMİŞ rol ile taşınır. */
export interface TunnelUser {
  id: string;
  username: string;
  role: TunnelRole;
}
