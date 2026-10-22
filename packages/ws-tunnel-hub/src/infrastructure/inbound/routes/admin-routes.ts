import type { FastifyInstance } from "fastify";
import type { CreateBootstrap } from "../../../application/create-bootstrap";
import type { RevokePeer } from "../../../application/revoke-peer";
import type { AuthenticateConsumerToken } from "../../../application/authenticate-consumer-token";
import {
  authorizedConsumer,
  jsonBody,
  statusForKind,
} from "./http-helpers";

export interface AdminRoutesDeps {
  readonly createBootstrap: CreateBootstrap;
  readonly revokePeer: RevokePeer;
  readonly authenticateConsumer: AuthenticateConsumerToken;
}

/** Admin rotaları — peer oluşturma (bootstrap) + iptal (consumer token). */
export function adminRoutes(
  fastify: FastifyInstance,
  deps: AdminRoutesDeps,
): void {
  fastify.post("/admin/peers", async (request, reply) => {
    if (!authorizedConsumer(request, reply, deps.authenticateConsumer)) return;
    const body = jsonBody(request.body);
    const peerId =
      typeof body === "object" && body !== null
        ? (body as { peerId?: unknown }).peerId
        : undefined;
    if (typeof peerId !== "string") {
      return reply.status(400).send({ error: "peerId zorunlu" });
    }
    const result = await deps.createBootstrap.execute(peerId);
    if (result.isErr()) {
      const error = result.error();
      return reply
        .status(statusForKind(error.kind))
        .send({ error: error.message });
    }
    const issued = result.unwrap();
    return reply.status(201).send({
      peerId: issued.peerId,
      bootstrapToken: issued.bootstrapToken,
      expiresAt: new Date(issued.expiresAt).toISOString(),
    });
  });

  fastify.delete("/admin/peers/:peerId", async (request, reply) => {
    if (!authorizedConsumer(request, reply, deps.authenticateConsumer)) return;
    const { peerId } = request.params as { peerId: string };
    const result = await deps.revokePeer.execute(peerId);
    if (result.isErr()) {
      const error = result.error();
      return reply
        .status(statusForKind(error.kind))
        .send({ error: error.message });
    }
    return reply.send({ revoked: true, peerId });
  });
}
