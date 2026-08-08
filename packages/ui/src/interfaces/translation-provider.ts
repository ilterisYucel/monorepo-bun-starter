/**
 * ITranslationProvider — çeviri sistemi için IoC arayüzü.
 *
 * UI paketi içindeki tüm bileşenler bu arayüz üzerinden çeviri yapar.
 * Somut implementasyon (React Context, Redux, harici API) uygulama katmanında
 * sağlanır — bileşenler sadece arayüze bağımlıdır.
 *
 * Tasarım prensipleri:
 *   - IoC: Bileşenler somut çeviri mekanizmasına değil, arayüze bağımlıdır
 *   - Değiştirilebilir: Farklı projeler farklı implementasyonlar kullanabilir
 *   - Tip güvenli: Çeviri anahtarları string literal union ile kısıtlanabilir
 */

/** Çeviri fonksiyonuna geçirilebilen parametreler */
export type TranslationParams = Record<string, string | number>;

/**
 * Çeviri sağlayıcı arayüzü.
 * Tüm bileşenler `t()` fonksiyonunu bu arayüz üzerinden çağırır.
 *
 * @example
 * // Bileşen içinde:
 * const { t, locale } = translation;
 * <label>{t("common.online")}</label>
 */
export interface ITranslationProvider {
  /**
   * Bir çeviri anahtarına karşılık gelen metni döndürür.
   * Anahtar bulunamazsa anahtarın kendisini döndürür (fallback).
   *
   * @param key — nokta notasyonlu çeviri anahtarı ("common.online")
   * @param params — isteğe bağlı değişkenler ("Toplam {count} kayıt")
   * @returns çevrilmiş metin
   */
  t(key: string, params?: TranslationParams): string;

  /**
   * Aktif yerel ayarı döndürür.
   * Örn: "tr", "en", "de"
   */
  locale(): string;

  /**
   * Yerel ayarı değiştirir. Asenkron olabilir — dinamik dil yüklemesi için.
   *
   * @param locale — hedef yerel ayar kodu
   */
  setLocale(locale: string): Promise<void>;

  /**
   * Kullanılabilir tüm yerel ayar kodlarını döndürür.
   * Salt-okunur — değiştirilemez.
   */
  availableLocales(): readonly string[];
}
