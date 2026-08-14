import type { PluginContext } from "@gd-monorepo/plugin-sdk";
import type {
  FetchWindow,
  IIntegrationPlugin,
  MarketDataPoint,
  ScheduleSpec,
} from "@gd-monorepo/shared-types";
import type { HttpGateway } from "./http-gateway";

/**
 * EPIAS uc noktasi icin seri esleme tanimi (config dosyasindan gelir).
 * EPIAS dokuman incelemesi tamamlanana kadar endpoint yollari
 * config'den yonetilir — dokumanla birlikte varsayilanlar guncellenecek.
 */
interface SeriesMapping {
  name: string;
  path: string;
  unit: string;
  dateField: string;
  valueField: string;
}

interface EpiasPluginConfig {
  clientId: string;
  baseUrl: string;
  intervalMs?: number;
  series: SeriesMapping[];
}

interface EpiasResponseRow {
  [field: string]: string | number;
}

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const FIRST_RUN_WINDOW_MS = 24 * 60 * 60 * 1000;
const CURSOR_KEY = "lastFetchTo";

/**
 * EPIAS piyasa fiyatlari plugin'i.
 *
 * Config: `<configDir>/epias-market-prices.json`
 * ```json
 * {
 *   "clientId": "...",
 *   "baseUrl": "https://seffaflik.epias.com.tr/electricity-service/v1",
 *   "intervalMs": 3600000,
 *   "series": [
 *     { "name": "MCP", "path": "/markets/dam/data/mcp", "unit": "TRY/MWh", "dateField": "date", "valueField": "price" }
 *   ]
 * }
 * ```
 */
export class EpiasMarketPricesPlugin implements IIntegrationPlugin {
  private config: EpiasPluginConfig | undefined;
  private lastSuccessAt: string | undefined;

  constructor(private readonly gateway: HttpGateway) {}

  manifest() {
    return {
      name: "epias-market-prices",
      version: "1.0.0",
      kind: "integration" as const,
      sdkVersion: ">=1.0.0 <2.0.0",
      description: "EPIAS piyasa fiyatlari (MCP/SMF) toplar",
    };
  }

  async activate(context: PluginContext): Promise<void> {
    const config = this.parseConfig(context.config);
    this.config = config;
    context.logger.info(
      `aktive edildi — ${config.series.map((s) => s.name).join(", ")} (${config.baseUrl})`,
    );
  }

  async deactivate(): Promise<void> {
    this.config = undefined;
  }

  health() {
    if (!this.config) {
      return { status: "degraded" as const, message: "Henuz aktive edilmedi" };
    }
    return {
      status: "healthy" as const,
      lastSuccessAt: this.lastSuccessAt,
    };
  }

  schedule(): ScheduleSpec {
    return { mode: "interval", everyMs: this.config?.intervalMs ?? DEFAULT_INTERVAL_MS };
  }

  async fetch(
    context: PluginContext,
    window?: FetchWindow,
  ): Promise<MarketDataPoint[]> {
    if (!this.config) {
      throw new Error(
        "[EpiasMarketPricesPlugin] fetch, activate'ten once cagrilamaz",
      );
    }

    const lastTo = (await context.state.read(CURSOR_KEY)) as string | undefined;
    const to = window?.to ?? new Date().toISOString();
    const from =
      window?.from ??
      lastTo ??
      new Date(Date.now() - FIRST_RUN_WINDOW_MS).toISOString();

    const headers = { "X-IBM-Client-Id": this.config.clientId };
    const rows = await Promise.all(
      this.config.series.map(async (series) => {
        const url = `${this.config!.baseUrl}${series.path}?startDate=${encodeURIComponent(from)}&endDate=${encodeURIComponent(to)}`;
        const payload = await this.gateway.getJson<EpiasResponseRow[]>(url, headers);
        return { series, payload };
      }),
    );

    const points: MarketDataPoint[] = [];
    for (const { series, payload } of rows) {
      for (const row of payload) {
        const point = this.toPoint(series, row);
        if (point) {
          points.push(point);
        }
      }
    }

    // ELEGANT-EXCEPTION: fetch bir sorgudur ancak cursor guncellemesi
    // toplama isleminin ayrilmaz parcasi — aksi halde ayni pencere surekli tekrar cekilir.
    await context.state.write(CURSOR_KEY, to);
    this.lastSuccessAt = new Date().toISOString();

    context.logger.info(`${points.length} nokta toplandi (${from} → ${to})`);
    return points;
  }

  private parseConfig(raw: Record<string, unknown>): EpiasPluginConfig {
    const clientId = raw["clientId"];
    if (typeof clientId !== "string" || clientId.length === 0) {
      throw new Error(
        "[EpiasMarketPricesPlugin] Konfigurasyonda gecerli 'clientId' bulunamadi",
      );
    }
    const baseUrl = raw["baseUrl"];
    if (typeof baseUrl !== "string" || baseUrl.length === 0) {
      throw new Error(
        "[EpiasMarketPricesPlugin] Konfigurasyonda gecerli 'baseUrl' bulunamadi",
      );
    }
    const series = raw["series"];
    if (!Array.isArray(series) || series.length === 0) {
      throw new Error(
        "[EpiasMarketPricesPlugin] Konfigurasyonda bos olmayan 'series' listesi gerekli",
      );
    }
    const mappings = series.map((s, index) => this.parseSeries(s, index));

    const intervalMs = raw["intervalMs"];
    return {
      clientId,
      baseUrl,
      intervalMs:
        typeof intervalMs === "number" && intervalMs > 0
          ? intervalMs
          : DEFAULT_INTERVAL_MS,
      series: mappings,
    };
  }

  private parseSeries(raw: unknown, index: number): SeriesMapping {
    if (typeof raw !== "object" || raw === null) {
      throw new Error(
        `[EpiasMarketPricesPlugin] series[${index}] obje olmali`,
      );
    }
    const record = raw as Record<string, unknown>;
    const name = record["name"];
    const path = record["path"];
    const dateField = record["dateField"];
    const valueField = record["valueField"];
    const unit = record["unit"];
    if (
      typeof name !== "string" ||
      typeof path !== "string" ||
      typeof dateField !== "string" ||
      typeof valueField !== "string" ||
      typeof unit !== "string"
    ) {
      throw new Error(
        `[EpiasMarketPricesPlugin] series[${index}] name/path/dateField/valueField/unit (string) gerekli`,
      );
    }
    return { name, path, unit, dateField, valueField };
  }

  private toPoint(
    series: SeriesMapping,
    row: EpiasResponseRow,
  ): MarketDataPoint | undefined {
    const rawDate = row[series.dateField];
    const rawValue = row[series.valueField];
    if (rawDate === undefined || rawValue === undefined) {
      return undefined;
    }

    const timestamp = new Date(String(rawDate));
    if (Number.isNaN(timestamp.getTime())) {
      return undefined;
    }
    const value = Number(rawValue);
    if (Number.isNaN(value)) {
      return undefined;
    }

    return {
      source: "epias",
      series: series.name,
      timestamp: timestamp.toISOString(),
      value,
      unit: series.unit,
    };
  }
}
