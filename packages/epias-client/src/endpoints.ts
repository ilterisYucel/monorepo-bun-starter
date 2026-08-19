/**
 * EPIAS electricity-service endpoint yollari (ilk faz veri seti).
 * Sabitler EPIAS teknik dokumanindan teyit edilmistir — tek yerde tutulur,
 * EPIAS yol degistirirse yalnizca bu dosya guncellenir.
 */
export const EPIAS_ENDPOINTS = {
  /** Saatlik piyasa takas fiyati (PTF/MCP) — TL + EUR + USD. */
  mcp: "/v1/markets/dam/data/mcp",
  /** Kesinlesmemis PTF (K.PTF). */
  interimMcp: "/v1/markets/dam/data/interim-mcp",
  /** K.PTF yayin durumu. */
  interimMcpStatus: "/v1/markets/dam/data/interim-mcp-published-status",
  /** GIP agirlikli ortalama fiyat (saatlik). */
  gipWeightedAverage: "/v1/markets/idm/data/weighted-average-price",
  /** GIP min-maks eslesme fiyati. */
  gipMinMaxMatching: "/v1/markets/idm/data/min-max-matching-price",
  /** GIP min-maks alis teklif fiyati. */
  gipMinMaxBid: "/v1/markets/idm/data/min-max-bid-price",
  /** GIP min-maks satis teklif fiyati. */
  gipMinMaxOffer: "/v1/markets/idm/data/min-max-sales-offer-price",
  /** Sistem marjinal fiyati (SMF) — DGP. */
  systemMarginalPrice: "/v1/markets/bpm/data/system-marginal-price",
  /** Yuk atma (YAT) talimat miktarlari. */
  orderSummaryDown: "/v1/markets/bpm/data/order-summary-down",
  /** Yuk alma (YAL) talimat miktarlari. */
  orderSummaryUp: "/v1/markets/bpm/data/order-summary-up",
  /** Dengesizlik tutari. */
  imbalanceAmount: "/v1/markets/imbalance/data/imbalance-amount",
  /** Dengesizlik maliyeti. */
  imbalanceCost: "/v1/renewables/data/imbalance-cost",
  /** Azami uzlastirma fiyati (AUF). */
  maximumSettlementPrice: "/v1/markets/data/maximum-settlement-price",
  /** VEP kontrat fiyatlari ozeti. */
  vepContractPriceSummary: "/v1/markets/pfm/data/contract-price-summary",
  /** VEP gunluk gosterge fiyati (GGF). */
  vepGgf: "/v1/markets/pfm/data/ggf",
  /** Gercek zamanli tuketim. */
  realtimeConsumption: "/v1/consumption/data/realtime-consumption",
  /** Talep tahmini (2018-2027, TEAIS). */
  demandForecast: "/v1/consumption/data/demand-forecast",
  /** Planli kesinti bilgileri. */
  plannedPowerOutage: "/v1/consumption/data/planned-power-outage-info",
  /** Plansiz kesinti bilgileri. */
  unplannedPowerOutage: "/v1/consumption/data/unplanned-power-outage-info",
  /** Gercek zamanli uretim. */
  realtimeGeneration: "/v1/generation/data/realtime-generation",
  /** Uretim tahmini (YEKDEM). */
  generationForecast: "/v1/renewables/data/generation-forecast",
  /** Kesinlesmis gunluk uretim plani (KGUP). */
  dpp: "/v1/generation/data/dpp",
  /** Emre amade kapasite (EAK). */
  aic: "/v1/generation/data/aic",
  /** Dashboard: DGP ozeti. */
  dashboardBalancing: "/v1/dashboard/balancing-power-market",
  /** Dashboard: GOP ozeti. */
  dashboardDayAhead: "/v1/dashboard/day-ahead-market",
  /** Dashboard: GIP ozeti. */
  dashboardIntraDay: "/v1/dashboard/intra-day-market",
  /** Dashboard: agirlikli ortalama fiyat. */
  dashboardWeightedAverage: "/v1/dashboard/weighted-average-price",
  /** Dashboard: gercek zamanli tuketim. */
  dashboardRealtimeConsumption: "/v1/dashboard/realtime-consumption",
  /** Dashboard: gercek zamanli uretim. */
  dashboardRealtimeGeneration: "/v1/dashboard/realtime-generation",
  /** Dashboard: piyasa mesajlari. */
  dashboardMarketMessages: "/v1/dashboard/market-message-system",
  /** Dashboard: spot gaz. */
  dashboardSpotGas: "/v1/dashboard/spot-gas-market",
} as const;

export type EpiasEndpoint = (typeof EPIAS_ENDPOINTS)[keyof typeof EPIAS_ENDPOINTS];
