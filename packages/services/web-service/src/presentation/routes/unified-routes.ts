import type { FastifyInstance } from "fastify";
import { TimescaleDBAdapter } from "@gd-monorepo/core";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { DeviceRegistry } from "../../infrastructure/persistence/device-registry";
import {
  extractChargeStatus,
  deriveStatusEntries,
  applyRackOffset,
} from "../../application/telemetry/telemetry-normalizer";

export async function unifiedRoutes(
  fastify: FastifyInstance,
  options: {
    registry: DeviceRegistry;
    timescale: TimescaleDBAdapter;
  },
) {
  const { registry, timescale } = options;

  fastify.get("/racks/latest", async (_request, reply) => {
    try {
      await registry.refresh();

      const allTelemetries: TelemetryData[] = [];

      for (const device of registry.bsc()) {
        const results = await timescale.getLatestN(device.id, 2000);

        for (const t of results) {
          allTelemetries.push(applyRackOffset(t, device.rackOffset));
        }

        const statusEntries = deriveStatusEntries(results);
        for (const s of statusEntries) {
          allTelemetries.push(applyRackOffset(s, device.rackOffset));
        }
      }

      const chargeStatus = extractChargeStatus(allTelemetries);
      if (chargeStatus) {
        allTelemetries.push(chargeStatus);
      }

      return reply.send({ telemetries: allTelemetries });
    } catch (error) {
      console.error("[UnifiedRoutes] racks/latest hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/racks/downsampled", async (request, reply) => {
    try {
      await registry.refresh();

      const {
        from,
        to,
        points,
        names,
        rack_id,
      } = request.query as {
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

      const nameFilter = names ? names.split(",") : undefined;
      const targetPoints = points ? parseInt(points) : 120;

      const allTelemetries: TelemetryData[] = [];

      for (const device of registry.bsc()) {
        const results = await timescale.getDownsampledData({
          deviceId: device.id,
          names: nameFilter,
          from: new Date(from),
          to: new Date(to),
          points: targetPoints,
        });

        for (const t of results) {
          allTelemetries.push(applyRackOffset(t, device.rackOffset));
        }
      }

      return reply.send({ telemetries: allTelemetries });
    } catch (error) {
      console.error("[UnifiedRoutes] racks/downsampled hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/hvac/latest", async (_request, reply) => {
    try {
      await registry.refresh();

      const allTelemetries: TelemetryData[] = [];

      for (const device of registry.hvac()) {
        const results = await timescale.getLatestN(device.id, 100);
        allTelemetries.push(...results);
      }

      return reply.send({ telemetries: allTelemetries });
    } catch (error) {
      console.error("[UnifiedRoutes] hvac/latest hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
