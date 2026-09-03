import type { FastifyInstance } from "fastify";
import type { IContainerProxy } from "@gd-monorepo/platform-container-access";

export async function containerWsRoutes(
  fastify: FastifyInstance,
  deps: { containerProxy: IContainerProxy },
): Promise<void> {
  // Faz 1 T1.1: service token doğrulaması upgrade ÖNCESİ yapılır —
  // hash'i registry'de bulunmayan token 401 alır (kabul kriteri).
  fastify.get(
    "/ws/container",
    {
      websocket: true,
      onRequest: async (request, reply) => {
        const auth = request.headers.authorization;
        if (!auth?.startsWith("Bearer ")) {
          return reply.status(401).send({ error: "Service token gerekli" });
        }
        const token = auth.slice(7);
        const known = await deps.containerProxy.authenticateContainerToken(token);
        if (!known) {
          return reply.status(401).send({ error: "Gecersiz service token" });
        }
        (request as unknown as { serviceToken?: string }).serviceToken = token;
      },
    },
    (ws, req) => {
      console.log("[ContainerWs] Konteyner WebSocket baglantisi");

      const token = (req as unknown as { serviceToken?: string }).serviceToken;

      ws.on("message", (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === "register" && msg.containerId) {
            // containerUrl self-reported'dır — bilgi amaçlı; URL kayıt
            // defterinden okunur (SSRF yüzeyi kapalı).
            void deps.containerProxy.registerContainer(
              msg.containerId,
              ws,
              token,
            );
          }
        } catch {
          // invalid
        }
      });

      ws.on("close", () => {
        console.log("[ContainerWs] Konteyner baglantisi kapandi");
      });
    },
  );
}
