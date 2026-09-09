import type { FastifyInstance } from "fastify";
import type { MarketSeries } from "../../infrastructure/market/market-series";
import { MARKET_SERIES } from "../../infrastructure/market/market-series";

interface MarketSeriesPointDto {
  timestamp: string;
  value: number;
  unit: string;
}

const toDto = (p: {
  timestamp: string;
  value: number;
  unit: string;
}): MarketSeriesPointDto => p;

/** Varsayılan pencere: gün öncesi PTF 48 saat (dün + bugünün açıklanmış saatleri). */
const DEFAULT_FROM_OFFSET_MS = 48 * 60 * 60 * 1000;

function rangeFromQuery(request: { query: Record<string, unknown> }): {
  from: string;
  to: string;
} {
  const fromRaw = request.query["from"] as string | undefined;
  const toRaw = request.query["to"] as string | undefined;
  const to = new Date(toRaw ?? Date.now());
  const from = new Date(fromRaw ?? to.getTime() - DEFAULT_FROM_OFFSET_MS);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Piyasa rotaları (BOSS-UYGULAMA-MIMARISI.md §7.3) — boss tier.
 * Kaynak: `external_series` (integration-service EPİAŞ plugin'i yazar).
 * Tüm cevaplar TR saatine çevrilmeden ISO-8601 UTC döner; UI "son veri
 * zamanı" etiketini `lastUpdatedAt` alanından üretir.
 */
export async function marketRoutes(
  fastify: FastifyInstance,
  deps: { market: MarketSeries },
): Promise<void> {
  fastify.get("/ptf", async (request, reply) => {
    const { from, to } = rangeFromQuery(
      request as { query: Record<string, unknown> },
    );
    const points = await deps.market.points(MARKET_SERIES.ptf, from, to);
    const last = points[points.length - 1];
    return reply.send({
      series: MARKET_SERIES.ptf,
      points: points.map(toDto),
      lastUpdatedAt: last?.timestamp ?? null,
    });
  });

  fastify.get("/gip-weighted-average", async (request, reply) => {
    const { from, to } = rangeFromQuery(
      request as { query: Record<string, unknown> },
    );
    const points = await deps.market.points(
      MARKET_SERIES.gipWeightedAverage,
      from,
      to,
    );
    const last = points[points.length - 1];
    return reply.send({
      series: MARKET_SERIES.gipWeightedAverage,
      points: points.map(toDto),
      lastUpdatedAt: last?.timestamp ?? null,
    });
  });

  fastify.get("/summary", async (_request, reply) => {
    const to = new Date();
    const from = new Date(to.getTime() - DEFAULT_FROM_OFFSET_MS);
    const ptfLatest = await deps.market.latest(MARKET_SERIES.ptf);
    const gipLatest = await deps.market.latest(MARKET_SERIES.gipWeightedAverage);
    const ptfDayAverage = await deps.market.average(
      MARKET_SERIES.ptf,
      from.toISOString(),
      to.toISOString(),
    );
    const lastUpdatedAt =
      [ptfLatest?.timestamp, gipLatest?.timestamp]
        .filter((t): t is string => t !== undefined)
        .sort()
        .pop() ?? null;
    return reply.send({
      ptf: ptfLatest ? toDto(ptfLatest) : null,
      gipWeightedAverage: gipLatest ? toDto(gipLatest) : null,
      ptfDayAverage: ptfDayAverage ?? null,
      lastUpdatedAt,
    });
  });
}
