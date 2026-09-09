import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { User } from "@gd-monorepo/shared-types";
import type { SessionGateway, TunnelProxy } from "@gd-monorepo/ws-tunnel";
import { isPathAllowed, sessionCookieValue } from "@gd-monorepo/ws-tunnel";
import type { PathAllowlist } from "@gd-monorepo/ws-tunnel";
import { FastifyStreamSink } from "../../infrastructure/container-session/fastify-stream-sink";
import { toTunnelUser } from "../../infrastructure/container-session/session-user-map";

const SESSION_COOKIE_NAME = "field_session";
const UI_PATH = "/fields/:fieldId/ui";

const FORWARD_HEADERS = new Set(["accept", "content-type", "user-agent", "accept-language"]);

function forwardHeaders(headers: Record<string, string | string[] | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!FORWARD_HEADERS.has(key.toLowerCase())) continue;
    if (value === undefined) continue;
    out[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return out;
}

function tunnelHeaders(request: FastifyRequest): Record<string, string> {
  const headers = forwardHeaders(request.headers);
  const sessionToken = sessionCookieValue(request.headers.cookie, SESSION_COOKIE_NAME);
  if (sessionToken) {
    headers.cookie = `${SESSION_COOKIE_NAME}=${sessionToken}`;
  }
  return headers;
}

function statusForKind(kind: string): number {
  switch (kind) {
    case "conflict":
      return 409;
    case "forbidden":
      return 403;
    case "unauthorized":
      return 401;
    case "not_found":
      return 404;
    case "transient":
      return 503;
    default:
      return 500;
  }
}

/**
 * Boss tier field oturum + tünel rotaları (BOSS-UYGULAMA-MIMARISI.md §7.4.2).
 * Konteyner modelindeki session-routes'ın birebir karşılığı; farklar:
 * cookie `field_session`, path `/fields/:fid/ui`, allowlist boss'a göre.
 */
export async function fieldSessionRoutes(
  fastify: FastifyInstance,
  deps: { gateway: SessionGateway; tunnelProxy: TunnelProxy },
): Promise<void> {
  fastify.post(
    "/:fieldId/session",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fieldId } = request.params as { fieldId: string };
      const user = (request as unknown as { user: User }).user;
      const result = await deps.gateway.openSession({
        fieldId,
        peerId: fieldId,
        user: toTunnelUser(user),
        remoteIp: request.ip,
      });
      if (result.isErr()) {
        const error = result.error();
        return reply
          .status(statusForKind(error.kind))
          .send({ error: error.message });
      }
      const outcome = result.unwrap();
      let cookie = `${SESSION_COOKIE_NAME}=${outcome.token}; Path=/fields/${fieldId}/ui; HttpOnly; SameSite=Lax`;
      if (request.protocol === "https") cookie += "; Secure";
      reply.header("Set-Cookie", cookie);
      return reply.send({
        sessionId: outcome.sessionId,
        expiresInSec: outcome.expiresInSec,
        redirectUrl: `/fields/${fieldId}/ui/`,
      });
    },
  );

  fastify.delete(
    "/:fieldId/session",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fieldId } = request.params as { fieldId: string };
      const session = deps.gateway.sessionForPeer(fieldId);
      if (!session) {
        return reply.status(404).send({ error: "Acik oturum bulunamadi" });
      }
      deps.gateway.closeSession(session.sessionId, "operator-end");
      return reply.send({ closed: true, sessionId: session.sessionId });
    },
  );
}

export async function fieldTunnelRoutes(
  fastify: FastifyInstance,
  deps: {
    tunnelProxy: TunnelProxy;
    /** Deployment-bazlı allowlist (FIELD_TUNNEL_ALLOWED_PREFIXES) — yoksa §5.6 varsayılanları. */
    pathAllowlist?: PathAllowlist;
  },
): Promise<void> {
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_request, body, done) => done(null, body),
  );
  fastify.addContentTypeParser(
    "*",
    { parseAs: "buffer" },
    (_request, body, done) => done(null, body),
  );

  fastify.route({
    method: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    url: `${UI_PATH}/*`,
    config: { compress: false },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { fieldId } = request.params as { fieldId: string };
      const wildcard = (request.params as Record<string, string>)["*"] ?? "";
      const session = deps.tunnelProxy.authenticate(request.headers.cookie, fieldId);
      if (!session) {
        return reply.status(401).send({ error: "Oturum gerekli" });
      }
      const query = request.raw.url?.split("?")[1];
      const path = `/${wildcard}${query ? `?${query}` : ""}`;
      if (!isPathAllowed(path, deps.pathAllowlist)) {
        return reply
          .status(403)
          .send({ error: "Bu yol tunelden erisime kapali" });
      }
      const requestBody = request.body as Buffer | undefined;
      reply.hijack();
      await deps.tunnelProxy.startHttpStream({
        session,
        method: request.method,
        path,
        headers: tunnelHeaders(request),
        raw: new FastifyStreamSink(reply.raw),
        requestBody,
      });
    },
  });

  fastify.get(
    `${UI_PATH}/ws/*`,
    { websocket: true },
    (socket, request) => {
      const { fieldId } = request.params as { fieldId: string };
      const wildcard = (request.params as Record<string, string>)["*"] ?? "";
      const session = deps.tunnelProxy.authenticate(request.headers.cookie, fieldId);
      if (!session) {
        socket.close(1008, "Oturum gerekli");
        return;
      }
      const query = request.raw.url?.split("?")[1];
      const path = `/ws/${wildcard}${query ? `?${query}` : ""}`;
      if (!isPathAllowed(path, deps.pathAllowlist)) {
        socket.close(1008, "Yasakli yol");
        return;
      }

      const pending: Array<{ data: Buffer; isBinary: boolean }> = [];
      let streamId: number | undefined;
      void deps.tunnelProxy
        .startWsBridge({ session, path, browserSocket: socket })
        .then((id) => {
          if (id === undefined) return;
          streamId = id;
          for (const message of pending.splice(0)) {
            deps.tunnelProxy.sendWsToPeer(streamId, message.data, message.isBinary);
          }
        });

      socket.on("message", (data: Buffer, isBinary: boolean) => {
        const buffer = Buffer.from(data);
        if (streamId === undefined) {
          pending.push({ data: buffer, isBinary });
        } else {
          deps.tunnelProxy.sendWsToPeer(streamId, buffer, isBinary);
        }
      });
      socket.on("close", () => {
        if (streamId !== undefined) {
          deps.tunnelProxy.closeWs(streamId, "browser-closed");
        }
      });
    },
  );
}
