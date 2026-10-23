import type { FastifyInstance } from "fastify";
import type { User } from "@gd-monorepo/shared-types";
import type { ISqlDatabase } from "@gd-monorepo/core";
import type { GetFieldContainersUseCase } from "../../application/telemetry/get-field-containers-use-case";
import type { GetContainerTelemetryUseCase } from "../../application/telemetry/get-container-telemetry-use-case";

interface FieldRow {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
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

}

function getUserFieldIds(user: User): string[] {
  return user.fieldIds ?? [];
}

function userCanAccessField(user: User, fieldId: string): boolean {
  if (user.role === "admin" || user.role === "boss") return true;
  // 2026-08-30: guest/developer saha verisini salt-okunur görür (dashboard) —
  // fieldIds kısıtı YALNIZ teknik içindir.
  if (user.role === "guest" || user.role === "developer") return true;
  const fieldIds = getUserFieldIds(user);
  // T1.3 tamiri: boş fieldIds = HİÇBİR saha (eski davranış: boş = tüm sahalar)
  return fieldIds.includes(fieldId);
}

export async function fieldRoutes(
  fastify: FastifyInstance,
  deps: {
    db: ISqlDatabase;
    containers?: GetFieldContainersUseCase;
    telemetry?: GetContainerTelemetryUseCase;
  },
): Promise<void> {
  await ensureSchema(deps.db);

  // 2026-08-28: saha REGISTRY uçları (liste/oluştur/güncelle/sil) field
  // stack'ten KALDIRILDI — tek saha modeli (FIELD_ID env + açılış seed'i).
  // Çok saha yönetimi ileride ayrı bir boss uygulamasında yaşayacak.
  // Burada yalnızca saha BAŞINA veri uçları vardır: summary / containers /
  // telemetry.

  fastify.get("/:fieldId/summary", async (request, reply) => {
    const { fieldId } = request.params as { fieldId: string };
    const user = (request as unknown as { user: User }).user;
    if (!userCanAccessField(user, fieldId)) {
      return reply.status(403).send({ error: "Bu sahaya erisim izniniz yok" });
    }

    const field = await deps.db.queryOne<FieldRow>(
      "SELECT * FROM fields WHERE id = $1",
      [fieldId],
    );
    if (!field) return reply.status(404).send({ error: "Saha bulunamadi" });

    const rows = (await deps.containers?.executeCached()) ?? [];
    const containerList = rows.map((row) => ({
      containerId: row.containerId,
      connected: row.connectionStatus === "connected",
      ...(row.lastSeenAt !== undefined ? { lastSeenAt: row.lastSeenAt } : {}),
      latestTelemetry: row.latestTelemetry,
    }));

    return reply.send({ field, containers: containerList, telemetries: [] });
  });

  fastify.get("/:fieldId/containers", async (request, reply) => {
    const { fieldId } = request.params as { fieldId: string };
    const user = (request as unknown as { user: User }).user;
    if (!userCanAccessField(user, fieldId)) {
      return reply.status(403).send({ error: "Bu sahaya erisim izniniz yok" });
    }

    const result = (await deps.containers?.execute()) ?? [];
    return reply.send(result);
  });

  fastify.get("/:fieldId/telemetry/latest", async (request, reply) => {
    const { fieldId } = request.params as { fieldId: string };
    const user = (request as unknown as { user: User }).user;
    if (!userCanAccessField(user, fieldId)) {
      return reply.status(403).send({ error: "Bu sahaya erisim izniniz yok" });
    }

    return reply.send(deps.telemetry?.latestSnapshot() ?? {});
  });

  fastify.get("/:fieldId/telemetry/downsampled", async (request, reply) => {
    const { fieldId } = request.params as { fieldId: string };
    const query = request.query as {
      from?: string;
      to?: string;
      points?: string;
      containerIds?: string;
      names?: string;
      tag?: string;
    };

    const user = (request as unknown as { user: User }).user;
    if (!userCanAccessField(user, fieldId)) {
      return reply.status(403).send({ error: "Bu sahaya erisim izniniz yok" });
    }
    if (query.tag !== undefined && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(query.tag)) {
      return reply.status(400).send({ error: "geçersiz tag anahtarı" });
    }

    if (!deps.telemetry) {
      return reply.send({});
    }
    const containerIds = query.containerIds
      ? query.containerIds.split(",")
      : deps.telemetry.knownContainerIds();

    const fromDate = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = query.to ? new Date(query.to) : new Date();
    const points = query.points ? Number.parseInt(query.points, 10) : 120;

    const params = {
      from: fromDate,
      to: toDate,
      points,
      ...(query.names !== undefined
        ? { names: query.names.split(",").map((n) => n.trim()).filter((n) => n.length > 0) }
        : {}),
      tag: query.tag,
    };
    const results = await deps.telemetry.downsampled(containerIds, params);
    return reply.send(results);
  });

  fastify.get("/:fieldId/telemetry/:containerId", async (request, reply) => {
    const { fieldId, containerId } = request.params as {
      fieldId: string;
      containerId: string;
    };
    const query = request.query as {
      from?: string;
      to?: string;
      points?: string;
    };

    const user = (request as unknown as { user: User }).user;
    if (!userCanAccessField(user, fieldId)) {
      return reply.status(403).send({ error: "Bu sahaya erisim izniniz yok" });
    }

    if (!deps.telemetry) {
      return reply.send([]);
    }

    const fromDate = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = query.to ? new Date(query.to) : new Date();
    const points = query.points ? Number.parseInt(query.points, 10) : 120;

    // Tek doğruluk noktası: toplu sorgu yolu (allHistorical) — per-container
    // davranış aynı, dış şekil değişmez.
    const results = await deps.telemetry.historical(containerId, {
      from: fromDate,
      to: toDate,
      points,
    });
    return reply.send(results);
  });


}
