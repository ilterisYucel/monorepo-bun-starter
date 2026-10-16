import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { User } from "@gd-monorepo/shared-types";
import type { SessionGateway, TunnelProxy, PathAllowlist } from "@gd-monorepo/ws-tunnel";
import { isPathAllowed } from "@gd-monorepo/ws-tunnel";
import { FastifyStreamSink } from "../../infrastructure/container-session/fastify-stream-sink";
import { toTunnelUser } from "../../infrastructure/container-session/session-user-map";
import type { FieldRegistry } from "../../infrastructure/field-uplink/field-registry";

/**
 * peer-service-routes — jenerik peer servis KEŞFİ ve OPAK erişimi
 * (WS-TUNNEL-OPAK-SERVIS-ERISIMI-MIMARISI.md §6.2).
 *
 * - Keşif (Akış B): `GET /peers`, `GET /peers/:peerId/services` — hub'ın kendi API'si.
 * - Erişim (Akış A): `/peers/:peerId/services/:serviceId/*` → prefix strip → mevcut
 *   opak proxy; hub servisin İÇİNİ bilmez (yol/semantik yorumlanmaz).
 *
 * Auth/RBAC/audit hub'da; servis semantiği ASLA. Oturum peer başına açılır/yeniden
 * kullanılır (SessionGateway).
 */

/** Ortak erişim bağlamı — bugün path parametrelerinden; A4'te Host başlığından. */
export interface AccessContext {
  readonly peerId: string;
  readonly serviceId: string;
}

/**
 * İstekten peer/servis bağlamını çözer (tek nokta — A4 hazırlığı).
 * Bugün path parametreleri; host-based geçişte aynı sözleşme Host'tan beslenir.
 */
export function resolveAccessContext(
  request: FastifyRequest,
): AccessContext | undefined {
  const params = request.params as { peerId?: string; serviceId?: string };
  if (!params.peerId || !params.serviceId) return undefined;
  return { peerId: params.peerId, serviceId: params.serviceId };
}

const FORWARD_HEADERS = new Set([
  "accept",
  "content-type",
  "user-agent",
  "accept-language",
  "cookie",
]);

function forwardHeaders(
  headers: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!FORWARD_HEADERS.has(key.toLowerCase())) continue;
    if (value === undefined) continue;
    out[key] = Array.isArray(value) ? value.join(", ") : value;
  }
  return out;
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

export interface PeerServiceRoutesDeps {
  registry: FieldRegistry;
  gateway: SessionGateway;
  tunnelProxy: TunnelProxy;
  /** Deployment-bazlı allowlist — yoksa varsayılanlar. */
  pathAllowlist?: PathAllowlist;
}

/**
 * Peer/servis için oturum açar veya mevcut oturumu yeniden kullanır.
 * Dönüş: hata kodu (yoksa undefined) veya kullanılabilir oturum.
 */
async function ensureSession(
  deps: PeerServiceRoutesDeps,
  peerId: string,
  request: FastifyRequest,
): Promise<
  | { ok: true; session: NonNullable<ReturnType<SessionGateway["sessionForPeer"]>> }
  | { ok: false; error: { kind: string; message: string } }
> {
  const existing = deps.gateway.sessionForPeer(peerId);
  if (existing) return { ok: true, session: existing };

  const user = (request as unknown as { user?: User }).user;
  if (!user) {
    return { ok: false, error: { kind: "unauthorized", message: "Kimlik gerekli" } };
  }
  const result = await deps.gateway.openSession({
    fieldId: peerId,
    peerId,
    user: toTunnelUser(user),
    remoteIp: request.ip,
  });
  if (result.isErr()) {
    return { ok: false, error: result.error() };
  }
  const session = deps.gateway.sessionForPeer(peerId);
  if (!session) {
    return { ok: false, error: { kind: "transient", message: "Oturum kurulamadi" } };
  }
  return { ok: true, session };
}

export async function peerServiceRoutes(
  fastify: FastifyInstance,
  deps: PeerServiceRoutesDeps,
): Promise<void> {
  // --- Akış B: keşif ---
  fastify.get("/peers", async (_request: FastifyRequest, reply: FastifyReply) => {
    const status = deps.registry.connectionStatus();
    const peers = deps.registry.peers().map((peer) => ({
      peerId: peer.peerId,
      peerType: peer.peerType,
      status: status.get(peer.peerId) ?? "idle",
      services: peer.services,
    }));
    return reply.send({ peers });
  });

  fastify.get(
    "/peers/:peerId/services",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { peerId } = request.params as { peerId: string };
      const known = deps.registry.peers().some((peer) => peer.peerId === peerId);
      if (!known) {
        return reply.status(404).send({ error: "Peer bulunamadi" });
      }
      return reply.send({ services: deps.registry.servicesOf(peerId) });
    },
  );

  // --- Akış A: opak erişim (HTTP) ---
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
    url: "/peers/:peerId/services/:serviceId/*",
    config: { compress: false },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const ctx = resolveAccessContext(request);
      if (!ctx) {
        return reply.status(404).send({ error: "Peer/servis bulunamadi" });
      }
      if (!deps.registry.servicesOf(ctx.peerId).some((s) => s.id === ctx.serviceId)) {
        return reply.status(404).send({ error: "Servis duyurulmamis" });
      }
      if (!deps.registry.isConnected(ctx.peerId)) {
        return reply.status(503).send({ error: "Peer bagli degil" });
      }

      const outcome = await ensureSession(deps, ctx.peerId, request);
      if (!outcome.ok) {
        return reply
          .status(statusForKind(outcome.error.kind))
          .send({ error: outcome.error.message });
      }

      const wildcard = (request.params as Record<string, string>)["*"] ?? "";
      const query = request.raw.url?.split("?")[1];
      const path = `/${wildcard}${query ? `?${query}` : ""}`;
      if (!isPathAllowed(path, deps.pathAllowlist)) {
        return reply.status(403).send({ error: "Bu yol tunelden erisime kapali" });
      }

      const requestBody = request.body as Buffer | undefined;
      reply.hijack();
      await deps.tunnelProxy.startHttpStream({
        session: outcome.session,
        method: request.method,
        path,
        headers: forwardHeaders(request.headers),
        raw: new FastifyStreamSink(reply.raw),
        requestBody,
      });
    },
  });

  // --- Akış A: opak erişim (WS köprüsü) — /ws/* konvansiyonu ---
  fastify.get(
    "/peers/:peerId/services/:serviceId/ws/*",
    { websocket: true },
    (socket, request) => {
      const ctx = resolveAccessContext(request);
      if (!ctx || !deps.registry.servicesOf(ctx.peerId).some((s) => s.id === ctx.serviceId)) {
        socket.close(1008, "Servis duyurulmamis");
        return;
      }
      if (!deps.registry.isConnected(ctx.peerId)) {
        socket.close(1008, "Peer bagli degil");
        return;
      }
      const session = deps.gateway.sessionForPeer(ctx.peerId);
      if (!session) {
        socket.close(1008, "Oturum gerekli");
        return;
      }
      const wildcard = (request.params as Record<string, string>)["*"] ?? "";
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
