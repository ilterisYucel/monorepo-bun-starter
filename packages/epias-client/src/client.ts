import { HttpClient, HttpError } from "@gd-monorepo/plugin-sdk";
import type { HttpClientConfig } from "@gd-monorepo/plugin-sdk";
import { toEpiasIso } from "./date";
import { EPIAS_ENDPOINTS } from "./endpoints";
import type { EpiasTicketStore } from "./ticket-store";

/**
 * EPIAS electricity-service istemcisi.
 *
 * Generic {@link HttpClient} uzerine EPIAS'a ozgu katman:
 * - CAS TGT alinir (paylasilan {@link EpiasTicketStore} uzerinden) ve her
 *   istege `TGT` header'i olarak eklenir; 401 alinirsa bilet gecersiz
 *   kilinip bir kez daha denenir.
 * - Tarihler EPIAS formatina (+03:00) cevrilir.
 * - Tipli yardimci metotlar ilk faz veri setini karsilar; diger servisler
 *   icin genel {@link fetchJson}/{@link getJson} kullanilir.
 */
export interface EpiasClientConfig {
  username: string;
  password: string;
  casUrl: string;
  baseUrl: string;
  /** Servis genelinde paylasilan TGT onbellegi (throttle korumasi icin). */
  ticketStore: EpiasTicketStore;
  timeoutMs?: number;
  maxRetries?: number;
}

/** EPIAS listeleme cevaplarinin ortak zarfi. */
export interface EpiasEnvelope<T> {
  items?: T[];
  page?: unknown;
  statistic?: unknown;
  statistics?: unknown;
}

/** PTF satiri — PtfResponseDataDto'dan teyit edilmistir. */
export interface PtfRow {
  date: string;
  hour: string;
  price?: number;
  priceUsd?: number;
  priceEur?: number;
}

/** K.PTF satiri — InterimMcpResponseDataDto'dan teyit edilmistir. */
export interface InterimMcpRow {
  date: string;
  hour: string;
  marketTradePrice?: number;
}

/** GIP agirlikli ortalama fiyat satiri — WeightedAveragePriceDataDto'dan. */
export interface GipWapRow {
  date: string;
  hour: string;
  wap?: number;
}

/** GIP min-maks eslesme fiyati satiri — MinMaxMatchingPriceDataDto'dan. */
export interface MinMaxMatchingRow {
  contractType?: string;
  contractName?: string;
  minMatchingPrice?: number;
  maxMatchingPrice?: number;
}

/** SMF satiri — SystemMarginalPriceDataDto'dan teyit edilmistir. */
export interface SmfRow {
  date: string;
  hour: string;
  systemMarginalPrice?: number;
}

/** Dengesizlik tutari satiri — ImbalanceAmountDataDto'dan teyit edilmistir. */
export interface ImbalanceAmountRow {
  date: string;
  hour: string;
  positiveImbalance?: number;
  negativeImbalance?: number;
}

/** Gercek zamanli tuketim satiri — RealTimeConsumptionDataDto'dan. */
export interface RealtimeConsumptionRow {
  date: string;
  time: string;
  consumption?: number;
}

/** Kesinti satiri — PowerOutageResponseDataDto'dan teyit edilmistir. */
export interface PowerOutageRow {
  id?: number;
  province?: string;
  district?: string;
  date?: string;
  distributionCompanyName?: string;
  startTime?: string;
  endTime?: string;
  reason?: string;
  effectedNeighbourhoods?: string;
  effectedSubscribers?: number;
  hourlyLoadAvg?: number;
}

export class EpiasClient {
  private readonly http: HttpClient;

  constructor(
    private readonly config: EpiasClientConfig,
    http?: HttpClient,
  ) {
    const httpConfig: HttpClientConfig = {
      baseUrl: config.baseUrl,
      timeoutMs: config.timeoutMs,
      maxRetries: config.maxRetries,
    };
    this.http = http ?? new HttpClient(httpConfig);
  }

  /** Sorgu — EPIAS servisine GET istegi (TGT otomatik eklenir). */
  getJson<T>(path: string): Promise<T> {
    return this.run((tgt) => this.http.getJson<T>(path, { TGT: tgt }));
  }

  /** Sorgu — EPIAS servisine JSON govdeli POST istegi (TGT otomatik eklenir). */
  fetchJson<T>(path: string, body?: unknown): Promise<T> {
    return this.run((tgt) => this.http.postJson<T>(path, body, { TGT: tgt }));
  }

  /** Sorgu — saatlik PTF (TL/MWh + EUR + USD). */
  async ptf(from: Date, to: Date): Promise<PtfRow[]> {
    const response = await this.fetchJson<EpiasEnvelope<PtfRow>>(
      EPIAS_ENDPOINTS.mcp,
      { startDate: toEpiasIso(from), endDate: toEpiasIso(to) },
    );
    return response.items ?? [];
  }

  /** Sorgu — kesinlesmemis PTF (K.PTF), tarih icin. */
  async interimMcp(from: Date, to: Date): Promise<InterimMcpRow[]> {
    const response = await this.fetchJson<EpiasEnvelope<InterimMcpRow>>(
      EPIAS_ENDPOINTS.interimMcp,
      { startDate: toEpiasIso(from), endDate: toEpiasIso(to) },
    );
    return response.items ?? [];
  }

  /** Sorgu — GIP saatlik agirlikli ortalama fiyat. */
  async gipWeightedAverage(from: Date, to: Date): Promise<GipWapRow[]> {
    const response = await this.fetchJson<EpiasEnvelope<GipWapRow>>(
      EPIAS_ENDPOINTS.gipWeightedAverage,
      { startDate: toEpiasIso(from), endDate: toEpiasIso(to) },
    );
    return response.items ?? [];
  }

  /** Sorgu — GIP min-maks eslesme fiyatlari. */
  async gipMinMaxMatching(from: Date, to: Date): Promise<MinMaxMatchingRow[]> {
    const response = await this.fetchJson<EpiasEnvelope<MinMaxMatchingRow>>(
      EPIAS_ENDPOINTS.gipMinMaxMatching,
      { startDate: toEpiasIso(from), endDate: toEpiasIso(to) },
    );
    return response.items ?? [];
  }

  /** Sorgu — sistem marjinal fiyati (SMF); istege bagli bolge filtresi. */
  async systemMarginalPrice(
    from: Date,
    to: Date,
    region?: string,
  ): Promise<SmfRow[]> {
    const response = await this.fetchJson<EpiasEnvelope<SmfRow>>(
      EPIAS_ENDPOINTS.systemMarginalPrice,
      {
        startDate: toEpiasIso(from),
        endDate: toEpiasIso(to),
        ...(region ? { region } : {}),
      },
    );
    return response.items ?? [];
  }

  /** Sorgu — dengesizlik tutarlari; istege bagli bolge filtresi. */
  async imbalanceAmount(
    from: Date,
    to: Date,
    region?: string,
  ): Promise<ImbalanceAmountRow[]> {
    const response = await this.fetchJson<EpiasEnvelope<ImbalanceAmountRow>>(
      EPIAS_ENDPOINTS.imbalanceAmount,
      {
        startDate: toEpiasIso(from),
        endDate: toEpiasIso(to),
        ...(region ? { region } : {}),
      },
    );
    return response.items ?? [];
  }

  /** Sorgu — gercek zamanli tuketim. */
  async realtimeConsumption(
    from: Date,
    to: Date,
  ): Promise<RealtimeConsumptionRow[]> {
    const response = await this.fetchJson<
      EpiasEnvelope<RealtimeConsumptionRow>
    >(EPIAS_ENDPOINTS.realtimeConsumption, {
      startDate: toEpiasIso(from),
      endDate: toEpiasIso(to),
    });
    return response.items ?? [];
  }

  /** Sorgu — planli kesintiler (tarih + istege bagli dagitim/il filtreleri). */
  async plannedOutages(
    period: Date,
    filters?: { distributionCompanyId?: number; provinceId?: number },
  ): Promise<PowerOutageRow[]> {
    const response = await this.fetchJson<EpiasEnvelope<PowerOutageRow>>(
      EPIAS_ENDPOINTS.plannedPowerOutage,
      { period: toEpiasIso(period), ...filters },
    );
    return response.items ?? [];
  }

  /** Sorgu — plansiz kesintiler (tarih + istege bagli dagitim/il filtreleri). */
  async unplannedOutages(
    period: Date,
    filters?: { distributionCompanyId?: number; provinceId?: number },
  ): Promise<PowerOutageRow[]> {
    const response = await this.fetchJson<EpiasEnvelope<PowerOutageRow>>(
      EPIAS_ENDPOINTS.unplannedPowerOutage,
      { period: toEpiasIso(period), ...filters },
    );
    return response.items ?? [];
  }

  /**
   * Sorgu — istegi gecerli TGT ile calistirir.
   * 401 alinirsa (su resi dolmus/iptal edilmis bilet) bilet gecersiz
   * kilinip bir kez daha denenir.
   */
  private async run<T>(send: (tgt: string) => Promise<T>): Promise<T> {
    try {
      return await send(await this.ticket());
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        await this.config.ticketStore.invalidate(this.config.username);
        return send(await this.ticket());
      }
      throw error;
    }
  }

  private ticket(): Promise<string> {
    return this.config.ticketStore.ticket(
      this.config.username,
      this.config.password,
    );
  }
}
