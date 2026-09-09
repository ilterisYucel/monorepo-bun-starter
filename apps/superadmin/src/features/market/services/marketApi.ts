import { apiClient } from "../../../lib/api-client";
import type { MarketSeriesResponse, MarketSummaryResponse } from "./types";

/**
 * MarketApi — boss piyasa ekranının veri kaynağı (`/api/market/*`, Faz 2).
 */
export const marketApi = {
  ptf(): Promise<MarketSeriesResponse> {
    return apiClient
      .get<MarketSeriesResponse>("/market/ptf")
      .then((r) => r.data);
  },

  gipWeightedAverage(): Promise<MarketSeriesResponse> {
    return apiClient
      .get<MarketSeriesResponse>("/market/gip-weighted-average")
      .then((r) => r.data);
  },

  summary(): Promise<MarketSummaryResponse> {
    return apiClient
      .get<MarketSummaryResponse>("/market/summary")
      .then((r) => r.data);
  },
};
