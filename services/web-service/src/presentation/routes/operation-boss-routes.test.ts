import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import type { User } from "@gd-monorepo/shared-types";
import type { OperationRequester } from "../../infrastructure/field-uplink/operation-requester";
import { operationBossRoutes } from "./operation-boss-routes";

/**
 * operationBossRoutes sözleşmesi (WS-TUNNEL §5.2 — boss tetikleme ucu):
 * - Yetki admin/teknik + iç token; yoksa 403.
 * - requester yoksa 503.
 * - send argümanları: fieldId, uuid operationId, name, params, traceId.
 * - undefined → 503 operation_timeout; sonuç → 200 {result}.
 */

const ADMIN: User = {
  id: "u-1",
  username: "admin",
  role: "admin",
  name: "admin",
  fieldIds: [],
  mustChangePassword: false,
  createdAt: "",
};

const TEKNIK: User = { ...ADMIN, id: "u-2", username: "teknik", role: "teknik" };

interface Harness {
  requester: { send: ReturnType<typeof vi.fn> };
}

function makeDeps(overrides: { sendImpl?: unknown } = {}): Harness {
  return {
    requester: {
      send: vi.fn(
        overrides.sendImpl ??
          (async () => ({
            type: "operation-result" as const,
            operationId: "op-1",
            status: "completed" as const,
          })),
      ),
    },
  };
}

async function inject(
  deps: Harness | { requester?: undefined },
  options: { user?: User; internalToken?: string; payload?: unknown } = {},
) {
  const app = Fastify();
  await app.register(
    async (fastify) => {
      if (options.user) {
        fastify.addHook("onRequest", async (request) => {
          (request as unknown as { user?: User }).user = options.user;
        });
      }
      await operationBossRoutes(fastify, {
        requester: (deps as Harness).requester as unknown as OperationRequester,
        internalToken: "secret-token",
      });
    },
    { prefix: "/api" },
  );
  return app.inject({
    method: "POST",
    url: "/api/fields/f-1/operations/field_charge/execute",
    headers: {
      ...(options.internalToken !== undefined
        ? { "x-internal-token": options.internalToken }
        : {}),
    },
    ...(options.payload !== undefined ? { payload: options.payload as never } : {}),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("operationBossRoutes (C2b)", () => {
  it("admin → requester.send (uuid operationId + params + trace) → 200 {result}", async () => {
    const deps = makeDeps();
    const res = await inject(deps, {
      user: ADMIN,
      payload: { params: { powerKw: 200 } },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().result.status).toBe("completed");
    const [fieldId, operationId, name, params] = (
      deps.requester.send as ReturnType<typeof vi.fn>
    ).mock.calls[0] as [string, string, string, Record<string, unknown>];
    expect(fieldId).toBe("f-1");
    expect(operationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(name).toBe("field_charge");
    expect(params).toEqual({ powerKw: 200 });
  });

  it("teknik kabul; guest/anonim 403; iç token kabul", async () => {
    expect((await inject(makeDeps(), { user: TEKNIK, payload: {} })).statusCode).toBe(200);
    expect((await inject(makeDeps(), { payload: {} })).statusCode).toBe(403);
    expect(
      (await inject(makeDeps(), { internalToken: "secret-token", payload: {} }))
        .statusCode,
    ).toBe(200);
  });

  it("requester yoksa 503 (tier uyuşmazlığı)", async () => {
    const res = await inject({ requester: undefined }, { user: ADMIN, payload: {} });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe("operation_requester_unavailable");
  });

  it("timeout (undefined) → 503 operation_timeout", async () => {
    const deps = makeDeps({ sendImpl: async () => undefined });
    const res = await inject(deps, { user: ADMIN, payload: {} });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe("operation_timeout");
  });

  it("rejected sonuç AYNEN döner (200 + status)", async () => {
    const deps = makeDeps({
      sendImpl: async () => ({
        type: "operation-result",
        operationId: "op-1",
        status: "rejected",
        reason: "not_found",
      }),
    });
    const res = await inject(deps, { user: ADMIN, payload: {} });
    expect(res.statusCode).toBe(200);
    expect(res.json().result).toMatchObject({ status: "rejected", reason: "not_found" });
  });
});
