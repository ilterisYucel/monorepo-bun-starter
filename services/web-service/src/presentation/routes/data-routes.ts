import type { FastifyInstance } from "fastify";
import type { ITimeseriesDatabase } from "@gd-monorepo/core";
import { ValidationError } from "@gd-monorepo/result";

export async function dataRoutes(
  fastify: FastifyInstance,
  options: { timescale: ITimeseriesDatabase },
) {
  const { timescale } = options;

  fastify.get("/devices", async (_request, reply) => {
    const devices = await timescale.listDevices();
    return reply.send({ devices });
  });

  fastify.get("/:deviceId/latest", async (request, reply) => {
    const { deviceId } = request.params as { deviceId: string };
    const { name, limit } = request.query as {
      name?: string;
      limit?: string;
    };

    const limitNum = limit ? parseInt(limit) : 1;
    const results = await timescale.getLatestN(
      deviceId,
      limitNum,
      name ? [name] : undefined,
    );

    return reply.send({ telemetries: results });
  });

  fastify.get("/:deviceId/range", async (request, reply) => {
    const { deviceId } = request.params as { deviceId: string };
    const { from, to, names, tags, limit } = request.query as {
      from?: string;
      to?: string;
      names?: string;
      tags?: string;
      limit?: string;
    };

    if (!from || !to) {
      return reply
        .status(400)
        .send({ error: "from ve to parametreleri gerekli" });
    }

    const nameFilter = names ? names.split(",") : undefined;
    const tagFilter = parseTags(tags);

    const results = await timescale.query({
      deviceId,
      names: nameFilter,
      tags: tagFilter,
      from: new Date(from),
      to: new Date(to),
      limit: limit ? parseInt(limit) : undefined,
      order: "DESC",
    });

    return reply.send({ telemetries: results });
  });

  fastify.get("/:deviceId/downsampled", async (request, reply) => {
    const { deviceId } = request.params as { deviceId: string };
    const { from, to, points, names, tags } = request.query as {
      from?: string;
      to?: string;
      points?: string;
      names?: string;
      tags?: string;
    };

    if (!from || !to) {
      return reply
        .status(400)
        .send({ error: "from ve to parametreleri gerekli" });
    }

    const nameFilter = names ? names.split(",") : undefined;
    const tagFilter = parseTags(tags);

    const results = await timescale.getDownsampledData({
      deviceId,
      names: nameFilter,
      tags: tagFilter,
      from: new Date(from),
      to: new Date(to),
      points: points ? parseInt(points) : 120,
    });

    return reply.send({ telemetries: results });
  });

  fastify.get("/:deviceId/aggregate", async (request, reply) => {
    const { deviceId } = request.params as { deviceId: string };
    const { from, to, fn, interval, names, tags } = request.query as {
      from?: string;
      to?: string;
      fn?: string;
      interval?: string;
      names?: string;
      tags?: string;
    };

    if (!from || !to || !fn || !interval) {
      return reply
        .status(400)
        .send({ error: "from, to, fn, interval parametreleri gerekli" });
    }

    const validFn = fn.toUpperCase();
    if (!["AVG", "MAX", "MIN", "SUM", "COUNT"].includes(validFn)) {
      return reply
        .status(400)
        .send({ error: "Gecersiz aggregate fonksiyonu" });
    }

    const nameFilter = names ? names.split(",") : undefined;
    const tagFilter = parseTags(tags);

    const results = await timescale.aggregate({
      deviceId,
      names: nameFilter,
      tags: tagFilter,
      from: new Date(from),
      to: new Date(to),
      aggregateFn: validFn as "AVG" | "MAX" | "MIN" | "SUM" | "COUNT",
      interval,
    });

    return reply.send({ buckets: results });
  });
}

/** tags sorgu parametresini güvenli ayrıştırır — beklenen hata ValidationError. */
function parseTags(tags?: string): Record<string, string> | undefined {
  if (tags === undefined) return undefined;
  try {
    return JSON.parse(tags) as Record<string, string>;
  } catch {
    throw new ValidationError(
      "invalid_tags",
      "tags parametresi geçerli JSON olmalı",
    );
  }
}
