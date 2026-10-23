import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import type { HubConsumerClient } from "../../infrastructure/hub-tunnel";
import { hubSessionRoutes } from "./hub-session-routes";

function makeClient(session = { sessionId: "s-1", token: "jwt-1", expiresInSec: 3600 }) {
  return {
    openSession: vi.fn().mockResolvedValue(session),
  } as unknown as HubConsumerClient & { openSession: ReturnType<typeof vi.fn> };
}

async function buildApp(client: HubConsumerClient, withUser = true) {
  const app = Fastify();
  app.addHook("onRequest", (request, _reply, done) => {
    if (withUser) {
      (request as unknown as { user: unknown }).user = {
        id: "u-1",
        username: "op",
        role: "operator",
      };
    }
    done();
  });
  await app.register(
    async (fastify) => {
      await hubSessionRoutes(fastify, {
        client,
        cookieName: "tunnel_session",
        serviceId: "container-api",
      });
    },
    { prefix: "/api/hub" },
  );
  await app.ready();
  return app;
}

describe("hub-session-routes", () => {
  it("AK-4.1/T-11: oturum açar, cookie set eder, redirect döner", async () => {
    const client = makeClient();
    const app = await buildApp(client);
    const response = await app.inject({
      method: "POST",
      url: "/api/hub/revpi-1/session",
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      sessionId: "s-1",
      expiresInSec: 3600,
      redirectUrl: "/peers/revpi-1/services/container-api/",
    });
    const cookie = response.headers["set-cookie"] as string;
    expect(cookie).toContain("tunnel_session=jwt-1");
    expect(cookie).toContain("Path=/peers");
    expect(client.openSession).toHaveBeenCalledWith({
      peerId: "revpi-1",
      user: { id: "u-1", username: "op", role: "operator" },
      remoteIp: expect.any(String),
    });
  });

  it("kimlik yoksa 401", async () => {
    const app = await buildApp(makeClient(), false);
    const response = await app.inject({
      method: "POST",
      url: "/api/hub/revpi-1/session",
    });
    expect(response.statusCode).toBe(401);
  });
});
