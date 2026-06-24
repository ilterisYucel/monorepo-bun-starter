import type { FastifyInstance } from "fastify";
import { TimescaleDBAdapter } from "@gd-monorepo/core";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { DeviceRegistry } from "../../infrastructure/persistence/device-registry";

export async function unifiedRoutes(
  fastify: FastifyInstance,
  options: {
    registry: DeviceRegistry;
    timescale: TimescaleDBAdapter;
  },
) {
  const { registry, timescale } = options;

  fastify.get("/telemetry/latest", async (request, reply) => {
    try {
      await registry.refresh();

      const { deviceIds } = request.query as { deviceIds?: string };
      const ids = deviceIds ? deviceIds.split(",") : [];

      const targetDevices = registry.online().filter(
        (d) => ids.length === 0 || ids.includes(d.id),
      );

      const results = await Promise.all(
        targetDevices.map((d) => timescale.getLatestN(d.id, 2000)),
      );
      const allTelemetries = results.flat();

      return reply.send({ telemetries: allTelemetries });
    } catch (error) {
      console.error("[UnifiedRoutes] telemetry/latest hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/telemetry/downsampled", async (request, reply) => {
    try {
      await registry.refresh();

      const {
        deviceIds,
        from,
        to,
        points,
        names,
        rack_id,
      } = request.query as {
        deviceIds?: string;
        from?: string;
        to?: string;
        points?: string;
        names?: string;
        rack_id?: string;
      };

      if (!from || !to) {
        return reply
          .status(400)
          .send({ error: "from ve to parametreleri gerekli" });
      }

      const ids = deviceIds ? deviceIds.split(",") : [];
      const nameFilter = names ? names.split(",") : undefined;
      const targetPoints = points ? parseInt(points) : 120;

      const targetDevices2 = registry.online().filter(
        (d) => ids.length === 0 || ids.includes(d.id),
      );

      const tagFilter = rack_id ? { rack_id } : undefined;
      const results = await Promise.all(
        targetDevices2.map((d) =>
          timescale.getDownsampledData({
            deviceId: d.id,
            names: nameFilter,
            from: new Date(from),
            to: new Date(to),
            points: targetPoints,
            tags: tagFilter,
          }),
        ),
      );
      const allTelemetries = results.flat();

      return reply.send({ telemetries: allTelemetries });
    } catch (error) {
      console.error("[UnifiedRoutes] telemetry/downsampled hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
