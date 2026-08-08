/**
 * ConfigLoader tip tanimlari.
 *
 * Tum servisler (web-service, data-service, device-service, demo-backend)
 * bu tipleri kullanarak konfigürasyon yönetimini standartlastirir.
 */

/**
 * Desteklenen birim tipleri.
 * - "duration-pg": PostgreSQL uyumlu interval string ("6 hours", "90 days")
 * - "duration-ms": milisaniye cinsinden süre (30000ms → 30000)
 * - "bytes": byte birimi ("256MB", "1GB" → sayi)
 */
export type ConfigUnit = "duration-pg" | "duration-ms" | "bytes";

/**
 * Tek bir konfigürasyon girdisinin bildirimsel tanimi.
 *
 * @typeParam T — konfigürasyon degerinin tipi
 *
 * Oncelik zinciri (dusuk priority = yuksek oncelik):
 *   1. process.env (env anahtari)
 *   2. ConfigSource read() sonucu (dosya, .env, vs.)
 *   3. default deger
 *
 * @example
 * const CHUNK_INTERVAL: ConfigDefinition<string> = {
 *   key: "timescale.chunkInterval",
 *   env: "TIMESCALE_CHUNK_INTERVAL",
 *   default: "6 hours",
 *   unit: "duration-pg",
 *   validate: (v) => v as string,
 *   description: "Hypertable chunk zaman araligi",
 * };
 */
export interface ConfigDefinition<T = unknown> {
  /** Benzersiz anahtar. Nokta notasyonu ile gruplanir: "timescale.chunkInterval" */
  readonly key: string;

  /** process.env'de karsilik gelen degisken adi (istege bagli) */
  readonly env?: string;

  /**
   * Config dosyasindaki JSON/TOML/YAML yol.
   * Ornek: "timescale.chunk_interval" → config.timescale.chunk_interval
   */
  readonly filePath?: string;

  /** Varsayilan deger (hicbir kaynakta bulunamazsa kullanilir) */
  readonly default: T;

  /**
   * Opsiyonel dogrulama fonksiyonu.
   * Gecersiz degerde hata firlatmali (throw).
   * Ornek kullanim: (v) => validateOrThrow(mySchema, v, "label")
   */
  readonly validate?: (raw: unknown) => T;

  /**
   * Birim tipi. Belirtilirse ConfigLoader degeri normalize eder.
   * - "duration-pg": "6 hours" formatini kontrol eder
   * - "duration-ms": "30s" → 30000
   * - "bytes": "256MB" → 268435456
   */
  readonly unit?: ConfigUnit;

  /**
   * Gizli deger. true ise redacted() ciktisinda "***" olarak maskelenir.
   * JWT secret, veritabani sifresi gibi hassas degerler icin.
   */
  readonly secret?: boolean;

  /**
   * Degisiklik process restart gerektiriyor mu?
   * true ise ConfigChangeEvent.restartRequired = true olur.
   * Servis bunu yakalayip graceful restart yapabilir.
   */
  readonly restartOnChange?: boolean;

  /**
   * Turkce aciklama. Hata mesajlarinda ve debug ciktilarinda kullanilir.
   */
  readonly description?: string;

  /**
   * Deger degistiginde cagrilacak opsiyonel callback.
   * Servis seviyesinde yeniden yapilandirma icin kullanilir.
   * SADECE restart gerektirmeyen degisikliklerde cagrilmasi onerilir.
   */
  readonly onUpdate?: (newValue: T, oldValue: T) => void;
}

/**
 * Konfigürasyon kaynagi arabirimi.
 * Her kaynak bir okuma stratejisi tanimlar.
 */
export interface ConfigSource {
  /** Kaynak adi (log ve hata mesajlari icin). Ornek: "env", "json:service.json" */
  readonly name: string;

  /**
   * Oncelik degeri. Dusuk sayi = yuksek oncelik.
   *  10: process.env
   *  20: .env dosyasi
   *  30: Config dosyasi (JSON/YAML)
   *  40: Varsayilan
   */
  readonly priority: number;

  /**
   * Bir ConfigDefinition icin bu kaynaktan deger okur.
   * Bulunamazsa undefined dondurur.
   */
  read<T>(def: ConfigDefinition<T>): T | undefined;

  /**
   * Kaynakta degisiklik oldugunda tetiklenecek callback.
   * Sadece dosya tabanli kaynaklar icin anlamli (JSON, YAML, .env).
   */
  watch?(onChange: () => void): void;

  /** watch ile baslatilan izlemeyi durdurur. */
  unwatch?(): void;
}

/**
 * Konfigürasyon degisiklik olayi.
 * onChange subscriber'larina iletilir.
 */
export interface ConfigChangeEvent<T = unknown> {
  /** Degisen konfigürasyon anahtari */
  key: string;
  /** Eski deger */
  oldValue: T;
  /** Yeni deger */
  newValue: T;
  /** true ise bu degisiklik process restart gerektirir */
  restartRequired: boolean;
}

/** ConfigLoader.onChange icin dinleyici tipi */
export type ConfigChangeHandler<T = unknown> = (event: ConfigChangeEvent<T>) => void;

/**
 * ConfigLoader.load() sonrasi dondurulen deger haritasi.
 * Anahtar = ConfigDefinition.key, Deger = dogrulanmis tip.
 */
export type ConfigValues = Record<string, unknown>;
