/**
 * Plugin kategorisi.
 * - "integration": entegrasyon servisinde calisan veri toplama pluginleri
 * - "management": management servisinde calisan otomasyon/trigger pluginleri
 * - "custom": musteriye ozel pluginler
 */
export type PluginKind = "integration" | "management" | "custom";

/**
 * Plugin tanimlayici metadata.
 * Her plugin mutlaka bir manifest sunar — loader ve registry bu veriye gore calisir.
 */
export interface PluginManifest {
  /** Benzersiz plugin adi (slug): "epias-market-prices" */
  name: string;
  /** Semver versiyon: "1.2.0" */
  version: string;
  kind: PluginKind;
  /** Uyumlu oldugu SDK versiyon araligi: ">=1.0.0 <2.0.0" */
  sdkVersion: string;
  description: string;
}
