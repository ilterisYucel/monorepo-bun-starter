/** Boss piyasa veri sözleşmesi — backend `/api/market/*` DTO'ları. */
export interface MarketSeriesPoint {
  timestamp: string;
  value: number;
  unit: string;
}

export interface MarketSeriesResponse {
  series: { source: string; series: string };
  points: MarketSeriesPoint[];
  lastUpdatedAt: string | null;
}

export interface MarketSummaryResponse {
  ptf: MarketSeriesPoint | null;
  gipWeightedAverage: MarketSeriesPoint | null;
  ptfDayAverage: number | null;
  lastUpdatedAt: string | null;
}
