// Manevra/operasyon REST rotaları — yürütme + listeleme + koşu okuma.
// Kaynak tasarım: KOMUT-MANEVRA-OPERASYON-MIMARISI.md §4, §8.

import { z } from "zod";
import type { FastifyInstance, FastifyRequest } from "fastify";
import type { TamperLogger } from "@gd-monorepo/tamper-logger";
import type { User } from "@gd-monorepo/shared-types";
import {
  maneuverRecordSchema,
  operationRecordSchema,
} from "@gd-monorepo/shared-types";
import type { ManeuverRegistry } from "@gd-monorepo/platform-commands";
import type {
  IOperationDefinitionStore,
  IOperationRunStore,
  OperationExecutor,
  OperationRunResult,
} from "@gd-monorepo/platform-commands";
import { authorizeCommand } from "./internal-authorize";

const executeBodySchema = z
  .object({
    params: z.record(z.unknown()).default({}),
    deviceIds: z.array(z.string().min(1)).optional(),
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

/** Senkron bekleme üst sınırı (KURAL-MOTORU-V2 §3.2) — aşarsa 202 dönülür. */
const EXECUTE_TIMEOUT_MS = 15_000;

/**
 * Yürütmeyi senkron bekler; 15 sn aşılırsa `"timeout"` döner — yürütme ARKA
 * PLANDA devam eder (executor kendi kalıcılığını/audit'ini yönetir; terminal
 * durum operation_runs'tan okunur). Kural kanalı 202'yi "başlatıldı" sayar.
 */
async function executeWithTimeout(
  executor: OperationExecutor,
  kind: "maneuver" | "operation",
  name: string,
  params: Record<string, unknown>,
  options: Record<string, unknown>,
): Promise<OperationRunResult | "timeout"> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<"timeout">((resolve) => {
    timer = setTimeout(() => resolve("timeout"), EXECUTE_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      executor.execute(kind, name, params, options as never),
      timeout,
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Yürütme sonucunu HTTP durumuna eşler (§8 + WS-TUNNEL rejected sözleşmesi). */
function replyFor(reply: { status: (code: number) => { send: (b: unknown) => unknown } }, result: OperationRunResult) {
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

/** Fail-closed audit — yazılamazsa THROW (tanım işlemi reddedilir §11.2). */
async function auditFailClosed(
  logger: TamperLogger | undefined,
  eventCode:
    | "operation_definition_created"
    | "operation_definition_updated"
    | "operation_definition_deleted",
  context: Record<string, unknown>,
): Promise<void> {
  if (!logger) {
    throw new Error("audit_logger_unavailable");
  }
  await logger.log({
    level: "info",
    category: "audit",
    eventCode,
    message: eventCode,
    context,
  });
}

/**
 * maneuverOperationRoutes — GET /api/maneuvers, POST /api/maneuvers/:name/execute,
 * GET /api/operations, POST /api/operations/:name/execute,
 * GET /api/operations/runs, GET /api/operations/runs/:id.
 *
 * Sözleşme (test: maneuver-routes.test.ts):
 * - Yetki: admin/teknik (Bearer) VEYA geçerli x-internal-token — fail-closed.
 * - execute: rejected (not_found → 404; missing_param → 400; run_persist_failed
 *   → 503); failed → 422; completed/rolled_back → 200 (status alanıyla).
 * - runs: son N listesi + tek koşu (yok → 404).
 */
export async function maneuverOperationRoutes(
  fastify: FastifyInstance,
  deps: {
    registry: ManeuverRegistry;
    executor: OperationExecutor;
    runStore: IOperationRunStore;
    defs?: IOperationDefinitionStore;
    logger?: TamperLogger;
    internalToken?: string;
  },
): Promise<void> {
  fastify.get("/maneuvers", async (request, reply) => {
    if (!authorizeCommand(request, deps.internalToken)) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    return reply.send({ maneuvers: await deps.registry.list("maneuver") });
  });

  fastify.post("/maneuvers/:name/execute", async (request, reply) => {
    const user = authorizeCommand(request, deps.internalToken);
    if (!user) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    const { name } = request.params as { name: string };
    const body = executeBodySchema.parse(request.body);
    const result = await executeWithTimeout(
      deps.executor,
      "maneuver",
      name,
      body.params,
      {
        ...(body.deviceIds !== undefined ? { deviceIds: body.deviceIds } : {}),
        ...(body.timer !== undefined ? { timer: body.timer } : {}),
        trigger: "manual",
        createdBy: user.username,
        ...(traceFrom(request) !== undefined
          ? { traceId: traceFrom(request) }
          : {}),
      },
    );
    if (result === "timeout") {
      return reply.status(202).send({ status: "running" });
    }
    return replyFor(reply, result);
  });

  fastify.get("/operations", async (request, reply) => {
    if (!authorizeCommand(request, deps.internalToken)) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    return reply.send({ operations: await deps.registry.list("operation") });
  });

  fastify.post("/operations/:name/execute", async (request, reply) => {
    const user = authorizeCommand(request, deps.internalToken);
    if (!user) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    const { name } = request.params as { name: string };
    const body = executeBodySchema.parse(request.body);
    const result = await executeWithTimeout(
      deps.executor,
      "operation",
      name,
      body.params,
      {
        ...(body.deviceIds !== undefined ? { deviceIds: body.deviceIds } : {}),
        ...(body.timer !== undefined ? { timer: body.timer } : {}),
        trigger: "manual",
        createdBy: user.username,
        ...(traceFrom(request) !== undefined
          ? { traceId: traceFrom(request) }
          : {}),
      },
    );
    if (result === "timeout") {
      return reply.status(202).send({ status: "running" });
    }
    return replyFor(reply, result);
  });

  fastify.get("/operations/runs", async (request, reply) => {
    if (!authorizeCommand(request, deps.internalToken)) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    const limit = 20;
    const runs = await deps.runStore.listRecent(limit);
    return reply.send({ runs });
  });

  fastify.get("/operations/runs/:id", async (request, reply) => {
    if (!authorizeCommand(request, deps.internalToken)) {
      return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
    }
    const { id } = request.params as { id: string };
    const run = await deps.runStore.findById(id);
    if (!run) {
      return reply.status(404).send({ error: "run_not_found" });
    }
    return reply.send({ run });
  });

  // ── Tanım YÖNETİMİ (yalnız admin — §11.2) ────────────────────────────────
  // Kayıtlar persist anında strict zod şemalarıyla doğrulanır (bozuk tanım →
  // 400); audit fail-closed: audit yazılamazsa tanım işlemi REDDEDİLİR.

  const registerDefinitionCrud = (
    kind: "maneuver" | "operation",
    schema: typeof maneuverRecordSchema | typeof operationRecordSchema,
  ): void => {
    const prefix = kind === "maneuver" ? "maneuvers" : "operations";

    fastify.post(`/${prefix}`, async (request, reply) => {
      if (!deps.defs) {
        return reply.status(503).send({ error: "definition_store_unavailable" });
      }
      const user = authorizeAdmin(request);
      if (!user) {
        return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
      }
      const parsed = schema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ error: "invalid_definition" });
      }
      const definition = parsed.data;
      try {
        await auditFailClosed(deps.logger, "operation_definition_created", {
          kind,
          name: (definition as { name: string }).name,
          updatedBy: user.username,
        });
        await deps.defs.create(kind, definition, user.username);
      } catch (err) {
        const reason = String(err);
        if (reason.includes("already_exists")) {
          return reply.status(409).send({ error: "already_exists" });
        }
        return reply.status(500).send({ error: "definition_persist_failed" });
      }
      return reply.status(201).send({ name: (definition as { name: string }).name });
    });

    fastify.put(`/${prefix}/:name`, async (request, reply) => {
      if (!deps.defs) {
        return reply.status(503).send({ error: "definition_store_unavailable" });
      }
      const user = authorizeAdmin(request);
      if (!user) {
        return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
      }
      const { name } = request.params as { name: string };
      const parsed = schema.safeParse(request.body);
      if (!parsed.success || (parsed.data as { name: string }).name !== name) {
        return reply.status(400).send({ error: "invalid_definition" });
      }
      try {
        await auditFailClosed(deps.logger, "operation_definition_updated", {
          kind,
          name,
          updatedBy: user.username,
        });
        await deps.defs.update(kind, name, parsed.data, user.username);
      } catch {
        return reply.status(500).send({ error: "definition_persist_failed" });
      }
      return reply.status(200).send({ name });
    });

    fastify.delete(`/${prefix}/:name`, async (request, reply) => {
      if (!deps.defs) {
        return reply.status(503).send({ error: "definition_store_unavailable" });
      }
      const user = authorizeAdmin(request);
      if (!user) {
        return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
      }
      const { name } = request.params as { name: string };
      try {
        await auditFailClosed(deps.logger, "operation_definition_deleted", {
          kind,
          name,
          updatedBy: user.username,
        });
        await deps.defs.setEnabled(kind, name, false, user.username);
      } catch (err) {
        if (String(err).includes("not_found")) {
          return reply.status(404).send({ error: "not_found" });
        }
        return reply.status(500).send({ error: "definition_persist_failed" });
      }
      return reply.status(200).send({ name });
    });
  };

  registerDefinitionCrud("maneuver", maneuverRecordSchema);
  registerDefinitionCrud("operation", operationRecordSchema);
}
