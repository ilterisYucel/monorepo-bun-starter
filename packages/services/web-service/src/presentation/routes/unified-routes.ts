import type { FastifyInstance } from "fastify";
import { TimescaleDBAdapter, MaterializedViewManager } from "@gd-monorepo/core";
import type { ISqlDatabase } from "@gd-monorepo/core";
import type { TelemetryData } from "@gd-monorepo/shared-types";
import { DeviceRegistry } from "../../infrastructure/persistence/device-registry";

export async function unifiedRoutes(
  fastify: FastifyInstance,
  options: {
    registry: DeviceRegistry;
    timescale: TimescaleDBAdapter;
    mvManager: MaterializedViewManager;
    postgres: ISqlDatabase;
  },
) {
  const { registry, timescale, mvManager, postgres } = options;

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

  fastify.get("/telemetry/:deviceId", async (request, reply) => {
    try {
      const { deviceId } = request.params as { deviceId: string };
      const {
        from,
        to,
        interval,
        registers,
      } = request.query as {
        from?: string;
        to?: string;
        interval?: string;
        registers?: string;
      };

      const fromDate = from ? new Date(from) : new Date(Date.now() - 3600000);
      const toDate = to ? new Date(to) : new Date();

      const timeRange = { from: fromDate, to: toDate };

      const tableName = `device_${deviceId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
      await mvManager.ensureMaterializedViews(tableName);

      let selectedView: string;
      if (interval && interval !== "auto") {
        selectedView = `${tableName}_${interval}`;
      } else {
        selectedView = mvManager.selectView(tableName, timeRange);
      }

      const isRawView = selectedView === tableName;

      let sql: string;
      const params: unknown[] = [fromDate.toISOString(), toDate.toISOString()];

      if (isRawView) {
        sql = `
          SELECT name, value, unit, description, timestamp, tags
          FROM ${selectedView}
          WHERE timestamp BETWEEN $1 AND $2
        `;
      } else {
        sql = `
          SELECT
            bucket AS timestamp,
            name,
            avg_value AS value,
            min_value,
            max_value,
            last_value,
            sample_count
          FROM ${selectedView}
          WHERE bucket BETWEEN $1 AND $2
        `;
      }

      if (registers) {
        const registerList = registers.split(",");
        const placeholders = registerList
          .map((_, i) => `$${i + 3}`)
          .join(", ");
        sql += ` AND name IN (${placeholders})`;
        params.push(...registerList);
      }

      sql += ` ORDER BY ${isRawView ? "timestamp" : "bucket"} ASC`;

      const result = await timescale.executeRaw(sql, params) as any;
      const data = result?.rows ?? [];

      const viewInterval = isRawView
        ? "raw"
        : selectedView.replace(`${tableName}_`, "");

      return reply.send({
        deviceId,
        interval: viewInterval,
        dataPointCount: data.length,
        data,
      });
    } catch (error) {
      console.error("[UnifiedRoutes] telemetry/:deviceId hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/timeseries/hypertables", async (_request, reply) => {
    try {
      const result = await timescale.executeRaw(`
        SELECT
          hypertable_name,
          hypertable_schema,
          num_chunks,
          compression_enabled,
          total_size
        FROM timescaledb_information.hypertables
        ORDER BY hypertable_name
      `) as any;

      return reply.send({ hypertables: result?.rows ?? [] });
    } catch (error) {
      console.error("[UnifiedRoutes] hypertables hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/timeseries/hypertables/:name", async (request, reply) => {
    try {
      const { name } = request.params as { name: string };

      const [columns, stats] = await Promise.all([
        timescale.executeRaw(`
          SELECT DISTINCT name, COUNT(*) as data_points
          FROM ${name}
          GROUP BY name
          ORDER BY name
        `) as any,
        timescale.executeRaw(`
          SELECT
            MIN(timestamp) as first_data,
            MAX(timestamp) as last_data,
            COUNT(*) as total_points
          FROM ${name}
        `) as any,
      ]);

      return reply.send({
        hypertable: name,
        telemetryNames: columns?.rows ?? [],
        stats: stats?.rows?.[0] ?? {},
      });
    } catch (error) {
      console.error("[UnifiedRoutes] hypertable detail hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/timeseries/materialized-views", async (_request, reply) => {
    try {
      const views = await mvManager.existingViews();
      return reply.send({ materializedViews: views });
    } catch (error) {
      console.error("[UnifiedRoutes] mv list hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/timeseries/materialized-views", async (request, reply) => {
    try {
      const { hypertable } = request.body as {
        hypertable: string;
        intervals?: string[];
      };

      if (!hypertable) {
        return reply
          .status(400)
          .send({ error: "hypertable parametresi gerekli" });
      }

      await mvManager.ensureMaterializedViews(hypertable);

      return reply.send({
        success: true,
        hypertable,
        message: "Materialized view'ler olusturuldu",
      });
    } catch (error) {
      console.error("[UnifiedRoutes] mv create hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  await postgres.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      nodes JSONB DEFAULT '[]',
      edges JSONB DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  fastify.get("/projects", async (_request, reply) => {
    try {
      const result = await postgres.execute(
        `SELECT id, name, nodes, edges, created_at, updated_at FROM projects ORDER BY updated_at DESC`
      );
      return reply.send({ projects: result.rows ?? [] });
    } catch (error) {
      console.error("[UnifiedRoutes] projects list hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/projects/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await postgres.execute(
        `SELECT id, name, nodes, edges, created_at, updated_at FROM projects WHERE id = $1`,
        [id]
      );
      if (!result.rows || result.rows.length === 0) {
        return reply.status(404).send({ error: "Proje bulunamadi" });
      }
      return reply.send(result.rows[0]);
    } catch (error) {
      console.error("[UnifiedRoutes] project load hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.post("/projects", async (request, reply) => {
    try {
      const { name, nodes, edges } = request.body as {
        name: string;
        nodes: unknown;
        edges: unknown;
      };
      const result = await postgres.execute(
        `INSERT INTO projects (name, nodes, edges) VALUES ($1, $2, $3) RETURNING id`,
        [name, JSON.stringify(nodes), JSON.stringify(edges)]
      );
      return reply.status(201).send({ id: result.rows?.[0]?.id });
    } catch (error) {
      console.error("[UnifiedRoutes] project create hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.put("/projects/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { name, nodes, edges } = request.body as {
        name: string;
        nodes: unknown;
        edges: unknown;
      };
      await postgres.execute(
        `UPDATE projects SET name = $1, nodes = $2, edges = $3, updated_at = NOW() WHERE id = $4`,
        [name, JSON.stringify(nodes), JSON.stringify(edges), id]
      );
      return reply.send({ id });
    } catch (error) {
      console.error("[UnifiedRoutes] project update hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });

  fastify.delete("/projects/:id", async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      await postgres.execute(`DELETE FROM projects WHERE id = $1`, [id]);
      return reply.send({ success: true });
    } catch (error) {
      console.error("[UnifiedRoutes] project delete hata:", error);
      return reply.status(500).send({ error: "Internal server error" });
    }
  });
}
