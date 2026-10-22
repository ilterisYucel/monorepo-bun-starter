import type { FastifyInstance } from "fastify";
import type { AuthenticateConsumerToken } from "../../../application/authenticate-consumer-token";
import type { RelayControl } from "../../../application/relay-control";
import type { ConsumerChannel } from "../consumer-channel";
import {
  authorizedConsumer,
  bearerToken,
  jsonBody,
  statusForKind,
} from "./http-helpers";

export interface ControlRoutesDeps {
  readonly relay: RelayControl;
  readonly consumerChannel: ConsumerChannel;
  readonly authenticateConsumer: AuthenticateConsumerToken;
}

/** Consumer relay rotaları — `POST /control/:peerId` + `/ws/consumer`. */
export function controlRoutes(
  fastify: FastifyInstance,
  deps: ControlRoutesDeps,
): void {
  fastify.post("/control/:peerId", async (request, reply) => {
    if (!authorizedConsumer(request, reply, deps.authenticateConsumer)) return;
    const { peerId } = request.params as { peerId: string };
    const body = jsonBody(request.body);
    if (typeof body !== "object" || body === null) {
      return reply.status(400).send({ error: "Gecerli JSON govde gerekli" });
    }
    const result = deps.relay.send(peerId, body);
    if (result.isErr()) {
      const error = result.error();
      return reply
        .status(statusForKind(error.kind))
        .send({ error: error.message });
    }
    return reply.send({ delivered: true });
  });

  fastify.get("/ws/consumer", { websocket: true }, (socket, request) => {
    const token = bearerToken(request);
    if (token === undefined || !deps.authenticateConsumer.execute(token)) {
      socket.close(1008, "consumer token gerekli");
      return;
    }
    deps.consumerChannel.add(socket);
  });
}
