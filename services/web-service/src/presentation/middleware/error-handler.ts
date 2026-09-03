import type {
  FastifyError,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import { DomainError } from "@gd-monorepo/result";

import type { ErrorKind } from "@gd-monorepo/result";

import type { LogEventInput } from "@gd-monorepo/tamper-logger";

import type { RequestContext } from "./request-context";

/** Sınır logunun ihtiyaç duyduğu en dar sözleşme — TamperLogger karşılar. */
export interface BoundaryLogger {
  log(input: LogEventInput): Promise<void>;
}

export interface ErrorHandlerDeps {
  logger: BoundaryLogger;
  context: RequestContext;
}

/** DomainError kind → HTTP durumu (beklenen 4xx; geçici 503). */
const STATUS_BY_KIND: Record<ErrorKind, number> = {
  validation: 400,
  not_found: 404,
  unauthorized: 401,
  forbidden: 403,
  conflict: 409,
  transient: 503,
  fatal: 500,
};

/**
 * Sınır hata işleyicisi — web-service'in TEK log noktası (T0.6).
 * Her hata bir kez loglanır; yanıt iç yapıyı (stack, ham mesaj) sızdırmaz.
 */
export function createErrorHandler(deps: ErrorHandlerDeps) {
  const { logger, context } = deps;

  return async function errorHandler(
    error: FastifyError,
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> {
    const correlationId =
      (request as unknown as { correlationId?: string }).correlationId ??
      context.current();

    if (error instanceof ZodError) {
      await logBoundary(logger, {
        correlationId,
        category: "app",
        level: "warn",
        eventCode: "request_rejected",
        message: "İstek doğrulama hatası",
        context: { issues: error.issues.map((i) => i.message) },
      });
      return reply.status(400).send({ error: error.flatten() });
    }

    if (error instanceof DomainError) {
      const security =
        error.kind === "unauthorized" || error.kind === "forbidden";
      await logBoundary(logger, {
        correlationId,
        category: security ? "security" : "app",
        level: error.kind === "fatal" ? "fatal" : security ? "warn" : error.kind === "transient" ? "error" : "warn",
        eventCode: error.kind === "transient" || error.kind === "fatal" ? "request_failed" : "request_rejected",
        message: error.message,
        context: { code: error.code, kind: error.kind },
      });
      return reply
        .status(STATUS_BY_KIND[error.kind] ?? 500)
        .send({ error: error.message, code: error.code });
    }

    await logBoundary(logger, {
      correlationId,
      category: "app",
      level: "error",
      eventCode: "request_failed",
      message: "Beklenmeyen istek hatası",
      context: { error: error instanceof Error ? error.message : String(error) },
    });
    return reply.status(500).send({ error: "Internal server error" });
  };
}

/** Sınır logu — log() hatası istemciye yansımaz (sink sorunu sınırı bozmaz). */
async function logBoundary(
  logger: BoundaryLogger,
  input: LogEventInput,
): Promise<void> {
  try {
    await logger.log(input);
  } catch {
    // Audit sink fail-closed ise sınır zaten reddedilmiş bir isteği taşır —
    // log hatası istemci yanıtını değiştirmez.
  }
}
