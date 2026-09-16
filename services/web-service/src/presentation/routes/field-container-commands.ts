// Field → konteyner komut proxy rotası (WS4 D3).
//
// İNCE proxy: iş mantığı YOKTUR — konteyner siyah kutudur. Field yalnızca
// (containerId, deviceId, command, params) taşır; komut semantiği, config
// çözümleme ve doğrulama KONTEYNER web-service'inde kalır (katman sızmaz).
// Yanıt (durum kodu + per-step sonuçlar) tünel üzerinden AYNEN geri döner.

import type { FastifyInstance, FastifyRequest } from "fastify";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { SessionGateway, TunnelProxy } from "@gd-monorepo/ws-tunnel";
import type { IContainerProxy } from "@gd-monorepo/platform-container-access";
import type { TamperLogger } from "@gd-monorepo/tamper-logger";
import type { User } from "@gd-monorepo/shared-types";
import { CollectingStreamSink } from "../../infrastructure/container-session/collecting-stream-sink";

const telemetryEntrySchema = z.object({
  name: z.string().min(1),
  value: z.union([z.number(), z.string(), z.boolean()]),
  unit: z.string().default(""),
});

const commandStepSchema = z
  .object({
    deviceId: z.string().min(1),
    command: z.string().optional(),
    telemetries: z.array(telemetryEntrySchema).optional(),
    params: z.record(z.unknown()).optional(),
  })
  .refine(
    (d) => d.command || (d.telemetries && d.telemetries.length > 0),
    "command or telemetries required",
  );

const bodySchema = z.object({
  commands: z.array(commandStepSchema).min(1),
  mode: z.enum(["parallel", "sequential"]).default("parallel"),
  onFailure: z.enum(["stop", "continue"]).default("stop"),
});

function traceFrom(request: FastifyRequest): string {
  const value = request.headers["x-gd-trace-id"];
  if (typeof value === "string" && value.length > 0) return value;
  return `field-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Timing-safe gizli karşılaştırma — internal token (güvenlik sınırı). */
function tokenMatches(actual: string, expected: string): boolean {
  const a = Buffer.from(actual);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Programatik oturum kullanıcısı — audit "system" açıcı olarak kaydeder. */
const SYSTEM_USER: User = {
  id: "system",
  username: "system",
  role: "admin",
  name: "system",
  fieldIds: [],
  mustChangePassword: false,
  createdAt: "",
};

/** Komut proxy yetkilendirmesi: admin/teknik veya geçerli internal token. */
function authorize(
  request: FastifyRequest,
  internalToken: string | undefined,
): User | undefined {
  if (
    internalToken &&
    typeof request.headers["x-internal-token"] === "string" &&
    tokenMatches(request.headers["x-internal-token"], internalToken)
  ) {
    return SYSTEM_USER;
  }
  const user = (request as unknown as { user?: User }).user;
  if (!user) return undefined;
  if (user.role !== "admin" && user.role !== "teknik") return undefined;
  return user;
}

/**
 * fieldContainerCommandRoutes — POST /:fieldId/containers/:containerId/commands.
 *
 * Sözleşme (test: field-container-commands.test.ts):
 * - Yetki: admin/teknik (Bearer) VEYA geçerli `x-internal-token` (management-
 *   service programatik kanalı — fail-closed: token env'de yoksa bu yol KAPALI).
 * - Konteyner bağlantısı "connected" değilse 503; oturum/stream açılmaz.
 * - Oturum: mevcut peer oturumu yeniden kullanılır; yoksa system kullanıcısıyla
 *   programatik açılır (fail-closed: açılamazsa 503).
 * - Tünel isteği: POST /api/commands/execute-multi + trace + container_session
 *   cookie; yanıt (durum kodu + gövde) AYNEN proxy'lenir.
 * - Audit: field_container_command — best-effort (komut akışını kesmez).
 */
export async function fieldContainerCommandRoutes(
  fastify: FastifyInstance,
  deps: {
    containerProxy: IContainerProxy;
    gateway: SessionGateway;
    tunnelProxy: TunnelProxy;
    logger: TamperLogger | undefined;
    /** Internal servis token'ı — env FIELD_INTERNAL_API_TOKEN. */
    internalToken?: string;
  },
): Promise<void> {
  fastify.post(
    "/:fieldId/containers/:containerId/commands",
    async (request: FastifyRequest, reply) => {
      const { fieldId, containerId } = request.params as {
        fieldId: string;
        containerId: string;
      };
      const body = bodySchema.parse(request.body);

      const authorized = authorize(request, deps.internalToken);
      if (!authorized) {
        return reply.status(403).send({ error: "Bu islem icin yetkiniz yok" });
      }

      const state = deps.containerProxy.connectionStatus().get(containerId);
      if (state !== "connected") {
        return reply
          .status(503)
          .send({ error: "container_not_connected", containerId });
      }

      const existing = deps.gateway.sessionForPeer(containerId);
      let token: string;
      if (existing) {
        token = existing.token;
      } else {
        const result = await deps.gateway.openSession({
          fieldId,
          peerId: containerId,
          user: SYSTEM_USER,
          remoteIp: "127.0.0.1",
        });
        if (result.isErr()) {
          return reply.status(503).send({
            error: "session_open_failed",
            kind: result.error().kind,
          });
        }
        token = result.unwrap().token;
      }

      const traceId = traceFrom(request);
      const sink = new CollectingStreamSink();
      try {
        await deps.tunnelProxy.startHttpStream({
          session: {
            ...(existing ?? {
              sessionId: "programatic",
              peerId: containerId,
              user: SYSTEM_USER,
              peerRole: "admin",
              createdAt: 0,
              lastActivityAt: 0,
              bytesIn: 0,
              bytesOut: 0,
            }),
            token,
          },
          method: "POST",
          path: "/api/commands/execute-multi",
          headers: {
            "content-type": "application/json",
            "x-gd-trace-id": traceId,
            cookie: `container_session=${token}`,
          },
          raw: sink,
          requestBody: Buffer.from(JSON.stringify(body)),
        });
        const collected = await sink.completed();
        const parsed = parseUpstreamBody(collected.body);

        await audit(deps.logger, {
          fieldId,
          containerId,
          deviceIds: body.commands.map((c) => c.deviceId),
          traceId,
          statusCode: collected.statusCode,
          parsed,
        });

        return reply.status(collected.statusCode).send(parsed);
      } catch (error) {
        console.warn(
          `[FieldContainerCommands] ${containerId} komut proxy basarisiz`,
          error,
        );
        return reply.status(502).send({ error: "tunnel_stream_failed" });
      }
    },
  );
}

/** Upstream gövdesi JSON parse; boş gövde → boş sonuç. */
function parseUpstreamBody(body: Buffer): unknown {
  if (body.length === 0) return { results: [] };
  try {
    return JSON.parse(body.toString("utf-8")) as unknown;
  } catch {
    return { results: [], error: "invalid_upstream_response" };
  }
}

/** Komut proxy audit'i — best-effort (hata akışı kesmez). */
async function audit(
  logger: TamperLogger | undefined,
  input: {
    fieldId: string;
    containerId: string;
    deviceIds: string[];
    traceId: string;
    statusCode: number;
    parsed: unknown;
  },
): Promise<void> {
  if (!logger) return;
  try {
    await logger.log({
      level: input.statusCode < 300 ? "info" : "error",
      category: "audit",
      eventCode: "field_container_command",
      message: "Field konteyner komutu proxy",
      context: {
        fieldId: input.fieldId,
        containerId: input.containerId,
        deviceIds: input.deviceIds,
        traceId: input.traceId,
        statusCode: input.statusCode,
        ...(typeof input.parsed === "object" && input.parsed !== null
          ? { results: input.parsed }
          : {}),
      },
    });
  } catch {
    // audit başarısız olsa da komut akışı bozulmaz
  }
}
