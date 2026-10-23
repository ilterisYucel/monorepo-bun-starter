import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { hubTunnelPlugin } from "./plugin";
import type { HubTunnelPluginOptions } from "./plugin";

function jsonResponse(data: unknown): Response {
  return { ok: true, status: 200, json: async () => data } as unknown as Response;
}

async function buildApp(options: Partial<HubTunnelPluginOptions> = {}) {
  const app = Fastify();
  await app.register(hubTunnelPlugin, {
    baseUrl: "http://hub:5003",
    token: "ct",
    ...options,
  });
  return app;
}

describe("hubTunnelPlugin", () => {
  it("iki config alanıyla takılır ve hubTunnel decorator'ını sunar", async () => {
    const app = await buildApp();
    expect(app.hubTunnel).toBeDefined();
    expect(typeof app.hubTunnel.access).toBe("function");
    expect(typeof app.hubTunnel.peers).toBe("function");
    expect(typeof app.hubTunnel.openSession).toBe("function");
    await app.close();
  });

  it("decorator enjekte edilen fetch ile çalışır (app-agnostik)", async () => {
    const calls: string[] = [];
    const app = await buildApp({
      fetchImpl: (async (input: RequestInfo | URL) => {
        calls.push(String(input));
        return jsonResponse({ peers: [{ peerId: "p-1" }] });
      }) as unknown as typeof fetch,
    });
    const peers = await app.hubTunnel.peers();
    expect(peers[0]?.peerId).toBe("p-1");
    expect(calls[0]).toBe("http://hub:5003/peers");
    await app.close();
  });
});
