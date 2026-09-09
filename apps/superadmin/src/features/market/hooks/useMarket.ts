import { useQuery } from "@tanstack/react-query";
import { marketApi } from "../services/marketApi";

export const MARKET_QUERY_KEY = ["market"] as const;

const REFETCH_INTERVAL_MS = 60_000;

/** Piyasa serileri + özet (sorgu — 1 dk tazeleme). */
export const useMarket = () =>
  useQuery({
    queryKey: MARKET_QUERY_KEY,
    queryFn: async () => {
      const [ptf, gipWeightedAverage, summary] = await Promise.all([
        marketApi.ptf(),
        marketApi.gipWeightedAverage(),
        marketApi.summary(),
      ]);
      return { ptf, gipWeightedAverage, summary };
    },
    refetchInterval: REFETCH_INTERVAL_MS,
    retry: 1,
  });
