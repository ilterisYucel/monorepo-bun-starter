import type { IPlugin, PluginContext } from "@gd-monorepo/plugin-sdk";

/**
 * Plugin'in declare ettigi zamanlama.
 * Loop plugin'de degil, servis core'unda (BullMQ repeatable job) calisir.
 */
export interface ScheduleSpec {
  mode: "cron" | "interval" | "manual";
  /** mode: "cron" icin cron pattern */
  cron?: string;
  /** mode: "interval" icin milisaniye */
  everyMs?: number;
  /** Ilk calisma zamani (ISO, opsiyonel) */
  startDate?: string;
}

/**
 * Istege bagli fetch penceresi — backfill / manuel tetik icin kullanilir.
 * Verilmezse plugin kendi cursor'una gore karar verir.
 */
export interface FetchWindow {
  /** Baslangic (ISO 8601, opsiyonel) */
  from?: string;
  /** Bitis (ISO 8601, opsiyonel) */
  to?: string;
}

/**
 * Dis kaynaklardan gelen normalize piyasa/dis verisi.
 * Cihaz telemetrisinden farklidir — deviceId yerine source/series tasir.
 */
export interface MarketDataPoint {
  /** Veri kaynagi: "epias", "hava-durumu" */
  source: string;
  /** Seri adi: "MCP", "SMF", "GDF" */
  series: string;
  /** Verinin ait oldugu zaman (ISO 8601) */
  timestamp: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

/**
 * Entegrasyon plugin sozlesmesi.
 *
 * Plugin zamanlamayi sahiplenmez — schedule() ile declare eder,
 * servis core'u BullMQ repeatable job'lari olusturur.
 * fetch() sorgudur: normalize MarketDataPoint listesi dondurur;
 * kaliciligi (TimescaleDB yazimi) servis core'u yapar.
 */
export interface IIntegrationPlugin<C extends PluginContext = PluginContext>
  extends IPlugin<C>
{
  /** Sorgu — zamanlama ozelliklerini dondurur. */
  schedule(): ScheduleSpec;

  /** Sorgu — dis kaynaktan veri toplar, normalize edilmis noktalari dondurur. */
  fetch(context: C, window?: FetchWindow): Promise<MarketDataPoint[]>;
}
