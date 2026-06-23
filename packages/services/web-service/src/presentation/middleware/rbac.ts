import type { FastifyRequest, FastifyReply } from "fastify";
import type { Role, User } from "@gd-monorepo/shared-types";
import type { ITokenService } from "../../domain/services/ITokenService";

const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  "/api/auth/users": ["admin"],
  "/api/data/": ["admin", "teknik", "guest"],
};

const PUBLIC_PREFIXES = [
  "/health",
  "/docs",
  "/api/auth/login",
  "/api/auth/refresh",
];

export function createRbacHook(tokens: ITokenService) {
  return async function rbacPreHandler(
    request: FastifyRequest,
    reply: FastifyReply,
  ) {
    const path = request.url;

    if (PUBLIC_PREFIXES.some((p) => path.startsWith(p))) return;

    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return reply.status(401).send({ error: "Yetkilendirme gerekli" });
    }

    const token = authHeader.slice(7);
    let user: User;
    try {
      user = await tokens.verifyAccess(token);
    } catch {
      return reply
        .status(401)
        .send({ error: "Gecersiz veya suresi dolmus token" });
    }

    (request as unknown as { user: User }).user = user;

    for (const [prefix, roles] of Object.entries(ROUTE_PERMISSIONS)) {
      if (path.startsWith(prefix)) {
        if (!roles.includes(user.role)) {
          return reply
            .status(403)
            .send({ error: "Bu islem icin yetkiniz yok" });
        }
        break;
      }
    }
  };
}
