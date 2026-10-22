import type { FastifyReply, FastifyRequest } from "fastify";
import type { AuthenticateConsumerToken } from "../../../application/authenticate-consumer-token";

/** Authorization: Bearer <token> değerini çözer. */
export function bearerToken(request: FastifyRequest): string | undefined {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return undefined;
  return authorization.slice(7);
}

/** Consumer token doğrular; başarısızsa 401 yazıp false döner. */
export function authorizedConsumer(
  request: FastifyRequest,
  reply: FastifyReply,
  authenticate: AuthenticateConsumerToken,
): boolean {
  const token = bearerToken(request);
  if (token === undefined || !authenticate.execute(token)) {
    void reply.status(401).send({ error: "Consumer token gerekli" });
    return false;
  }
  return true;
}

/** Gövdeyi normalize eder (global `*` buffer parser'ı nedeniyle Buffer gelebilir). */
export function jsonBody(body: unknown): unknown {
  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString());
    } catch {
      return undefined;
    }
  }
  return body;
}

/** DomainError.kind → HTTP durum kodu. */
export function statusForKind(kind: string): number {
  switch (kind) {
    case "validation":
      return 400;
    case "unauthorized":
      return 401;
    case "forbidden":
      return 403;
    case "not_found":
      return 404;
    case "conflict":
      return 409;
    case "transient":
      return 503;
    default:
      return 500;
  }
}
