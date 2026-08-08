import type { FastifyInstance, FastifyRequest } from "fastify";
import type { User, TelemetryData } from "@gd-monorepo/shared-types";
import type { ContainerProxy } from "../../infrastructure/container-proxy/container-proxy";
import type { ISqlDatabase } from "@gd-monorepo/core";

interface FieldRow {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface FieldContainerRow {
  field_id: string;
  container_id: string;
  container_url: string;
  layout: { x: number; y: number; z: number; rotation?: { x: number; y: number; z: number }; scale?: number };
}

async function ensureSchema(db: ISqlDatabase): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS fields (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      location JSONB NOT NULL DEFAULT '{"lat": 0, "lng": 0}',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS field_containers (
      field_id UUID REFERENCES fields(id) ON DELETE CASCADE,
      container_id TEXT NOT NULL,
      container_url TEXT,
      layout JSONB DEFAULT '{"x":0,"y":0,"z":0}',
      PRIMARY KEY (field_id, container_id)
    )
  `);
}

function getUserFieldIds(user: User): string[] {
  return user.fieldIds ?? [];
}

function userCanAccessField(user: User, fieldId: string): boolean {
  if (user.role === "admin" || user.role === "boss") return true;
  const fieldIds = getUserFieldIds(user);
  return fieldIds.length === 0 || fieldIds.includes(fieldId);
}

export async function fieldRoutes(
  fastify: FastifyInstance,
  deps: { db: ISqlDatabase; containerProxy?: ContainerProxy },
): Promise<void> {
  await ensureSchema(deps.db);

  fastify.get("/", async (request, reply) => {
    const user = (request as unknown as { user: User }).user;
    const fieldIds = getUserFieldIds(user);

    if (user.role === "admin" || user.role === "boss") {
      const rows = await deps.db.query<FieldRow>("SELECT * FROM fields ORDER BY created_at ASC");
      return reply.send(rows);
    }

    if (fieldIds.length === 0) return reply.send([]);

    const rows = await deps.db.query<FieldRow>(
      "SELECT * FROM fields WHERE id = ANY($1::uuid[]) ORDER BY created_at ASC",
      [fieldIds],
    );
    return reply.send(rows);
  });

  fastify.get("/:fieldId", async (request, reply) => {
    const { fieldId } = request.params as { fieldId: string };
    const user = (request as unknown as { user: User }).user;
    if (!userCanAccessField(user, fieldId)) {
      return reply.status(403).send({ error: "Bu sahaya erisim izniniz yok" });
    }

    const field = await deps.db.queryOne<FieldRow>("SELECT * FROM fields WHERE id = $1", [fieldId]);
    if (!field) return reply.status(404).send({ error: "Saha bulunamadi" });

    const containers = await deps.db.query<FieldContainerRow>(
      "SELECT * FROM field_containers WHERE field_id = $1",
      [fieldId],
    );

    return reply.send({ ...field, containers });
  });

  fastify.get("/:fieldId/summary", async (request, reply) => {
    const { fieldId } = request.params as { fieldId: string };
    const user = (request as unknown as { user: User }).user;
    if (!userCanAccessField(user, fieldId)) {
      return reply.status(403).send({ error: "Bu sahaya erisim izniniz yok" });
    }

    const field = await deps.db.queryOne<FieldRow>("SELECT * FROM fields WHERE id = $1", [fieldId]);
    if (!field) return reply.status(404).send({ error: "Saha bulunamadi" });

    const containers = await deps.db.query<FieldContainerRow>(
      "SELECT * FROM field_containers WHERE field_id = $1",
      [fieldId],
    );

    const containerResults = await Promise.allSettled(
      containers.map(async (c) => {
        const latest = deps.containerProxy ? deps.containerProxy.latestTelemetry(c.container_id) : [];
        const connected = deps.containerProxy
          ? (deps.containerProxy.connectionStatus().get(c.container_id) === "connected")
          : false;

        return {
          containerId: c.container_id,
          containerUrl: c.container_url,
          connected,
          lastSeenAt: new Date().toISOString(),
          latestTelemetry: latest,
        };
      }),
    );
    const containerList = containerResults.flatMap((r) =>
      r.status === "fulfilled" ? [r.value] : [],
    );

    return reply.send({ field, containers: containerList, telemetries: [] });
  });

  fastify.get("/:fieldId/containers", async (request, reply) => {
    const { fieldId } = request.params as { fieldId: string };
    const user = (request as unknown as { user: User }).user;
    if (!userCanAccessField(user, fieldId)) {
      return reply.status(403).send({ error: "Bu sahaya erisim izniniz yok" });
    }

    const rows = await deps.db.query<FieldContainerRow>(
      "SELECT * FROM field_containers WHERE field_id = $1",
      [fieldId],
    );

    const fieldResults = await Promise.allSettled(
      rows.map(async (c) => {
        const status = deps.containerProxy?.connectionStatus().get(c.container_id) ?? "idle";
        return {
          containerId: c.container_id,
          containerUrl: c.container_url,
          layout: c.layout,
          connectionStatus: status,
          latestTelemetry: deps.containerProxy?.latestTelemetry(c.container_id) ?? [],
        };
      }),
    );
    const result = fieldResults.flatMap((r) =>
      r.status === "fulfilled" ? [r.value] : [],
    );

    return reply.send(result);
  });

  fastify.get("/:fieldId/telemetry/latest", async (request, reply) => {
    const { fieldId } = request.params as { fieldId: string };
    const user = (request as unknown as { user: User }).user;
    if (!userCanAccessField(user, fieldId)) {
      return reply.status(403).send({ error: "Bu sahaya erisim izniniz yok" });
    }

    const containers = await deps.db.query<FieldContainerRow>(
      "SELECT * FROM field_containers WHERE field_id = $1",
      [fieldId],
    );

    const telemetry: Record<string, TelemetryData[]> = {};
    for (const c of containers) {
      if (deps.containerProxy) {
        telemetry[c.container_id] = deps.containerProxy.latestTelemetry(c.container_id);
      }
    }

    return reply.send(telemetry);
  });

  fastify.get("/:fieldId/telemetry/downsampled", async (request, reply) => {
    const { fieldId } = request.params as { fieldId: string };
    const query = request.query as {
      from?: string;
      to?: string;
      points?: string;
      containerIds?: string;
    };

    const user = (request as unknown as { user: User }).user;
    if (!userCanAccessField(user, fieldId)) {
      return reply.status(403).send({ error: "Bu sahaya erisim izniniz yok" });
    }

    const containerRows = await deps.db.query<FieldContainerRow>(
      "SELECT * FROM field_containers WHERE field_id = $1",
      [fieldId],
    );

    const containerIds = query.containerIds
      ? query.containerIds.split(",")
      : containerRows.map((c) => c.container_id);

    if (!deps.containerProxy) {
      return reply.send({});
    }

    const fromDate = query.from ? new Date(query.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = query.to ? new Date(query.to) : new Date();
    const points = query.points ? parseInt(query.points, 10) : 120;

    const params = { from: fromDate, to: toDate, points };
    const results = await deps.containerProxy.allHistorical(containerIds, params);
    return reply.send(results);
  });

  fastify.get("/:fieldId/telemetry/:containerId", async (request, reply) => {
    const { fieldId, containerId } = request.params as { fieldId: string; containerId: string };
    const query = request.query as { from?: string; to?: string; points?: string };

    const user = (request as unknown as { user: User }).user;
    if (!userCanAccessField(user, fieldId)) {
      return reply.status(403).send({ error: "Bu sahaya erisim izniniz yok" });
    }

    if (!deps.containerProxy) {
      return reply.send([]);
    }

    const fromDate = query.from ? new Date(query.from) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = query.to ? new Date(query.to) : new Date();
    const points = query.points ? parseInt(query.points, 10) : 120;

    const results = await deps.containerProxy.historical(containerId, { from: fromDate, to: toDate, points });
    return reply.send(results);
  });

  fastify.post("/", async (request, reply) => {
    const user = (request as unknown as { user: User }).user;
    if (user.role !== "admin" && user.role !== "boss") {
      return reply.status(403).send({ error: "Saha olusturma yetkiniz yok" });
    }

    const { name, location, metadata } = request.body as {
      name: string;
      location?: { lat: number; lng: number };
      metadata?: Record<string, unknown>;
    };

    const row = await deps.db.queryOne<FieldRow>(
      `INSERT INTO fields (name, location, metadata) VALUES ($1, $2, $3) RETURNING *`,
      [name, JSON.stringify(location ?? { lat: 0, lng: 0 }), JSON.stringify(metadata ?? {})],
    );

    return reply.status(201).send(row);
  });

  fastify.put("/:fieldId", async (request, reply) => {
    const { fieldId } = request.params as { fieldId: string };
    const user = (request as unknown as { user: User }).user;
    if (user.role !== "admin" && user.role !== "boss") {
      return reply.status(403).send({ error: "Saha guncelleme yetkiniz yok" });
    }

    const { name, location, metadata } = request.body as {
      name?: string;
      location?: { lat: number; lng: number };
      metadata?: Record<string, unknown>;
    };

    const sets: string[] = [];
    const params: unknown[] = [];
    let i = 1;

    if (name !== undefined) {
      sets.push(`name = $${i++}`);
      params.push(name);
    }
    if (location !== undefined) {
      sets.push(`location = $${i++}`);
      params.push(JSON.stringify(location));
    }
    if (metadata !== undefined) {
      sets.push(`metadata = $${i++}`);
      params.push(JSON.stringify(metadata));
    }

    if (sets.length === 0) {
      const existing = await deps.db.queryOne<FieldRow>("SELECT * FROM fields WHERE id = $1", [fieldId]);
      if (!existing) return reply.status(404).send({ error: "Saha bulunamadi" });
      return reply.send(existing);
    }

    sets.push(`updated_at = NOW()`);
    params.push(fieldId);

    const row = await deps.db.queryOne<FieldRow>(
      `UPDATE fields SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      params,
    );

    if (!row) return reply.status(404).send({ error: "Saha bulunamadi" });
    return reply.send(row);
  });

  fastify.delete("/:fieldId", async (request, reply) => {
    const { fieldId } = request.params as { fieldId: string };
    const user = (request as unknown as { user: User }).user;
    if (user.role !== "admin" && user.role !== "boss") {
      return reply.status(403).send({ error: "Saha silme yetkiniz yok" });
    }

    await deps.db.execute("DELETE FROM fields WHERE id = $1", [fieldId]);
    return reply.send({ success: true });
  });
}
