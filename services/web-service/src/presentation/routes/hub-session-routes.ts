import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { User } from "@gd-monorepo/shared-types";
import type { HubConsumerClient } from "../../infrastructure/hub-tunnel";

export interface HubSessionRoutesDeps {
  readonly client: HubConsumerClient;
  /** Oturum cookie adı (hub ile aynı olmalı). */
  readonly cookieName: string;
  /** Container/peer'ın hub servis kimliği (redirect için). */
  readonly serviceId: string;
}

function statusForKind(kind: string): number {
  if (kind === "not_found") return 404;
  if (kind === "transient") return 503;
  if (kind === "forbidden") return 403;
  return 500;
}

/**
 * hub-session-routes — kullanıcı adına hub-servis oturumu açar ve cookie set eder.
 *
 * RBAC kimliği `request.user`'dan gelir (global auth hook). Hub consumer token'ı
 * web-service'te kalır; tarayıcı yalnız `tunnel_session` cookie'si taşır.
 */
export async function hubSessionRoutes(
  fastify: FastifyInstance,
  deps: HubSessionRoutesDeps,
): Promise<void> {
  fastify.post(
    "/:peerId/session",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { peerId } = request.params as { peerId: string };
      const user = (request as unknown as { user?: User }).user;
      if (!user) {
        return reply.status(401).send({ error: "Kimlik gerekli" });
      }

      let session: Awaited<ReturnType<HubConsumerClient["openSession"]>>;
      try {
        session = await deps.client.openSession({
          peerId,
          user: {
            id: user.id,
            username: user.username,
            role: String(user.role),
          },
          remoteIp: request.ip,
        });
      } catch (error) {
        const status = (error as { status?: number }).status;
        return reply
          .status(status !== undefined ? statusForKind("transient") : 502)
          .send({ error: "hub_session_failed" });
      }

      let cookie = `${deps.cookieName}=${session.token}; Path=/peers; HttpOnly; SameSite=Lax`;
      if (request.protocol === "https") cookie += "; Secure";
      reply.header("set-cookie", cookie);
      return reply.send({
        sessionId: session.sessionId,
        expiresInSec: session.expiresInSec,
        redirectUrl: `/peers/${peerId}/services/${deps.serviceId}/`,
      });
    },
  );
}
