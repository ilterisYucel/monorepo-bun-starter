import { apiClient } from "../../lib/api-client";

/** Dış seri noktası (`external_series`). */
export interface MarketPoint {
  timestamp: string;
  value: number;
  unit: string;
}

/**
 * Grid & Market istemcisi (SPEC UC-9/T-24, K9): eklemeli
 * `GET /api/unified/timeseries/external` ucunu tüketir (source/series
 * parametreli). Kimlik/seri yoksa boş döner — uydurma veri YOK.
 */
export const demoMarketApi = {
  external: async (
    source: string,
    series: string,
    opts: { from?: string; to?: string; limit?: number } = {},
    signal?: AbortSignal,
  ): Promise<MarketPoint[]> => {
    const { data } = await apiClient.get<{ points: MarketPoint[] }>(
      "/unified/timeseries/external",
      { params: { source, series, ...opts }, signal },
    );
    return data.points ?? [];
  },
};
