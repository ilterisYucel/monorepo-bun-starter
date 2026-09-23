import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import type { ManeuverRecord, User } from "@gd-monorepo/shared-types";
import { ManeuverRegistry } from "@gd-monorepo/platform-commands";
import type {
  IOperationRunStore,
  OperationExecutor,
  OperationRunResult,
} from "@gd-monorepo/platform-commands";
import { maneuverOperationRoutes } from "./maneuver-routes";

/**
 * Manevra/operasyon rotaları sözleşmesi (KOMUT §4, §8 — B3):
 *
 * - Yetki: admin/teknik (Bearer) VEYA geçerli x-internal-token; yoksa 403
 *   (fail-closed: internalToken tanımsızsa iç token yolu KAPALI).
 * - GET /maneuvers + /operations: registry listesi.
 * - POST /:name/execute: executor'a doğru argümanlar (params, deviceIds,
 *   trigger manual, createdBy kullanıcı, traceId başlıktan); HTTP eşlemesi:
 *   not_found 404 / missing_param 400 / run_persist_failed 503 /
 *   failed 422 / completed+rolled_back 200.
 * - GET /operations/runs + /runs/:id: store okuma; yok 404.
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

const GUEST: User = { ...ADMIN, id: "u-2", username: "guest", role: "guest" };

const TEKNIK: User = { ...ADMIN, id: "u-3", username: "teknik", role: "teknik" };

function maneuverRecord(): ManeuverRecord {
  return {
    name: "pcs_charge",
    label: "PCS Şarj",
    mode: "parallel",
    steps: [{ deviceTypes: ["pcs"], command: "charge" }],
  };
}

interface Harness {
  registry: ManeuverRegistry;
  executor: {
    execute: ReturnType<typeof vi.fn>;
  };
  runStore: {
    listRecent: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
  };
}

function makeDeps(overrides: { executeImpl?: unknown } = {}): Harness {
  const execute = vi.fn(
    overrides.executeImpl ??
      (async (): Promise<OperationRunResult> => ({
        runId: "run-1",
        kind: "maneuver",
        name: "pcs_charge",
        status: "completed",
        outcomes: [],
      })),
  );
  const listRecent = vi.fn(async () => []);
  const findById = vi.fn(async () => undefined);
  return {
    registry: new ManeuverRegistry({ maneuvers: [maneuverRecord()] }),
    executor: { execute } as unknown as OperationExecutor,
    runStore: {
      listRecent,
      findById,
      begin: vi.fn(),
      finish: vi.fn(),
    } as unknown as IOperationRunStore,
  };
}

async function inject(
  method: "GET" | "POST",
  url: string,
  deps: Harness,
  options: {
    user?: User;
    internalToken?: string;
    payload?: unknown;
  } = {},
) {
  const app = Fastify();
  await app.register(
    async (fastify) => {
      if (options.user) {
        fastify.addHook("onRequest", async (request) => {
          (request as unknown as { user?: User }).user = options.user;
        });
      }
      await maneuverOperationRoutes(fastify, {
        registry: deps.registry,
        executor: deps.executor,
        runStore: deps.runStore,
        internalToken: "secret-token",
      });
    },
    { prefix: "/api" },
  );
  return app.inject({
    method,
    url,
    ...(options.payload !== undefined
      ? { payload: options.payload as never }
      : {}),
    headers: {
      ...(options.internalToken !== undefined
        ? { "x-internal-token": options.internalToken }
        : {}),
    },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("maneuver/operation rotaları — yetki", () => {
  it("yetki yok → 403 (tüm uçlar)", async () => {
    const deps = makeDeps();
    expect((await inject("GET", "/api/maneuvers", deps)).statusCode).toBe(403);
    expect(
      (await inject("GET", "/api/operations/runs", deps)).statusCode,
    ).toBe(403);
    expect(
      (await inject("POST", "/api/maneuvers/pcs_charge/execute", deps, { payload: {} }))
        .statusCode,
    ).toBe(403);
  });

  it("Bearer admin/teknik kabul; guest 403", async () => {
    const deps = makeDeps();
    expect(
      (await inject("GET", "/api/maneuvers", deps, { user: ADMIN })).statusCode,
    ).toBe(200);
    expect(
      (await inject("GET", "/api/maneuvers", deps, { user: TEKNIK })).statusCode,
    ).toBe(200);
    expect(
      (await inject("GET", "/api/maneuvers", deps, { user: GUEST })).statusCode,
    ).toBe(403);
  });

  it("geçerli iç token kabul; yanlış token 403 (fail-closed)", async () => {
    const deps = makeDeps();
    expect(
      (await inject("GET", "/api/maneuvers", deps, { internalToken: "secret-token" }))
        .statusCode,
    ).toBe(200);
    expect(
      (await inject("GET", "/api/maneuvers", deps, { internalToken: "yanlis" }))
        .statusCode,
    ).toBe(403);
  });
});

describe("manevra/operasyon rotaları — yürütme + okuma", () => {
  it("GET /maneuvers + /operations registry listesini döner", async () => {
    const deps = makeDeps();
    const res = await inject("GET", "/api/maneuvers", deps, { user: ADMIN });
    expect(res.json().maneuvers.map((m: ManeuverRecord) => m.name)).toEqual([
      "pcs_charge",
    ]);
    const ops = await inject("GET", "/api/operations", deps, { user: ADMIN });
    expect(ops.json().operations).toEqual([]);
  });

  it("POST /maneuvers/:name/execute: executor argümanları + 200", async () => {
    const deps = makeDeps();
    const res = await inject(
      "POST",
      "/api/maneuvers/pcs_charge/execute",
      deps,
      {
        user: ADMIN,
        payload: { params: { powerKw: 200 }, deviceIds: ["PCS-2"] },
      },
    );
    expect(res.statusCode).toBe(200);
    expect(deps.executor.execute).toHaveBeenCalledWith(
      "maneuver",
      "pcs_charge",
      { powerKw: 200 },
      {
        deviceIds: ["PCS-2"],
        trigger: "manual",
        createdBy: "admin",
      },
    );
  });

  it("HTTP eşlemesi: not_found 404 / missing_param 400 / persist 503 / failed 422", async () => {
    const notFound = makeDeps({
      executeImpl: async (): Promise<OperationRunResult> => ({
        runId: "",
        kind: "maneuver",
        name: "x",
        status: "rejected",
        outcomes: [],
        reason: "not_found",
      }),
    });
    expect(
      (await inject("POST", "/api/maneuvers/x/execute", notFound, {
        user: ADMIN,
        payload: {},
      })).statusCode,
    ).toBe(404);

    const missing = makeDeps({
      executeImpl: async (): Promise<OperationRunResult> => ({
        runId: "",
        kind: "maneuver",
        name: "x",
        status: "rejected",
        outcomes: [],
        reason: "missing_param",
      }),
    });
    expect(
      (await inject("POST", "/api/maneuvers/x/execute", missing, {
        user: ADMIN,
        payload: {},
      })).statusCode,
    ).toBe(400);

    const persist = makeDeps({
      executeImpl: async (): Promise<OperationRunResult> => ({
        runId: "",
        kind: "maneuver",
        name: "x",
        status: "rejected",
        outcomes: [],
        reason: "run_persist_failed",
      }),
    });
    expect(
      (await inject("POST", "/api/maneuvers/x/execute", persist, {
        user: ADMIN,
        payload: {},
      })).statusCode,
    ).toBe(503);

    const failed = makeDeps({
      executeImpl: async (): Promise<OperationRunResult> => ({
        runId: "run-1",
        kind: "maneuver",
        name: "x",
        status: "failed",
        outcomes: [],
      }),
    });
    expect(
      (await inject("POST", "/api/maneuvers/x/execute", failed, {
        user: ADMIN,
        payload: {},
      })).statusCode,
    ).toBe(422);
  });

  it("rolled_back → 200 (terminal durum alanıyla)", async () => {
    const deps = makeDeps({
      executeImpl: async (): Promise<OperationRunResult> => ({
        runId: "run-1",
        kind: "operation",
        name: "field_charge",
        status: "rolled_back",
        outcomes: [],
      }),
    });
    const res = await inject("POST", "/api/operations/field_charge/execute", deps, {
      user: ADMIN,
      payload: { params: { powerKw: 200 } },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("rolled_back");
  });

  it("GET /operations/runs + /runs/:id (yok → 404)", async () => {
    const deps = makeDeps();
    deps.runStore.listRecent.mockResolvedValue([
      {
        id: "run-1",
        kind: "maneuver",
        name: "pcs_charge",
        trigger: "manual",
        status: "completed",
        steps: {},
        startedAt: "2026-09-22T10:00:00.000Z",
        finishedAt: null,
        createdBy: "admin",
        traceId: null,
      },
    ]);
    deps.runStore.findById.mockResolvedValue({
      id: "run-1",
      kind: "maneuver",
      name: "pcs_charge",
      trigger: "manual",
      status: "completed",
      steps: {},
      startedAt: "2026-09-22T10:00:00.000Z",
      finishedAt: "2026-09-22T10:00:05.000Z",
      createdBy: "admin",
      traceId: null,
    });
    const list = await inject("GET", "/api/operations/runs", deps, { user: ADMIN });
    expect(list.statusCode).toBe(200);
    expect(list.json().runs).toHaveLength(1);

    const one = await inject("GET", "/api/operations/runs/run-1", deps, { user: ADMIN });
    expect(one.statusCode).toBe(200);
    expect(one.json().run.id).toBe("run-1");

    const missing = makeDeps();
    expect(
      (await inject("GET", "/api/operations/runs/yok", missing, { user: ADMIN }))
        .statusCode,
    ).toBe(404);
  });
});

describe("tanım YÖNETİMİ rotaları (yalnız admin — §11.2)", () => {
  function makeCrudDeps() {
    const base = makeDeps();
    const defs = {
      create: vi.fn(async () => undefined),
      update: vi.fn(async () => undefined),
      setEnabled: vi.fn(async () => undefined),
      findByKindAndName: vi.fn(async () => undefined),
      listByKind: vi.fn(async () => []),
    };
    const log = vi.fn(async () => undefined);
    return { ...base, defs, log };
  }

  async function injectCrud(
    method: "POST" | "PUT" | "DELETE",
    url: string,
    deps: ReturnType<typeof makeCrudDeps>,
    options: { user?: User; payload?: unknown } = {},
  ) {
    const app = Fastify();
    await app.register(
      async (fastify) => {
        if (options.user) {
          fastify.addHook("onRequest", async (request) => {
            (request as unknown as { user?: User }).user = options.user;
          });
        }
        await maneuverOperationRoutes(fastify, {
          registry: deps.registry,
          executor: deps.executor,
          runStore: deps.runStore,
          defs: deps.defs as never,
          logger: { log: deps.log } as never,
          internalToken: "secret-token",
        });
      },
      { prefix: "/api" },
    );
    return app.inject({
      method,
      url,
      ...(options.payload !== undefined ? { payload: options.payload as never } : {}),
    });
  }

  const validManeuver = {
    name: "admin_arbitraj",
    label: "Arbitraj",
    mode: "parallel",
    steps: [{ deviceTypes: ["pcs"], command: "charge" }],
  };

  const validOperation = {
    name: "admin_op",
    label: "Op",
    mode: "sequential",
    steps: [{ maneuver: "pcs_charge", params: { powerKw: 100 } }],
  };

  it("teknik/guest tanım YÖNETİMİNE erişemez (403) — yürütme erişebilir", async () => {
    const deps = makeCrudDeps();
    expect(
      (await injectCrud("POST", "/api/maneuvers", deps, {
        user: TEKNIK,
        payload: validManeuver,
      })).statusCode,
    ).toBe(403);
    expect(
      (await injectCrud("DELETE", "/api/maneuvers/x", deps, { user: GUEST }))
        .statusCode,
    ).toBe(403);
    expect(
      (await injectCrud("POST", "/api/maneuvers", deps, {
        user: ADMIN,
        payload: validManeuver,
      })).statusCode,
    ).toBe(201);
  });

  it("bozuk tanım → 400 (persist anında zod — kaydedilmez)", async () => {
    const deps = makeCrudDeps();
    const res = await injectCrud("POST", "/api/maneuvers", deps, {
      user: ADMIN,
      payload: { name: "x", label: "X", mode: "parallel", steps: [] },
    });
    expect(res.statusCode).toBe(400);
    expect(deps.defs.create).not.toHaveBeenCalled();
  });

  it("mükerrer kayıt → 409; audit + persist zinciri", async () => {
    const deps = makeCrudDeps();
    deps.defs.create.mockRejectedValue(new Error("already_exists"));
    const res = await injectCrud("POST", "/api/maneuvers", deps, {
      user: ADMIN,
      payload: validManeuver,
    });
    expect(res.statusCode).toBe(409);
  });

  it("audit FAIL-CLOSED: audit yazılamazsa tanım REDDEDİLİR (§11.2)", async () => {
    const deps = makeCrudDeps();
    deps.log.mockRejectedValue(new Error("log down"));
    const res = await injectCrud("POST", "/api/maneuvers", deps, {
      user: ADMIN,
      payload: validManeuver,
    });
    expect(res.statusCode).toBe(500);
    expect(deps.defs.create).not.toHaveBeenCalled();
  });

  it("PUT: isim uyuşmazlığı 400; başarılı güncelleme 200", async () => {
    const deps = makeCrudDeps();
    expect(
      (await injectCrud("PUT", "/api/maneuvers/baska", deps, {
        user: ADMIN,
        payload: validManeuver,
      })).statusCode,
    ).toBe(400);
    expect(
      (await injectCrud("PUT", "/api/maneuvers/admin_arbitraj", deps, {
        user: ADMIN,
        payload: validManeuver,
      })).statusCode,
    ).toBe(200);
    expect(deps.defs.update).toHaveBeenCalledWith(
      "maneuver",
      "admin_arbitraj",
      expect.objectContaining({ name: "admin_arbitraj" }),
      "admin",
    );
  });

  it("DELETE: yumuşak silme (enabled=false); yoksa 404", async () => {
    const deps = makeCrudDeps();
    expect(
      (await injectCrud("DELETE", "/api/maneuvers/admin_arbitraj", deps, {
        user: ADMIN,
      })).statusCode,
    ).toBe(200);
    expect(deps.defs.setEnabled).toHaveBeenCalledWith(
      "maneuver",
      "admin_arbitraj",
      false,
      "admin",
    );
    deps.defs.setEnabled.mockRejectedValue(new Error("not_found"));
    expect(
      (await injectCrud("DELETE", "/api/maneuvers/yok", deps, { user: ADMIN }))
        .statusCode,
    ).toBe(404);
  });

  it("operasyon tanımı: bozuk şema 400; geçerli 201", async () => {
    const deps = makeCrudDeps();
    expect(
      (await injectCrud("POST", "/api/operations", deps, {
        user: ADMIN,
        payload: { name: "op", label: "Op", mode: "sequential", steps: [] },
      })).statusCode,
    ).toBe(400);
    expect(
      (await injectCrud("POST", "/api/operations", deps, {
        user: ADMIN,
        payload: validOperation,
      })).statusCode,
    ).toBe(201);
  });
});

describe("yürütme rotaları — 15 sn → 202 (KURAL-MOTORU-V2 §3.2)", () => {
  it("uzun yürütme → 202 {status:running}; yürütme arka planda sürer", async () => {
    vi.useFakeTimers();
    try {
      const deps = makeDeps({
        executeImpl: () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  runId: "run-1",
                  kind: "operation" as const,
                  name: "field_charge",
                  status: "completed" as const,
                  outcomes: [],
                }),
              20_000,
            ),
          ),
      });
      const app = Fastify();
      await app.register(
        async (fastify) => {
          fastify.addHook("onRequest", async (request) => {
            (request as unknown as { user?: User }).user = ADMIN;
          });
          await maneuverOperationRoutes(fastify, {
            registry: deps.registry,
            executor: deps.executor,
            runStore: deps.runStore,
            internalToken: "secret-token",
          });
        },
        { prefix: "/api" },
      );
      const pending = app.inject({
        method: "POST",
        url: "/api/operations/field_charge/execute",
        payload: {},
      });
      await vi.advanceTimersByTimeAsync(15_000);
      const res = await pending;
      expect(res.statusCode).toBe(202);
      expect(res.json()).toEqual({ status: "running" });
      await vi.advanceTimersByTimeAsync(10_000); // arka plan yürütme biter (sızıntı yok)
    } finally {
      vi.useRealTimers();
    }
  });

  it("hızlı yürütme → normal sonuç (202 DEĞİL)", async () => {
    const deps = makeDeps();
    const app = Fastify();
    await app.register(
      async (fastify) => {
        fastify.addHook("onRequest", async (request) => {
          (request as unknown as { user?: User }).user = ADMIN;
        });
        await maneuverOperationRoutes(fastify, {
          registry: deps.registry,
          executor: deps.executor,
          runStore: deps.runStore,
          internalToken: "secret-token",
        });
      },
      { prefix: "/api" },
    );
    const res = await app.inject({
      method: "POST",
      url: "/api/maneuvers/pcs_charge/execute",
      payload: { params: { powerKw: 200 } },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe("completed");
  });
});
