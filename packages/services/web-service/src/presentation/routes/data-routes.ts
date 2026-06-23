import type { FastifyInstance } from "fastify";
import { TimescaleDBAdapter } from "@gd-monorepo/core";

export async function dataRoutes(
  fastify: FastifyInstance,
  options: { timescale: TimescaleDBAdapter },
) {
  const { timescale } = options;

  fastify.get("/devices", async (_request, reply) => {
    try {
      const devices = await timescale.listDevices();
      return reply.send({ devices });
    } catch (error) {
      console.error("[DataRoutes] listDevices hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/:deviceId/latest", async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      const { name, limit } = request.query as {
        name?: string;
        limit?: string;
      };

      const limitNum = limit ? parseInt(limit) : 1;
      const results = await timescale.getLatestN(
        deviceId,
        limitNum,
        name,
      );

      return reply.send({ telemetries: results });
    } catch (error) {
      console.error("[DataRoutes] latest hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/:deviceId/range", async (request, reply) => {
    try {
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
      const tagFilter = tags ? (JSON.parse(tags) as Record<string, string>) : undefined;

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
    } catch (error) {
      console.error("[DataRoutes] range hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/:deviceId/downsampled", async (request, reply) => {
    try {
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
      const tagFilter = tags ? (JSON.parse(tags) as Record<string, string>) : undefined;

      const results = await timescale.getDownsampledData({
        deviceId,
        names: nameFilter,
        tags: tagFilter,
        from: new Date(from),
        to: new Date(to),
        points: points ? parseInt(points) : 120,
      });

      return reply.send({ telemetries: results });
    } catch (error) {
      console.error("[DataRoutes] downsampled hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/:deviceId/aggregate", async (request, reply) => {
    try {
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
      const tagFilter = tags ? (JSON.parse(tags) as Record<string, string>) : undefined;

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
    } catch (error) {
      console.error("[DataRoutes] aggregate hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
