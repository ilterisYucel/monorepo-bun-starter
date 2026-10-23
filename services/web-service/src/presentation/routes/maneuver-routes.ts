// Manevra/operasyon REST rotaları — yürütme + listeleme + koşu okuma.
// Kaynak tasarım: KOMUT-MANEVRA-OPERASYON-MIMARISI.md §4, §8.
// Sunum katmanı: yalnız doğrulama/yetki + HTTP eşlemesi; iş mantığı use-case'lerde.

import { z } from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { User } from "@gd-monorepo/shared-types";
import type { ExecuteCommandUseCase } from "../../application/commands/execute-command-use-case";
import type { ListCatalogUseCase } from "../../application/commands/list-catalog-use-case";
import type { OperationDefinitionsUseCase } from "../../application/commands/operation-definitions-use-case";
import type { OperationRunsUseCase } from "../../application/commands/operation-runs-use-case";
import { authorizeCommand } from "./internal-authorize";

const executeBodySchema = z
  .object({
    params: z.record(z.unknown()).default({}),
    deviceIds: z.array(z.string().min(1)).optional(),
    // UC-13: uzak (`system`) adımlar bu konteynerlere yönlendirilir.
    systems: z.array(z.string().min(1)).optional(),
    // §10 — UI "Zamanlı" kutusu: tüm yerel ana adımlara uygulanır.
    timer: z
      .object({
        durationSeconds: z.number().positive(),
      })
      .strict()
      .optional(),
  })
  .strict();

function traceFrom(request: FastifyRequest): string | undefined {
  const value = request.headers["x-gd-trace-id"];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Boss kökenli operasyon kimliği (SPEC UC-4) — hub relay'den gelen istekler
 * `x-gd-operation-id` taşır; koşu `boss:<id>` + `createdBy=boss` ile işaretlenir.
 */
function bossOperationId(request: FastifyRequest): string | undefined {
  const value = request.headers["x-gd-operation-id"];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** Yürütme sonucunu HTTP durumuna eşler (§8 + WS-TUNNEL rejected sözleşmesi). */
function replyFor(
  reply: { status: (code: number) => { send: (b: unknown) => unknown } },
  result: Awaited<ReturnType<ExecuteCommandUseCase["execute"]>>,
) {
  if (result === "timeout") {
    return reply.status(202).send({ status: "running" });
  }
  if (result.status === "rejected") {
    const code =
      result.reason === "not_found"
        ? 404
        : result.reason === "missing_param"
          ? 400
          : result.reason === "disabled"
            ? 409
            : 503;
    return reply.status(code).send({ error: result.reason, ...result });
  }
  if (result.status === "failed") {
    return reply.status(422).send(result);
  }
  return reply.status(200).send(result);
}

/** Tanım YÖNETİMİ yetkisi — yalnız admin (Bearer); teknik/iç token YOK (§11.2). */
function authorizeAdmin(request: FastifyRequest): User | undefined {
  const user = (request as unknown as { user?: User }).user;
  if (!user || user.role !== "admin") return undefined;
  return user;
}

export interface ManeuverRoutesDeps {
  catalog?: ListCatalogUseCase;
  executor?: ExecuteCommandUseCase;
  runs?: OperationRunsUseCase;
  definitions?: OperationDefinitionsUseCase;
  internalToken?: string;
}

/**
 * maneuverOperationRoutes — GET /api/maneuvers, POST /api/maneuvers/:name/execute,
 * GET /api/operations, POST /api/operations/:name/execute,
 * GET /api/operations/runs, GET /api/operations/runs/:id.
 *
 * Sözleşme (test: maneuver-routes.test.ts):
 * - Yetki: admin/teknik (Bearer) VEYA geçerli x-internal-token — fail-closed.
 * - execute: rejected (not_found → 404; missing_param → 400; run_persist_failed
 *   → 503); failed → 422; completed/rolled_back → 200; timeout → 202.
 * - runs: son N listesi + tek koşu (yok → 404).
 * - CRUD: yalnız admin; audit fail-closed (use-case'te).
 */
export async function maneuverOperationRoutes(
  fastify: FastifyInstance,
  deps: ManeuverRoutesDeps,
): Promise<void> {
  fastify.get("/maneuvers", async (request, reply) => {
    if (!authorizeCommand(request, deps.internalToken)) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    return reply.send({ maneuvers: (await deps.catalog?.list("maneuver")) ?? [] });
  });

  fastify.post("/maneuvers/:name/execute", async (request, reply) => {
    const user = authorizeCommand(request, deps.internalToken);
    if (!user) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    if (!deps.executor) {
      return reply.status(503).send({ error: "executor_unavailable" });
    }
    const { name } = request.params as { name: string };
    const body = executeBodySchema.parse(request.body);
    const result = await deps.executor.execute({
      kind: "maneuver",
      name,
      params: body.params,
      ...(body.deviceIds !== undefined ? { deviceIds: body.deviceIds } : {}),
      ...(body.systems !== undefined ? { systems: body.systems } : {}),
      ...(body.timer !== undefined ? { timer: body.timer } : {}),
      trigger: "manual",
      createdBy: user.username,
      ...(traceFrom(request) !== undefined
        ? { traceId: traceFrom(request) }
        : {}),
    });
    return replyFor(reply, result);
  });

  fastify.get("/operations", async (request, reply) => {
    if (!authorizeCommand(request, deps.internalToken)) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    return reply.send({ operations: (await deps.catalog?.list("operation")) ?? [] });
  });

  fastify.post("/operations/:name/execute", async (request, reply) => {
    const user = authorizeCommand(request, deps.internalToken);
    if (!user) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    if (!deps.executor) {
      return reply.status(503).send({ error: "executor_unavailable" });
    }
    const { name } = request.params as { name: string };
    const body = executeBodySchema.parse(request.body);
    const bossOpId = bossOperationId(request);
    const result = await deps.executor.execute({
      kind: "operation",
      name,
      params: body.params,
      ...(body.deviceIds !== undefined ? { deviceIds: body.deviceIds } : {}),
      ...(body.systems !== undefined ? { systems: body.systems } : {}),
      ...(body.timer !== undefined ? { timer: body.timer } : {}),
      trigger: bossOpId ? `boss:${bossOpId}` : "manual",
      createdBy: bossOpId ? "boss" : user.username,
      ...(traceFrom(request) !== undefined
        ? { traceId: traceFrom(request) }
        : {}),
    });
    return replyFor(reply, result);
  });

  fastify.get("/operations/runs", async (request, reply) => {
    if (!authorizeCommand(request, deps.internalToken)) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    const limit = 20;
    const runs = (await deps.runs?.listRecent(limit)) ?? [];
    return reply.send({ runs });
  });

  fastify.get("/operations/runs/:id", async (request, reply) => {
    if (!authorizeCommand(request, deps.internalToken)) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    const { id } = request.params as { id: string };
    const run = await deps.runs?.find(id);
    if (!run) {
      return reply.status(404).send({ error: "run_not_found" });
    }
    return reply.send({ run });
  });

  // ── Tanım YÖNETİMİ (yalnız admin — §11.2) ────────────────────────────────
  const registerDefinitionCrud = (kind: "maneuver" | "operation"): void => {
    const prefix = kind === "maneuver" ? "maneuvers" : "operations";

    fastify.post(`/${prefix}`, async (request, reply) => {
      if (!deps.definitions) {
        return reply.status(503).send({ error: "definition_store_unavailable" });
      }
      const user = authorizeAdmin(request);
      if (!user) {
        return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
      }
      const outcome = await deps.definitions.create(
        kind,
        request.body,
        user.username,
      );
      return replyForDefinition(reply, outcome);
    });

    fastify.put(`/${prefix}/:name`, async (request, reply) => {
      if (!deps.definitions) {
        return reply.status(503).send({ error: "definition_store_unavailable" });
      }
      const user = authorizeAdmin(request);
      if (!user) {
        return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
      }
      const { name } = request.params as { name: string };
      const outcome = await deps.definitions.update(
        kind,
        name,
        request.body,
        user.username,
      );
      return replyForDefinition(reply, outcome);
    });

    fastify.delete(`/${prefix}/:name`, async (request, reply) => {
      if (!deps.definitions) {
        return reply.status(503).send({ error: "definition_store_unavailable" });
      }
      const user = authorizeAdmin(request);
      if (!user) {
        return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
      }
      const { name } = request.params as { name: string };
      const outcome = await deps.definitions.disable(kind, name, user.username);
      return replyForDefinition(reply, outcome);
    });
  };

  registerDefinitionCrud("maneuver");
  registerDefinitionCrud("operation");
}

type DefinitionOutcome = Awaited<
  ReturnType<OperationDefinitionsUseCase["create"]>
>;

/** Tanım CRUD sonucu → HTTP. */
function replyForDefinition(
  reply: {
    status: (code: number) => { send: (b: unknown) => unknown };
  },
  outcome: DefinitionOutcome,
): unknown {
  switch (outcome.status) {
    case "created":
      return reply.status(201).send({ name: outcome.name });
    case "updated":
    case "deleted":
      return reply.status(200).send({ name: outcome.name });
    case "invalid":
      return reply.status(400).send({ error: "invalid_definition" });
    case "already_exists":
      return reply.status(409).send({ error: "already_exists" });
    case "not_found":
      return reply.status(404).send({ error: "not_found" });
    case "unavailable":
      return reply.status(503).send({ error: "definition_store_unavailable" });
    case "persist_failed":
      return reply.status(500).send({ error: "definition_persist_failed" });
  }
}
