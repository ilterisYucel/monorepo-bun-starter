import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { User } from "@gd-monorepo/shared-types";
import { isPathAllowed, containerSessionCookie } from "@gd-monorepo/ws-tunnel";
import type { TunnelProxy } from "@gd-monorepo/ws-tunnel";
import type { ContainerSessionGateway } from "@gd-monorepo/ws-tunnel";
import { FastifyStreamSink } from "../../infrastructure/container-session/fastify-stream-sink";
import { toTunnelUser } from "../../infrastructure/container-session/session-user-map";

/** İstek başlıklarını hop-by-hop başlıklardan arındırır (proxy ileri iletim). */
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

/**
 * Tünel istek başlıkları: hop-by-hop arındırılmış başlıklar + yalnızca
 * `container_session` cookie'si (field'ın diğer cookie'leri KONTEYNER'e
 * İLETİLMEZ — konteyner tarafı cookie'yle kendi oturum store'una bakar §5.4).
 */
function tunnelHeaders(request: FastifyRequest): Record<string, string> {
  const headers = forwardHeaders(request.headers);
  const sessionToken = containerSessionCookie(request.headers.cookie);
  if (sessionToken) {
    headers.cookie = `container_session=${sessionToken}`;
  }
  return headers;
}

/** Hata kind → HTTP durum eşlemesi (sınır — error-handler ile aynı harita). */
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
 * POST /api/fields/:fieldId/containers/:containerId/session — oturum açılışı
 * (Faz 3 T3.3). `/api/fields` prefix'i altında kaydedilir.
 */
export async function sessionOpenRoute(
  fastify: FastifyInstance,
  deps: { gateway: ContainerSessionGateway },
): Promise<void> {
  fastify.post(
    "/:fieldId/containers/:containerId/session",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fieldId, containerId } = request.params as {
        fieldId: string;
        containerId: string;
      };
      const user = (request as unknown as { user: User }).user;
      if (
        user.role === "teknik" &&
        !(user.fieldIds ?? []).includes(fieldId)
      ) {
        return reply
          .status(403)
          .send({ error: "Bu sahaya erisim izniniz yok" });
      }

      const result = await deps.gateway.openSession({
        fieldId,
        containerId,
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

      let cookie = `container_session=${outcome.token}; Path=/containers/${containerId}/ui; HttpOnly; SameSite=Lax`;
      if (request.protocol === "https") cookie += "; Secure";
      reply.header("Set-Cookie", cookie);
      return reply.redirect(`/containers/${containerId}/ui/`);
    },
  );

  // Faz 5 T5.3 — oturum kapatma (ContainerFrame "Kapat" akışı):
  // `session-end` yayını + audit kapanışı (gateway.closeSession).
  fastify.delete(
    "/:fieldId/containers/:containerId/session",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { fieldId, containerId } = request.params as {
        fieldId: string;
        containerId: string;
      };
      const user = (request as unknown as { user: User }).user;
      if (
        user.role === "teknik" &&
        !(user.fieldIds ?? []).includes(fieldId)
      ) {
        return reply
          .status(403)
          .send({ error: "Bu sahaya erisim izniniz yok" });
      }
      const session = deps.gateway.sessionForContainer(containerId);
      if (!session) {
        return reply.status(404).send({ error: "Acik oturum bulunamadi" });
      }
      deps.gateway.closeSession(session.sessionId, "operator-end");
      return reply.send({ closed: true, sessionId: session.sessionId });
    },
  );
}

/**
 * /containers/:cid/ui/* — cookie doğrulamalı HTTP proxy + WS köprüsü
 * (Faz 3 T3.3 — K3.1/K3.2). Kök seviyede kaydedilir.
 */
export async function tunnelRoutes(
  fastify: FastifyInstance,
  deps: { tunnelProxy: TunnelProxy },
): Promise<void> {
  // İstek gövdesi HAM Buffer olarak alınır (parse edilmez) — tünel gövdeyi
  // BINARY frame'lerle konteynere taşır; Fastify'ın built-in json parser'i
  // akışı tüketirse gövde hiç gidemez (POST asılı kalır — canlı üreme).
  // application/json AYRICA kaydedilir — built-in parser wildcard'a göre
  // önceliklidir ve çakışınca gövde undefined kalır.
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
    url: "/containers/:containerId/ui/*",
    // Faz 5: tünel yanıtları reply.raw ile ham akar — @fastify/compress global
    // onSend'i content-encoding ekleyip ham baytları sıkıştırmadan damgalardı
    // (tarayıcı: ERR_CONTENT_DECODING_FAILED). Bu rotada sıkıştırma KAPALI.
    config: { compress: false },
    handler: async (request: FastifyRequest, reply: FastifyReply) => {
      const { containerId } = request.params as { containerId: string };
      const wildcard = (request.params as Record<string, string>)["*"] ?? "";
      const session = deps.tunnelProxy.authenticate(
        request.headers.cookie,
        containerId,
      );
      if (!session) {
        return reply.status(401).send({ error: "Oturum gerekli" });
      }

      const query = request.raw.url?.split("?")[1];
      const path = `/${wildcard}${query ? `?${query}` : ""}`;
      if (!isPathAllowed(path)) {
        return reply
          .status(403)
          .send({ error: "Bu yol tunelden erisime kapali" });
      }

      // Fastify v5 rawBody'u core'dan kaldirdi — gövde parseAs:"buffer" ile
      // HAM alinir (asagida kurulan wildcard parser); akis tukenmez ve tunel
      // gövde frame'lerini iletebilir.
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
    "/containers/:containerId/ui/ws/*",
    { websocket: true },
    (socket, request) => {
      const { containerId } = request.params as { containerId: string };
      const wildcard = (request.params as Record<string, string>)["*"] ?? "";
      const session = deps.tunnelProxy.authenticate(
        request.headers.cookie,
        containerId,
      );
      if (!session) {
        socket.close(1008, "Oturum gerekli");
        return;
      }
      const query = request.raw.url?.split("?")[1];
      const path = `/ws/${wildcard}${query ? `?${query}` : ""}`;
      if (!isPathAllowed(path)) {
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
            deps.tunnelProxy.sendWsToContainer(streamId, message.data, message.isBinary);
          }
        });

      socket.on("message", (data: Buffer, isBinary: boolean) => {
        const buffer = Buffer.from(data);
        if (streamId === undefined) {
          pending.push({ data: buffer, isBinary });
        } else {
          deps.tunnelProxy.sendWsToContainer(streamId, buffer, isBinary);
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
