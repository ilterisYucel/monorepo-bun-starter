import type { FastifyInstance } from "fastify";
import type { User } from "@gd-monorepo/shared-types";
import type { FieldPoller } from "../../infrastructure/field-poller";

export async function adminRoutes(
  fastify: FastifyInstance,
  deps: { fieldPoller: FieldPoller },
): Promise<void> {
  fastify.get("/", async (_request, reply) => {
    const fields = await deps.fieldPoller.fields();
    return reply.send(fields);
  });

  fastify.get("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const field = await deps.fieldPoller.field(id);
    if (!field) return reply.status(404).send({ error: "Saha bulunamadi" });
    return reply.send(field);
  });

  fastify.post("/", async (request, reply) => {
    const body = request.body as {
      name: string;
      location?: { lat: number; lng: number };
      apiUrl?: string;
      metadata?: Record<string, unknown>;
    };

    const field = await deps.fieldPoller.registeredField(body);
    return reply.status(201).send(field);
  });

  fastify.put("/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      location?: { lat: number; lng: number };
      apiUrl?: string;
      metadata?: Record<string, unknown>;
    };

    const existing = await deps.fieldPoller.field(id);
    if (!existing) return reply.status(404).send({ error: "Saha bulunamadi" });

    try {
      const updated = await deps.fieldPoller.updateField(id, {
        name: body.name,
        location: body.location ? JSON.stringify(body.location) : undefined,
        apiUrl: body.apiUrl,
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
