import type { FastifyInstance } from "fastify";
import type { User, TelemetryData } from "@gd-monorepo/shared-types";
import type { IContainerProxy } from "@gd-monorepo/platform-container-access";
import type { ISqlDatabase } from "@gd-monorepo/core";

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
  deps: { db: ISqlDatabase; containerProxy?: IContainerProxy },
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

    const containerIds = deps.containerProxy?.containerIds() ?? [];

    const containerResults = await Promise.allSettled(
      containerIds.map(async (containerId) => {
        const latest = deps.containerProxy
          ? deps.containerProxy.latestTelemetry(containerId)
          : [];
        const connected = deps.containerProxy
          ? deps.containerProxy.connectionStatus().get(containerId) ===
            "connected"
          : false;
        // Faz 2 T2.4: gerçek son-heartbeat zamanı (önceden sahte now()).
        const lastSeenAtMs = deps.containerProxy
          ? deps.containerProxy.lastSeenAt(containerId)
          : undefined;

        return {
          containerId,
          connected,
          ...(lastSeenAtMs !== undefined
            ? { lastSeenAt: new Date(lastSeenAtMs).toISOString() }
            : {}),
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

    const containerIds = deps.containerProxy?.containerIds() ?? [];

    const fieldResults = await Promise.allSettled(
      containerIds.map(async (containerId) => {
        const status =
          deps.containerProxy?.connectionStatus().get(containerId) ?? "idle";
        const lastSeenAtMs = deps.containerProxy?.lastSeenAt(containerId);
        // K-21: talep-üzeri taze snapshot (DB'den) → hızlı tepki; erişilemezse
        // push snapshot'a düşülür (kademeli bozulma).
        const fresh = deps.containerProxy?.latestQuery
          ? await deps.containerProxy.latestQuery(containerId)
          : [];
        const latestTelemetry =
          fresh.length > 0
            ? fresh
            : (deps.containerProxy?.latestTelemetry(containerId) ?? []);
        return {
          containerId,
          connectionStatus: status,
          // Faz 2 T2.4: gerçek son-heartbeat zamanı
          ...(lastSeenAtMs !== undefined
            ? { lastSeenAt: new Date(lastSeenAtMs).toISOString() }
            : {}),
          latestTelemetry,
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

    const containerIds = deps.containerProxy?.containerIds() ?? [];

    const telemetry: Record<string, TelemetryData[]> = {};
    for (const containerId of containerIds) {
      if (deps.containerProxy) {
        telemetry[containerId] = deps.containerProxy.latestTelemetry(containerId);
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

    const knownContainerIds = deps.containerProxy?.containerIds() ?? [];
    const containerIds = query.containerIds
      ? query.containerIds.split(",")
      : knownContainerIds;

    if (!deps.containerProxy) {
      return reply.send({});
    }

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
    const results = await deps.containerProxy.allHistorical(
      containerIds,
      params,
    );
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

    if (!deps.containerProxy) {
      return reply.send([]);
    }

    const fromDate = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = query.to ? new Date(query.to) : new Date();
    const points = query.points ? Number.parseInt(query.points, 10) : 120;

    // Tek doğruluk noktası: toplu sorgu yolu (allHistorical) — per-container
    // davranış aynı, dış şekil değişmez.
    const results = await deps.containerProxy.allHistorical([containerId], {
      from: fromDate,
      to: toDate,
      points,
    });
    return reply.send(results[containerId] ?? []);
  });


}
