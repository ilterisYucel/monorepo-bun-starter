import type { FastifyInstance } from "fastify";
import type { ClaimBootstrap } from "../../../application/claim-bootstrap";
import { jsonBody, statusForKind } from "./http-helpers";

export interface BootstrapRoutesDeps {
  readonly claimBootstrap: ClaimBootstrap;
}

/** Bootstrap claim — peer, tek kullanımlık token'ı kalıcı kimlikle takas eder. */
export function bootstrapRoutes(
  fastify: FastifyInstance,
  deps: BootstrapRoutesDeps,
): void {
  fastify.post("/peers/bootstrap/claim", async (request, reply) => {
    const body = jsonBody(request.body);
    if (typeof body !== "object" || body === null) {
      return reply.status(400).send({ error: "Gecerli JSON govde gerekli" });
    }
    const { peerId, bootstrapToken } = body as {
      peerId?: unknown;
      bootstrapToken?: unknown;
    };
    if (typeof peerId !== "string" || typeof bootstrapToken !== "string") {
      return reply
        .status(400)
        .send({ error: "peerId ve bootstrapToken zorunlu" });
    }
    const result = await deps.claimBootstrap.execute(peerId, bootstrapToken);
    if (result.isErr()) {
      const error = result.error();
      return reply
        .status(statusForKind(error.kind))
        .send({ error: error.message });
    }
    const claimed = result.unwrap();
    return reply.send({
      peerId: claimed.peerId,
      peerSecret: claimed.peerSecret,
    });
  });
}
