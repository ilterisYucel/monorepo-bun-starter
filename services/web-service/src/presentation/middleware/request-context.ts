import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest, HookHandlerDoneFunction } from "fastify";

/**
 * RequestContext — istek başına correlationId bağlamı (AsyncLocalStorage).
 * `run(id, fn)` içindeki tüm senkron/asenkron zincir aynı id'yi görür.
 */
export class RequestContext {
  private readonly storage = new AsyncLocalStorage<string>();

  /** fn'i verilen correlationId bağlamında çalıştırır — sonucu iletir. */
  run<T>(correlationId: string, fn: () => T): T {
    return this.storage.run(correlationId, fn);
  }

  /** Geçerli correlationId (sorgu) — bağlam dışında undefined. */
  current(): string | undefined {
    return this.storage.getStore();
  }
}

/**
 * onRequest kancası üretir:
 * - `X-Request-Id` başlığı varsa (trim sonrası boş değilse) aynen kullanılır
 *   ve yankılanır; yoksa üretilir.
 * - İşleyicinin tamamı context.run(id, done) ile sarmalanır — route'lar
 *   `context.current()` ile aynı id'yi görür.
 * - id `request.correlationId` üzerinde de taşınır (hata sınırı için).
 */
export function createRequestIdHook(
  context: RequestContext,
  generateId?: () => string,
) {
  const generate = generateId ?? (() => randomUUID());

  return function requestIdHook(
    request: FastifyRequest,
    reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ): void {
    const header = request.headers["x-request-id"];
    const correlationId =
      typeof header === "string" && header.trim().length > 0
        ? header
        : generate();
    (request as unknown as { correlationId?: string }).correlationId =
      correlationId;
    reply.header("x-request-id", correlationId);
    context.run(correlationId, done);
  };
}
