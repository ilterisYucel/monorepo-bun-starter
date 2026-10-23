import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import type { TamperLogger } from "@gd-monorepo/tamper-logger";
import type { HubConsumerClient } from "../../infrastructure/hub-tunnel";
import { fieldContainerCommandRoutes } from "./field-container-commands";

/**
 * Field → konteyner komut proxy rotası sözleşmesi (WS4 D3) — P3 hub modu:
 *
 * - POST /api/fields/:f/containers/:c/commands — İNCE proxy: iş mantığı YOK;
 *   konteyner siyah kutudur (execute-multi kontratı hub REST üzerinden opak).
 * - Yetki: admin/teknik (Bearer) VEYA geçerli `x-internal-token` (fail-closed).
 * - Hub access: POST /api/commands/execute-multi + trace + system user başlıkları.
 * - Yanıt: upstream durum kodu + gövde AYNEN geri döner (200/422).
 * - Audit: field_container_command (best-effort — akışı kesmez).
 */

const BODY = {
  commands: [
    { deviceId: "BSC-1", command: "stop" },
    { deviceId: "BSC-2", command: "stop" },
  ],
  mode: "parallel",
  onFailure: "stop",
};

function jsonResponse(status: number, body: unknown): Response {
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  return {
    status,
    arrayBuffer: async () => bytes.buffer,
  } as unknown as Response;
}

function makeDeps(accessImpl?: () => Promise<Response>) {
  const access = vi.fn(
    accessImpl ?? (async () => jsonResponse(200, { results: [] })),
  );
  const log = vi.fn(async () => undefined);
  const client = { access } as unknown as HubConsumerClient & {
    access: ReturnType<typeof vi.fn>;
  };
  const logger = { log } as unknown as TamperLogger;
  return { client, logger, access, log };
}

async function inject(
  deps: ReturnType<typeof makeDeps>,
  body: unknown = BODY,
  headers: Record<string, string> = { "x-internal-token": "secret-token" },
  user?: { id: string; username: string; role: string },
) {
  const app = Fastify();
  if (user) {
    app.addHook("onRequest", (request, _reply, done) => {
      (request as unknown as { user: unknown }).user = user;
      done();
    });
  }
  await app.register(
    async (fastify) => {
      await fieldContainerCommandRoutes(fastify, {
        hubAccess: { client: deps.client, serviceId: "container-api" },
        logger: deps.logger,
        internalToken: "secret-token",
      });
    },
    { prefix: "/api/fields" },
  );
  return app.inject({
    method: "POST",
    url: "/api/fields/f-1/containers/c-1/commands",
    headers,
    payload: body,
  });
}

describe("field-container-commands (D3 — hub)", () => {
  it("yetki yok (token/user yok) → 403; hub'a istek gitmez", async () => {
    const deps = makeDeps();
    const res = await inject(deps, BODY, {});
    expect(res.statusCode).toBe(403);
    expect(deps.access).not.toHaveBeenCalled();
  });

  it("yanlış internal token → 403 (fail-closed)", async () => {
    const deps = makeDeps();
    const res = await inject(deps, BODY, { "x-internal-token": "yanlis" });
    expect(res.statusCode).toBe(403);
    expect(deps.access).not.toHaveBeenCalled();
  });

  it("Bearer admin → kabul; guest → 403", async () => {
    const deps = makeDeps();
    const app = Fastify();
    const user = { id: "u-1", username: "operator", role: "admin" };
    app.addHook("onRequest", (request, _reply, done) => {
      (request as unknown as { user: unknown }).user = user;
      done();
    });
    await app.register(
      async (fastify) => {
        await fieldContainerCommandRoutes(fastify, {
          hubAccess: { client: deps.client, serviceId: "container-api" },
          logger: deps.logger,
          internalToken: undefined,
        });
      },
      { prefix: "/api/fields" },
    );
    const ok = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/commands",
      headers: {},
      payload: BODY,
    });
    expect(ok.statusCode).toBe(200);

    user.role = "guest";
    const denied = await app.inject({
      method: "POST",
      url: "/api/fields/f-1/containers/c-1/commands",
      headers: {},
      payload: BODY,
    });
    expect(denied.statusCode).toBe(403);
  });

  it("hub access: peerId/serviceId/path + trace + system user başlıkları", async () => {
    const deps = makeDeps();
    await inject(deps, BODY, {
      "x-internal-token": "secret-token",
      "x-gd-trace-id": "trace-123",
    });
    expect(deps.access).toHaveBeenCalledWith(
      expect.objectContaining({
        peerId: "c-1",
        serviceId: "container-api",
        path: "/api/commands/execute-multi",
        method: "POST",
        headers: expect.objectContaining({
          "content-type": "application/json",
          "x-gd-trace-id": "trace-123",
          "x-tunnel-user-id": "system",
        }),
        body: JSON.stringify(BODY),
      }),
    );
  });

  it("upstream 200 → gövde aynen", async () => {
    const deps = makeDeps(async () =>
      jsonResponse(200, { results: [{ deviceId: "BSC-1", success: true }] }),
    );
    const res = await inject(deps);
    expect(res.statusCode).toBe(200);
    expect(res.json().results).toHaveLength(1);
  });

  it("upstream 422 → durum kodu + gövde aynen", async () => {
    const deps = makeDeps(async () =>
      jsonResponse(422, { results: [{ success: false, reason: "x" }] }),
    );
    const res = await inject(deps);
    expect(res.statusCode).toBe(422);
    expect(res.json().results[0]).toMatchObject({ success: false });
  });

  it("audit field_container_command — traceId bağlamda", async () => {
    const deps = makeDeps();
    await inject(deps, BODY, {
      "x-internal-token": "secret-token",
      "x-gd-trace-id": "trace-123",
    });
    expect(deps.log).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "audit",
        eventCode: "field_container_command",
        context: expect.objectContaining({ traceId: "trace-123", containerId: "c-1" }),
      }),
    );
  });

  it("audit hatası akışı KESMEZ (best-effort)", async () => {
    const deps = makeDeps();
    deps.log.mockRejectedValue(new Error("audit kapali"));
    const res = await inject(deps);
    expect(res.statusCode).toBe(200);
  });

  it("hub erişim hatası → 502", async () => {
    const deps = makeDeps(async () => {
      throw new Error("hub down");
    });
    const res = await inject(deps);
    expect(res.statusCode).toBe(502);
  });

  it("x-gd-trace-id yoksa üretilir", async () => {
    const deps = makeDeps();
    await inject(deps, BODY, { "x-internal-token": "secret-token" });
    const call = deps.access.mock.calls[0]?.[0] as { headers: Record<string, string> };
    expect(call.headers["x-gd-trace-id"]).toBeTruthy();
  });
});
