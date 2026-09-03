import type { FastifyInstance } from "fastify";
import type { User, TelemetryData } from "@gd-monorepo/shared-types";
import type { ContainerProxy } from "../../infrastructure/container-proxy/container-proxy";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { sha256Hex } from "../../infrastructure/auth/service-token";

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
  container_url: string | null;
  layout: {
    x: number;
    y: number;
    z: number;
    rotation?: { x: number; y: number; z: number };
    scale?: number;
  };
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
      token_hash TEXT,
      layout JSONB DEFAULT '{"x":0,"y":0,"z":0}',
      PRIMARY KEY (field_id, container_id)
    )
  `);

  // Faz 1 T1.1: mevcut kurulumlar için token_hash kolonu migrasyonu
  await db.execute(
    "ALTER TABLE field_containers ADD COLUMN IF NOT EXISTS token_hash TEXT",
  );
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
  deps: { db: ISqlDatabase; containerProxy?: ContainerProxy },
): Promise<void> {
  await ensureSchema(deps.db);

  // 2026-08-28: saha REGISTRY uçları (liste/oluştur/güncelle/sil) field
  // stack'ten KALDIRILDI — tek saha modeli (FIELD_ID env + açılış seed'i).
  // Çok saha yönetimi ileride ayrı bir boss uygulamasında yaşayacak.
  // Burada yalnızca saha BAŞINA veri uçları vardır: summary / containers /
  // telemetry + konteyner register'ı.

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

    const containers = await deps.db.query<FieldContainerRow>(
      "SELECT * FROM field_containers WHERE field_id = $1",
      [fieldId],
    );

    const containerResults = await Promise.allSettled(
      containers.map(async (c) => {
        const latest = deps.containerProxy
          ? deps.containerProxy.latestTelemetry(c.container_id)
          : [];
        const connected = deps.containerProxy
          ? deps.containerProxy.connectionStatus().get(c.container_id) ===
            "connected"
          : false;
        // Faz 2 T2.4: gerçek son-heartbeat zamanı (önceden sahte now()).
        const lastSeenAtMs = deps.containerProxy
          ? deps.containerProxy.lastSeenAt(c.container_id)
          : undefined;

        return {
          containerId: c.container_id,
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

    const rows = await deps.db.query<FieldContainerRow>(
      "SELECT * FROM field_containers WHERE field_id = $1",
      [fieldId],
    );

    const fieldResults = await Promise.allSettled(
      rows.map(async (c) => {
        const status =
          deps.containerProxy?.connectionStatus().get(c.container_id) ?? "idle";
        const lastSeenAtMs = deps.containerProxy?.lastSeenAt(c.container_id);
        return {
          containerId: c.container_id,
          layout: c.layout,
          connectionStatus: status,
          // Faz 2 T2.4: gerçek son-heartbeat zamanı
          ...(lastSeenAtMs !== undefined
            ? { lastSeenAt: new Date(lastSeenAtMs).toISOString() }
            : {}),
          latestTelemetry:
            deps.containerProxy?.latestTelemetry(c.container_id) ?? [],
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
        telemetry[c.container_id] = deps.containerProxy.latestTelemetry(
          c.container_id,
        );
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

    const fromDate = query.from
      ? new Date(query.from)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const toDate = query.to ? new Date(query.to) : new Date();
    const points = query.points ? Number.parseInt(query.points, 10) : 120;

    const params = { from: fromDate, to: toDate, points };
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

    const results = await deps.containerProxy.historical(containerId, {
      from: fromDate,
      to: toDate,
      points,
    });
    return reply.send(results);
  });

  fastify.post(
    "/:fieldId/containers/:containerId/register",
    async (request, reply) => {
      const { fieldId, containerId } = request.params as {
        fieldId: string;
        containerId: string;
      };
      const user = (request as unknown as { user: User }).user;
      if (user.role !== "admin" && user.role !== "boss") {
        return reply
          .status(403)
          .send({ error: "Konteyner kayit yetkiniz yok" });
      }

      // 2026-08-30: containerUrl ALANI KALDIRILDI — mimari sözleşme: field
      // konteynere URL ile bağlanmaz; bağlantı konteynerden field'a outbound
      // WSS'tir (FieldConnector). Eski kurulumlardaki kolon değeri artık
      // güncellenmez (NULL kalır); payload'daki containerUrl yok sayılır.
      const { token } = request.body as {
        token?: string;
      };
      if (typeof token !== "string" || token.length < 32) {
        return reply
          .status(400)
          .send({ error: "token en az 32 karakter olmali" });
      }

      const field = await deps.db.queryOne<{ id: string }>(
        "SELECT id FROM fields WHERE id = $1",
        [fieldId],
      );
      if (!field) {
        return reply.status(404).send({ error: "Saha bulunamadi" });
      }

      // Düz token DB'ye ASLA yazılmaz — yalnızca SHA-256 hash'i saklanır.
      await deps.db.execute(
        `INSERT INTO field_containers (field_id, container_id, token_hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (field_id, container_id) DO UPDATE
       SET token_hash = EXCLUDED.token_hash`,
        [fieldId, containerId, sha256Hex(token)],
      );

      return reply.status(201).send({ registered: true, containerId });
    },
  );
}
