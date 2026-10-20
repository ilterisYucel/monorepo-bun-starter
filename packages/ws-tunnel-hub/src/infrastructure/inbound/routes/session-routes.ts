import type { FastifyInstance } from "fastify";
import type { OpenSession } from "../../../application/open-session";
import type { AuthenticateConsumerToken } from "../../../application/authenticate-consumer-token";
import { authorizedConsumer, jsonBody, statusForKind } from "./http-helpers";

export interface SessionRoutesDeps {
  readonly openSession: OpenSession;
  readonly authenticateConsumer: AuthenticateConsumerToken;
}

/** `POST /sessions` — consumer, kullanıcı adına tünel oturumu açar (browser cookie). */
export function sessionRoutes(
  fastify: FastifyInstance,
  deps: SessionRoutesDeps,
): void {
  fastify.post("/sessions", async (request, reply) => {
    if (!authorizedConsumer(request, reply, deps.authenticateConsumer)) return;
    const body = jsonBody(request.body);
    if (typeof body !== "object" || body === null) {
      return reply.status(400).send({ error: "Gecerli JSON govde gerekli" });
    }
    const { peerId, user } = body as {
      peerId?: unknown;
      user?: { id?: unknown; username?: unknown; role?: unknown };
    };
    if (
      typeof peerId !== "string" ||
      typeof user !== "object" ||
      user === null ||
      typeof user.id !== "string" ||
      typeof user.username !== "string" ||
      typeof user.role !== "string"
    ) {
      return reply.status(400).send({ error: "peerId ve user zorunlu" });
    }

    const result = await deps.openSession.execute({
      peerId,
      user: { id: user.id, username: user.username, role: user.role },
      remoteIp: request.ip,
    });
    if (result.isErr()) {
      const error = result.error();
      return reply
        .status(statusForKind(error.kind))
        .send({ error: error.message });
    }
    return reply.status(201).send(result.unwrap());
  });
}
