import type { PluginManifest } from "./manifest";
import type { PluginContext } from "./context";

/**
 * Plugin saglik durumu.
 * Servisler bu veriyi health endpoint'lerine tasir.
 */
export interface PluginHealth {
  status: "healthy" | "degraded" | "unhealthy";
  message?: string;
  /** Son calisma zamani (ISO) */
  lastRunAt?: string;
  /** Son basarili calisma zamani (ISO) */
  lastSuccessAt?: string;
}

/**
 * Tum pluginlerin uygulamasi gereken yasam dongusu sozlesmesi.
 *
 * CQS: activate/deactivate komuttur (void/Promise<void>),
 * manifest/health sorgudur (veri dondurur).
 *
 * @typeParam C — PluginContext alt tipi. Integration servisi kendi context'ini,
 *               management servisi kendi context'ini gecirir.
 */
export interface IPlugin<C extends PluginContext = PluginContext> {
  /** Sorgu — plugin metadata'sini dondurur, yan etkisi yoktur. */
  manifest(): PluginManifest;

  /** Komut — plugin'i konfigürasyon ve servis baglamiyla baslatir. */
  activate(context: C): Promise<void>;

  /** Komut — plugin'i durdurur, kaynaklari birakir. */
  deactivate(): Promise<void>;

  /** Sorgu — anlik saglik durumunu dondurur. */
  health(): PluginHealth;
}
