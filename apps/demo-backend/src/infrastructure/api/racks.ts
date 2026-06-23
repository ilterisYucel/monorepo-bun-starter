// apps/demo-backend/src/infrastructure/api/routes/racks.ts

import type { FastifyInstance } from "fastify";
import { TimescaleDBAdapter } from "@gd-monorepo/core";
import { PowerCommandHandler } from "../../application/power-command-handler";
import type { TelemetryData } from "@gd-monorepo/shared-types";

export async function racksRoutes(
  fastify: FastifyInstance,
  options: {
    timescale: TimescaleDBAdapter;
    powerHandler: PowerCommandHandler;
    deviceId: string;
  },
) {
  const { timescale, powerHandler, deviceId } = options;

  // GET /api/racks/latest - Simülatörden en son anlık görüntü

  fastify.get("/latest", async (_request, reply) => {
    try {
      // Tek sorguda tüm rack'lerin son verilerini al
      const results = await timescale.query({
        deviceId: "xrack-simulator",
        from: new Date(Date.now() - 60000),
        to: new Date(),
        order: "DESC",
        limit: 2000,
      });

      // Her rack için en son değerleri bul
      const latestMap = new Map<string, Map<string, TelemetryData>>();

      for (const result of results) {
        const rackId = result.tags?.rack_id || "1";
        const name = result.name;

        if (!latestMap.has(rackId)) {
          latestMap.set(rackId, new Map());
        }
        const rackMap = latestMap.get(rackId)!;
        if (!rackMap.has(name)) {
          rackMap.set(name, result);
        }
      }

      // Telemetries listesine çevir
      const telemetries: TelemetryData[] = [];
      for (const rackMap of latestMap.values()) {
        for (const telemetry of rackMap.values()) {
          telemetries.push(telemetry);
        }
      }

      return reply.send({ telemetries });
    } catch (error) {
      console.error("[API] Failed to get latest:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // GET /api/racks/history - Tarihsel veri (TimescaleDB'den)
  fastify.get("/history", async (request, reply) => {
    const { limit, hours, from, to, rack_id, telemetry } = request.query as {
      limit?: string;
      hours?: string;
      from?: string;
      to?: string;
      rack_id?: string;
      telemetry?: string;
    };

    const limitNum = limit ? parseInt(limit) : undefined;

    // Zaman aralığını belirle
    let fromDate: Date;
    let toDate: Date = new Date();

    if (from && to) {
      // İki zaman aralığı verilmişse
      fromDate = new Date(from);
      toDate = new Date(to);
    } else if (hours) {
      // Sadece saat verilmişse (son X saat)
      const hoursNum = parseInt(hours);
      fromDate = new Date(Date.now() - hoursNum * 60 * 60 * 1000);
    } else {
      // Default: son 24 saat
      fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    }

    // Filtreler
    const names = telemetry ? [telemetry] : undefined;
    const tags = rack_id ? { rack_id } : undefined;

    try {
      const history = await timescale.query({
        deviceId,
        names,
        tags,
        from: fromDate,
        to: toDate,
        limit: limitNum,
        order: "DESC",
      });

      return reply.send({ history });
    } catch (error) {
      console.error("[API] Failed to get history:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // apps/demo-backend/src/infrastructure/api/routes/racks.ts

  fastify.get("/history/downsampled", async (request, reply) => {
    const {
      range,
      from,
      to,
      points,
      rack_id,
      telemetry,
    } = request.query as {
      range?: string;
      from?: string;
      to?: string;
      points?: string;
      rack_id?: string;
      telemetry?: string;
    };

    let fromDate: Date;
    let toDate: Date = new Date();

    switch (range) {
      case "1m":
        fromDate = new Date(Date.now() - 60 * 1000);
        break;
      case "1h":
        fromDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case "1d":
        fromDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case "1w":
        fromDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "1M":
        fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "3M":
        fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "6M":
        fromDate = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
        break;
      case "1y":
        fromDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "custom":
        if (!from || !to) {
          return reply
            .status(400)
            .send({ error: "from and to required for custom range" });
        }
        fromDate = new Date(from);
        toDate = new Date(to);
        break;
      default:
        fromDate = new Date(Date.now() - 60 * 60 * 1000);
    }

    const targetPoints = points ? parseInt(points) : 120;
    const names = telemetry ? [telemetry] : undefined;
    const tags = rack_id ? { rack_id } : undefined;

    try {
      const telemetries = await timescale.getDownsampledData({
        from: fromDate,
        to: toDate,
        points: targetPoints,
        deviceId: "xrack-simulator",
        names,
        tags,
      });

      return reply.send({ telemetries });
    } catch (error) {
      console.error("[API] Downsampling failed:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  // POST /api/commands/power - Power komutu
  fastify.post("/commands/power", async (request, reply) => {
    const body = request.body as {
      charge_status: string;
      power_kw: number;
      duration_seconds?: number;
      rack_id?: number;
    };

    const { charge_status, power_kw } = body;

    try {
      if (charge_status === "Charge") {
        await powerHandler.handleCharge(power_kw);
      } else if (charge_status === "Discharge") {
        await powerHandler.handleDischarge(power_kw);
      } else if (charge_status === "Idle") {
        await powerHandler.handleStop();
      } else {
        return reply.status(400).send({ error: "Invalid charge_status" });
      }

      return reply
        .status(200)
        .send({ message: "Power command applied", updatedCount: 16 });
    } catch (error) {
      console.error("[API] Power command failed:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
