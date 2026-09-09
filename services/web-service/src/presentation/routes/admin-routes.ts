import type { FastifyInstance } from "fastify";
import type { User } from "@gd-monorepo/shared-types";
import type { FieldPoller } from "../../infrastructure/field-poller";
import type { FieldRegistry } from "../../infrastructure/field-uplink/field-registry";

/**
 * Registry overlay (BOSS-UYGULAMA-DOGRULAMA.md S1 düzeltmesi):
 * FieldPoller özet fetch'i field JWT'si gerektirdiği için `admin_fields.status`
 * "offline" kalabilir. Uplink kanalı (FieldRegistry) canlıysa durum otoritesi
 * odur — bağlı saha "online" görünür ve son görülme uplink kalp atışından gelir.
 *
 * DEMO NOTU (geçici): field→cloud özet push'u gelene kadar bağlı saha için
 * özet alanları da lab stack'ine uygun ÖRNEK değerlerle doldurulur
 * (1 konteyner, 1 çevrimiçi). Gerçek telemetri push'u geldiğinde bu blok
 * kalkar (TODO: field-uplink özet push — Boss Faz 3 sonraki iterasyon).
 */
const DEMO_SUMMARY = {
  container_count: 1,
  online_containers: 1,
  total_power_mw: 0.25,
  avg_soc: 87.0,
  active_alarms: 0,
};

function withRegistryState<T extends { id: string }>(
  field: T,
  registry?: FieldRegistry,
): T & { status?: string; last_seen_at?: string; container_count?: number } {
  if (!registry || !registry.isConnected(field.id)) return field;
  const lastSeen = registry.lastSeenAt(field.id);
  const row = field as T & { container_count?: number };
  const summary = (row.container_count ?? 0) === 0 ? DEMO_SUMMARY : undefined;
  return {
    ...field,
    status: "online",
    ...summary,
    ...(lastSeen !== undefined
      ? { last_seen_at: new Date(lastSeen).toISOString() }
      : {}),
  };
}

export async function adminRoutes(
  fastify: FastifyInstance,
  deps: { fieldPoller: FieldPoller; registry?: FieldRegistry },
): Promise<void> {
  fastify.get("/", async (_request, reply) => {
    const fields = await deps.fieldPoller.fields();
    return reply.send(
      fields.map((field) => withRegistryState(field, deps.registry)),
    );
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const field = await deps.fieldPoller.field(id);
    if (!field) return reply.status(404).send({ error: "Saha bulunamadi" });
    return reply.send(withRegistryState(field, deps.registry));
  });

  fastify.post("/", async (request, reply) => {
    const body = request.body as {
      /** Opsiyonel: sahanın KENDİ fieldId'si (field tier'daki FIELD_ID).
       * Verilirse boss kaydı o kimliği kullanır — uplink register'ındaki
       * peerId ile birebir eşleşir (kimlik tek kaynaktan). */
      id?: string;
      name: string;
      location?: { lat: number; lng: number };
      apiUrl?: string;
      /** Saha tipi (wind | solar | hydro | battery | general ...) — harita glifi. */
      fieldType?: string;
      metadata?: Record<string, unknown>;
      uplinkToken?: string;
    };

    const field = await deps.fieldPoller.registeredField({
      id: body.id,
      name: body.name,
      location: body.location,
      apiUrl: body.apiUrl,
      fieldType: body.fieldType,
      metadata: body.metadata,
    });
    // Faz 3: field uplink token'ı hash olarak boss kayıt defterine girer
    // (düz metin SAKLANMAZ — field_uplinks.token_hash).
    if (body.uplinkToken && deps.registry) {
      await deps.registry.upsertToken(field.id, body.uplinkToken);
    }
    return reply.status(201).send(field);
  });

  fastify.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      location?: { lat: number; lng: number };
      apiUrl?: string;
      fieldType?: string;
      metadata?: Record<string, unknown>;
      uplinkToken?: string;
    };

    const existing = await deps.fieldPoller.field(id);
    if (!existing) return reply.status(404).send({ error: "Saha bulunamadi" });

    if (body.uplinkToken && deps.registry) {
      await deps.registry.upsertToken(id, body.uplinkToken);
    }

    try {
      const updated = await deps.fieldPoller.updateField(id, {
        name: body.name,
        location: body.location ? JSON.stringify(body.location) : undefined,
        apiUrl: body.apiUrl,
        fieldType: body.fieldType,
        metadata: body.metadata ? JSON.stringify(body.metadata) : undefined,
      });
      return reply.send(updated);
    } catch (err) {
      if ((err as Error).message.startsWith("Field not found")) {
        return reply.status(404).send({ error: "Saha bulunamadi" });
      }
      throw err;
    }
  });

  fastify.delete("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    await deps.fieldPoller.deleteField(id);
    // Faz 3: uplink token kaydı da düşer (yetim satır kalmaz).
    if (deps.registry) {
      await deps.registry.removeToken(id);
    }
    return reply.send({ success: true });
  });

  fastify.get("/:id/summary", async (request, reply) => {
    const field = await deps.fieldPoller.field(
      (request.params as { id: string }).id,
    );
    if (!field) return reply.status(404).send({ error: "Saha bulunamadi" });

    try {
      const resp = await fetch(`${field.api_url}/api/fields/${field.id}/summary`, {
        signal: AbortSignal.timeout(10000),
      });
      const data = await resp.json();
      return reply.send(data);
    } catch {
      return reply.status(502).send({ error: "Saha api'sine ulasilamadi" });
    }
  });
}
