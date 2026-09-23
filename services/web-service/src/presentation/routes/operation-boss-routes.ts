// Boss tier: field'da operasyon tetikleme rotası (WS-TUNNEL-KAPASITE §5.2).
// Boss yalnızca YÖNLENDİRİR — iş mantığı field'dadır (katman sızmaz).

import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { OperationRequester } from "../../infrastructure/field-uplink/operation-requester";
import { authorizeCommand } from "./internal-authorize";

const executeBodySchema = z
  .object({
    params: z.record(z.unknown()).default({}),
  })
  .strict();

function traceFrom(request: FastifyRequest): string | undefined {
  const value = request.headers["x-gd-trace-id"];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * operationBossRoutes — POST /api/fields/:fieldId/operations/:name/execute.
 *
 * Sözleşme (test: operation-boss-routes.test.ts):
 * - Yetki: admin/teknik (Bearer) veya iç token; yoksa 403.
 * - operationId boss üretir (korelasyon); requester üzerinden operation-
 *   execute gönderilir; sonuç beklenir.
 * - Timeout/kopukluk (undefined) → 503 operation_timeout (§8: operation-result
 *   yerine timeout).
 * - Sonuç AYNEN döner (status: completed/failed/rolled_back/rejected).
 * - Requester kurulmamışsa (tier boss değilse) 503.
 */
export async function operationBossRoutes(
  fastify: FastifyInstance,
  deps: {
    requester?: OperationRequester;
    internalToken?: string;
  },
): Promise<void> {
  fastify.post("/fields/:fieldId/operations/:name/execute", async (request, reply) => {
    const user = authorizeCommand(request, deps.internalToken);
    if (!user) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    if (!deps.requester) {
      return reply.status(503).send({ error: "operation_requester_unavailable" });
    }

    const { fieldId, name } = request.params as { fieldId: string; name: string };
    const body = executeBodySchema.parse(request.body);
    const operationId = randomUUID();

    const result = await deps.requester.send(
      fieldId,
      operationId,
      name,
      body.params,
      traceFrom(request),
    );
    if (!result) {
      return reply.status(503).send({ error: "operation_timeout" });
    }
    return reply.status(200).send({ result });
  });
}
