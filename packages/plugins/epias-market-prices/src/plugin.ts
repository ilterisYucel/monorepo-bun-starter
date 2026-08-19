import type { PluginContext } from "@gd-monorepo/plugin-sdk";
import { EpiasClient, toEpiasIso } from "@gd-monorepo/epias-client";
import type { EpiasTicketStore } from "@gd-monorepo/epias-client";
import type {
  FetchWindow,
  IIntegrationPlugin,
  MarketDataPoint,
  ScheduleSpec,
} from "@gd-monorepo/shared-types";

/**
 * EPIAS uc noktasi icin seri esleme tanimi (config dosyasindan gelir).
 * Yollar EPIAS teknik dokumanindan teyit edilmistir; ornek config'de
 * guncel yollar bulunur (bkz. config/plugins/epias-market-prices.example.json).
 */
interface SeriesMapping {
  name: string;
  path: string;
  unit: string;
  dateField: string;
  valueField: string;
}

interface EpiasPluginConfig {
  username: string;
  password: string;
  casUrl: string;
  baseUrl: string;
  intervalMs?: number;
  series: SeriesMapping[];
}

interface EpiasResponseRow {
  [field: string]: string | number;
}

interface EpiasResponseEnvelope {
  items?: EpiasResponseRow[];
}

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;
const FIRST_RUN_WINDOW_MS = 24 * 60 * 60 * 1000;
const CURSOR_KEY = "lastFetchTo";

/**
 * EPIAS piyasa fiyatlari plugin'i.
 *
 * Auth tamamen {@link EpiasClient} icindedir: config'deki kullanici
 * adi/parola ile CAS uzerinden TGT otomatik alinir, onbelleklenir ve
 * suresi dolunca yenilenir — manuel bilet adimi yoktur.
 *
 * TGT onbellegi ({@link EpiasTicketStore}) servis tarafindan olusturulup
 * kurucuya enjekte edilir; tum EPIAS plugin'leri ayni onbellegi paylasir
 * (throttle korumasi).
 *
 * Config: `<configDir>/epias-market-prices.json`
 * ```json
 * {
 *   "username": "kullanici@firma.com.tr",
 *   "password": "...",
 *   "casUrl": "https://giris.epias.com.tr/cas/v1/tickets",
 *   "baseUrl": "https://seffaflik.epias.com.tr/electricity-service/v1",
 *   "intervalMs": 3600000,
 *   "series": [
 *     { "name": "PTF", "path": "/v1/markets/dam/data/mcp", "unit": "TRY/MWh", "dateField": "date", "valueField": "price" }
 *   ]
 * }
 * ```
 */
export class EpiasMarketPricesPlugin implements IIntegrationPlugin {
  private config: EpiasPluginConfig | undefined;
  private client: EpiasClient | undefined;
  private lastSuccessAt: string | undefined;

  constructor(private readonly ticketStore: EpiasTicketStore) {}

  manifest() {
    return {
      name: "epias-market-prices",
      version: "1.0.0",
      kind: "integration" as const,
      sdkVersion: ">=1.0.0 <2.0.0",
      description: "EPIAS piyasa fiyatlari (PTF/SMF) toplar",
    };
  }

  async activate(context: PluginContext): Promise<void> {
    const config = this.parseConfig(context.config);
    this.config = config;
    this.client = new EpiasClient({
      username: config.username,
      password: config.password,
      casUrl: config.casUrl,
      baseUrl: config.baseUrl,
      ticketStore: this.ticketStore,
    });
    context.logger.info(
      `aktive edildi — ${config.series.map((s) => s.name).join(", ")} (${config.baseUrl})`,
    );
  }

  async deactivate(): Promise<void> {
    this.config = undefined;
    this.client = undefined;
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
    if (!this.config || !this.client) {
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

    const startDate = toEpiasIso(new Date(from));
    const endDate = toEpiasIso(new Date(to));

    const rows = await Promise.all(
      this.config.series.map(async (series) => {
        const payload = await this.client!.fetchJson<EpiasResponseEnvelope | EpiasResponseRow[]>(
          series.path,
          { startDate, endDate },
        );
        const items = Array.isArray(payload) ? payload : (payload.items ?? []);
        return { series, items };
      }),
    );

    const points: MarketDataPoint[] = [];
    for (const { series, items } of rows) {
      for (const row of items) {
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
    const username = raw["username"];
    if (typeof username !== "string" || username.length === 0) {
      throw new Error(
        "[EpiasMarketPricesPlugin] Konfigurasyonda gecerli 'username' bulunamadi",
      );
    }
    const password = raw["password"];
    if (typeof password !== "string" || password.length === 0) {
      throw new Error(
        "[EpiasMarketPricesPlugin] Konfigurasyonda gecerli 'password' bulunamadi",
      );
    }
    const casUrl = raw["casUrl"];
    if (typeof casUrl !== "string" || casUrl.length === 0) {
      throw new Error(
        "[EpiasMarketPricesPlugin] Konfigurasyonda gecerli 'casUrl' bulunamadi",
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
      username,
      password,
      casUrl,
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
