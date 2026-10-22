import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import type { WebSocket } from "ws";
import type {
  TunnelProxy,
  TunnelUser,
} from "@gd-monorepo/ws-tunnel";
import { sessionCookieValue } from "@gd-monorepo/ws-tunnel";
import type { OpenServiceAccess } from "../../../application/open-service-access";
import type { AuthenticateConsumerToken } from "../../../application/authenticate-consumer-token";
import type { HostMount } from "../../../config/hub-config";
import { NodeStreamSink } from "./node-stream-sink";
import {
  authorizedConsumer,
  bearerToken,
  statusForKind,
} from "./http-helpers";

export interface AccessRoutesDeps {
  readonly openAccess: OpenServiceAccess;
  readonly tunnelProxy: TunnelProxy;
  readonly authenticateConsumer: AuthenticateConsumerToken;
  /** Peer uygulamasının beklediği oturum cookie adı (varsa eklenir). */
  readonly peerSessionCookie?: string;
  /** Tarayıcı oturum cookie'si — bayat cookie tespiti/temizliği için. */
  readonly cookieName: string;
  /**
   * Host header → (peer, servis) kök-montaj haritası (A2). Doluysa `/*`
   * catch-all rotaları eklenir; eşleşen host'ta uygulama kökten sunulur.
   */
  readonly hostMap?: ReadonlyMap<string, HostMount>;
}

/**
 * WS reddinde kapatma nedeni (sorgu — saf): bayat/geçersiz oturum cookie'si
 * varsa "oturum suresi doldu", yoksa "consumer token gerekli".
 */
export function sessionRejectReason(
  cookieHeader: string | undefined,
  cookieName: string,
): string {
  return sessionCookieValue(cookieHeader, cookieName) !== undefined
    ? "oturum suresi doldu"
    : "consumer token gerekli";
}

interface AccessContext {
  readonly peerId: string;
  readonly serviceId: string;
  /** Kök-montaj modu: path prefix strip YOK, tam path upstream'e gider. */
  readonly root: boolean;
}

/**
 * Erişim bağlamı: önce Host (kök-montaj), sonra `/peers/:peerId/services/:serviceId`
 * path parametreleri (geriye dönük path-modu).
 */
function resolveAccessContext(
  request: FastifyRequest,
  hostMap: ReadonlyMap<string, HostMount> | undefined,
): AccessContext | undefined {
  const host = request.headers.host?.toLowerCase();
  if (host !== undefined && hostMap !== undefined) {
    const mount = hostMap.get(host);
    if (mount) {
      return { peerId: mount.peerId, serviceId: mount.serviceId, root: true };
    }
  }
  const params = request.params as {
    peerId?: string;
    serviceId?: string;
  };
  if (!params.peerId || !params.serviceId) return undefined;
  return { peerId: params.peerId, serviceId: params.serviceId, root: false };
}

function wildcardOf(request: FastifyRequest): string {
  return (request.params as Record<string, string>)["*"] ?? "";
}

function queryOf(request: FastifyRequest): string | undefined {
  return request.raw.url?.split("?")[1];
}

/** HTTP upstream path'i (kök-montajda tüm URL, path-modunda wildcard). */
function httpPath(request: FastifyRequest, context: AccessContext): string {
  if (context.root) return request.raw.url ?? "/";
  const query = queryOf(request);
  return `/${wildcardOf(request)}${query ? `?${query}` : ""}`;
}

/** WS upstream path'i (kök-montajda tüm URL, path-modunda `/ws/*`). */
function wsPath(request: FastifyRequest, context: AccessContext): string {
  if (context.root) return request.raw.url ?? "/";
  const query = queryOf(request);
  return `/ws/${wildcardOf(request)}${query ? `?${query}` : ""}`;
}

/**
 * Erişimde oturum kullanıcısı `x-tunnel-user-*` başlıklarından gelir (consumer
 * kimliği doğrulandıktan sonra). Tarayıcı cookie front-door'u P3'te eklenir.
 */
function userFromHeaders(request: FastifyRequest): TunnelUser | undefined {
  const id = request.headers["x-tunnel-user-id"];
  const username = request.headers["x-tunnel-user-username"];
  const role = request.headers["x-tunnel-user-role"];
  if (
    typeof id !== "string" ||
    typeof username !== "string" ||
    typeof role !== "string"
  ) {
    return undefined;
  }
  return { id, username, role };
}

/** İletilmeyen hop-by-hop / hub-içi başlıklar (denylist). */
const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "content-length",
  "transfer-encoding",
  "upgrade",
  "te",
  "trailer",
  "proxy-authorization",
  "proxy-authenticate",
]);

/**
 * Başlıkları upstream'e aktarır (denylist modeli — üçüncü parti uygulamalar
 * kendi auth/özel başlıklarını görür). `authorization` YALNIZCA cookie-oturum
 * yolunda iletilir; consumer-token yolunda sızdırılmaz. `x-tunnel-*` hub-içi
 * başlıklar upstream'e gitmez.
 */
function forwardHeaders(
  headers: Record<string, string | string[] | undefined>,
  options: { dropAuthorization: boolean },
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (HOP_BY_HOP.has(lower)) continue;
    if (lower.startsWith("x-tunnel-")) continue;
    if (options.dropAuthorization && lower === "authorization") continue;
    if (value === undefined) continue;
    out[lower] = Array.isArray(value) ? value.join(", ") : value;
  }
  return out;
}

/**
 * El sıkışmasına özgü başlıklar — upstream WS kendi handshake'ini üretir.
 * `sec-websocket-protocol` TAŞINIR (peer upstream'e subprotocol olarak verir).
 */
const WS_DROP = new Set([
  "sec-websocket-key",
  "sec-websocket-version",
  "sec-websocket-extensions",
  "origin",
]);

/** WS handshake için taşınacak başlıklar — handshake-özgü olanlar düşer. */
function forwardWsHeaders(
  headers: Record<string, string | string[] | undefined>,
  options: { dropAuthorization: boolean },
): Record<string, string> {
  const out = forwardHeaders(headers, options);
  for (const key of Object.keys(out)) {
    if (WS_DROP.has(key)) delete out[key];
  }
  return out;
}

/** Opak erişim rotaları — path-modu `/peers/.../*` + host-map `/*` (HTTP + WS). */
export function accessRoutes(
  fastify: FastifyInstance,
  deps: AccessRoutesDeps,
): void {
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

  const httpHandler = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    const context = resolveAccessContext(request, deps.hostMap);
    if (!context) {
      await reply.status(404).send({ error: "Peer/servis bulunamadi" });
      return;
    }
    const path = httpPath(request, context);

    // Tarayıcı yolu: geçerli oturum cookie'si varsa consumer token aranmaz.
    const cookieSession = deps.tunnelProxy.authenticate(
      request.headers.cookie,
      context.peerId,
    );
    const user = userFromHeaders(request);
    if (cookieSession === undefined) {
      // Bayat/geçersiz oturum cookie'si: süresi dolmuş tarayıcı oturumu.
      // Consumer dalına düşürüp yanıltıcı "Consumer token gerekli" demek
      // yerine dürüst hata + bayat cookie temizliği (fail-closed korunur).
      const staleSession =
        sessionCookieValue(request.headers.cookie, deps.cookieName) !== undefined &&
        bearerToken(request) === undefined;
      if (staleSession) {
        void reply.header(
          "set-cookie",
          `${deps.cookieName}=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax`,
        );
        await reply.status(401).send({ error: "Oturum suresi doldu" });
        return;
      }
      if (!authorizedConsumer(request, reply, deps.authenticateConsumer)) return;
      if (user === undefined) {
        await reply.status(401).send({ error: "Kullanici gerekli" });
        return;
      }
    }

    const grant = await deps.openAccess.authorize({
      peerId: context.peerId,
      serviceId: context.serviceId,
      path,
      session: cookieSession,
      user,
      remoteIp: request.ip,
      rootMount: context.root,
    });
    if (grant.isErr()) {
      const error = grant.error();
      await reply.status(statusForKind(error.kind)).send({ error: error.message });
      return;
    }

    const { session, path: grantPath } = grant.unwrap();
    const headers = forwardHeaders(request.headers, {
      // Consumer-token yolu: authorization upstream'e sızdırılmaz.
      dropAuthorization: cookieSession === undefined,
    });
    // Peer uygulamasının beklediği oturum cookie'sini ekle (opak: hub
    // yalnızca cookie adını config'ten bilir, uygulamayı yorumlamaz).
    if (deps.peerSessionCookie) {
      const sessionCookie = `${deps.peerSessionCookie}=${session.token}`;
      headers.cookie = headers.cookie
        ? `${headers.cookie}; ${sessionCookie}`
        : sessionCookie;
    }
    reply.hijack();
    await deps.tunnelProxy.startHttpStream({
      session,
      method: request.method,
      path: grantPath,
      headers,
      raw: new NodeStreamSink(reply.raw),
      requestBody: request.body as Buffer | undefined,
    });
  };

  const wsHandler = (socket: WebSocket, request: FastifyRequest): void => {
    const context = resolveAccessContext(request, deps.hostMap);
    if (!context) {
      socket.close(1008, "peer/servis eksik");
      return;
    }
    const path = wsPath(request, context);

    const cookieSession = deps.tunnelProxy.authenticate(
      request.headers.cookie,
      context.peerId,
    );
    const user = userFromHeaders(request);
    if (cookieSession === undefined) {
      const token = bearerToken(request);
      if (token === undefined || !deps.authenticateConsumer.execute(token)) {
        socket.close(
          1008,
          sessionRejectReason(request.headers.cookie, deps.cookieName),
        );
        return;
      }
      if (user === undefined) {
        socket.close(1008, "kullanici gerekli");
        return;
      }
    }
    // Upstream WS handshake'ine taşınacak başlıklar (cookie/auth; handshake-özgü
    // olanlar düşer — peer yeni handshake üretir).
    const wsHeaders = forwardWsHeaders(request.headers, {
      dropAuthorization: cookieSession === undefined,
    });

    void deps.openAccess
      .authorize({
        peerId: context.peerId,
        serviceId: context.serviceId,
        path,
        session: cookieSession,
        user,
        remoteIp: request.ip,
        rootMount: context.root,
      })
      .then((grant) => {
        if (grant.isErr()) {
          socket.close(1008, grant.error().message);
          return;
        }
        const { session, path: grantPath } = grant.unwrap();
        const pending: Array<{ data: Buffer; isBinary: boolean }> = [];
        let streamId: number | undefined;
        void deps.tunnelProxy
          .startWsBridge({
            session,
            path: grantPath,
            browserSocket: socket,
            headers: wsHeaders,
          })
          .then((id) => {
            if (id === undefined) return;
            streamId = id;
            for (const message of pending.splice(0)) {
              deps.tunnelProxy.sendWsToPeer(id, message.data, message.isBinary);
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
      });
  };

  fastify.route({
    method: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    url: "/peers/:peerId/services/:serviceId/*",
    config: { compress: false },
    handler: httpHandler,
  });

  fastify.get(
    "/peers/:peerId/services/:serviceId/ws/*",
    { websocket: true },
    wsHandler,
  );

  // A2 host-based: yalnızca hostMap doluysa kök-montaj catch-all rotaları.
  // GET tek rotada HTTP+WS (wsHandler yalnız GET); diğer metotlar ayrı.
  if (deps.hostMap !== undefined && deps.hostMap.size > 0) {
    fastify.route({
      method: "GET",
      url: "/*",
      config: { compress: false },
      handler: httpHandler,
      wsHandler,
    });
    fastify.route({
      method: ["POST", "PUT", "DELETE", "PATCH"],
      url: "/*",
      config: { compress: false },
      handler: httpHandler,
    });
  }
}
