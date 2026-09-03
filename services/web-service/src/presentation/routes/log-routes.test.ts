import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { logRoutes } from "./log-routes";
import { RequestContext, createRequestIdHook } from "../middleware/request-context";
import { createErrorHandler } from "../middleware/error-handler";
import { LogRateLimiter } from "../middleware/log-rate-limiter";
import { LogRepository } from "../../infrastructure/persistence/log-repository";
import type { LogEventInput } from "@gd-monorepo/tamper-logger";


/**
 * log-routes sözleşmesi (Faz 0 T0.6/T0.8):
 * - GET / → 200 {logs} (sorgu parametreleri repo'ya iletilir).
 * - POST / → 201 (type/source/message zorunlu; eksikse 400 — mevcut davranış).
 * - POST / { events: [...] } → batch (T0.8) — her event repo'ya yazılır.
 * - Rate-limit: aşılınca 429 (T0.8).
 * - Altyapı hatası try/catch'siz sınıra ulaşır — boundary log'lar, route
 *   içinde console.* yoktur.
 */

function makeRepo(overrides: Partial<LogRepository> = {}) {
  return {
    query: vi.fn().mockResolvedValue([{ id: "l-1" }]),
    insert: vi.fn().mockResolvedValue({ id: "l-2" }),
    ...overrides,
  } as unknown as LogRepository;
}

async function buildApp(
  repo: LogRepository,
  withBoundary = false,
  rateLimiter?: LogRateLimiter,
) {
  const app = Fastify();
  if (withBoundary) {
    const context = new RequestContext();
    app.addHook("onRequest", createRequestIdHook(context));
    app.setErrorHandler(
      createErrorHandler({
        logger: { log: vi.fn().mockResolvedValue(undefined) },
        context,
      }),
    );
  }
  await app.register(
    async (fastify) => {
      await logRoutes(fastify, { logRepo: repo, rateLimiter });
    },
    { prefix: "/api/logs" },
  );
  return app;
}

describe("log-routes (T0.6)", () => {
  it("GET / → 200 {logs}", async () => {
    const app = await buildApp(makeRepo());
    const res = await app.inject({ method: "GET", url: "/api/logs/" });
    expect(res.statusCode).toBe(200);
    expect(res.json().logs).toHaveLength(1);
  });

  it("GET / — sorgu parametreleri repo'ya iletilir", async () => {
    const repo = makeRepo();
    const app = await buildApp(repo);
    await app.inject({
      method: "GET",
      url: "/api/logs/?type=error&limit=10",
    });
    const args = (repo.query as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(args.types).toEqual(["error"]);
    expect(args.limit).toBe(10);
  });

  it("POST / → 201", async () => {
    const app = await buildApp(makeRepo());
    const res = await app.inject({
      method: "POST",
      url: "/api/logs/",
      payload: { type: "error", source: "user", message: "x" },
    });
    expect(res.statusCode).toBe(201);
  });

  it("POST / — eksik alan → 400 (mevcut davranış korunur)", async () => {
    const app = await buildApp(makeRepo());
    const res = await app.inject({
      method: "POST",
      url: "/api/logs/",
      payload: { type: "error" },
    });
    expect(res.statusCode).toBe(400);
  });

  describe("T0.8 — batch + rate-limit", () => {
    it("POST / { events: [...] } → 201 {accepted}", async () => {
      const repo = makeRepo();
      const app = await buildApp(repo);
      const res = await app.inject({
        method: "POST",
        url: "/api/logs/",
        payload: {
          events: [
            { type: "error", source: "user", message: "e1" },
            { type: "info", source: "user", message: "e2" },
          ],
        },
      });
      expect(res.statusCode).toBe(201);
      expect(res.json().accepted).toBe(2);
      expect(repo.insert).toHaveBeenCalledTimes(2);
    });

    it("POST / events boşsa 400", async () => {
      const app = await buildApp(makeRepo());
      const res = await app.inject({
        method: "POST",
        url: "/api/logs/",
        payload: { events: [] },
      });
      expect(res.statusCode).toBe(400);
    });

    it("rate-limit aşılınca 429", async () => {
      const repo = makeRepo();
      const limiter = new LogRateLimiter({ maxPerMinute: 2 });
      const app = await buildApp(repo, false, limiter);
      for (let i = 0; i < 2; i++) {
        await app.inject({
          method: "POST",
          url: "/api/logs/",
          payload: { type: "error", source: "user", message: "x" },
          remoteAddress: "10.0.0.1",
        });
      }
      const res = await app.inject({
        method: "POST",
        url: "/api/logs/",
        payload: { type: "error", source: "user", message: "x" },
        remoteAddress: "10.0.0.1",
      });
      expect(res.statusCode).toBe(429);
    });

    it("rateLimiter yoksa limitsizdir (geriye uyumlu)", async () => {
      const app = await buildApp(makeRepo());
      for (let i = 0; i < 5; i++) {
        const res = await app.inject({
          method: "POST",
          url: "/api/logs/",
          payload: { type: "info", source: "user", message: `m${i}` },
        });
        expect(res.statusCode).toBe(201);
      }
    });
  });

  it("GET / — altyapı hatası sınıra ulaşır, route console.error kullanmaz", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      const app = await buildApp(
        makeRepo({ query: vi.fn().mockRejectedValue(new Error("db down")) }),
        true,
      );
      const res = await app.inject({ method: "GET", url: "/api/logs/" });
      expect(res.statusCode).toBe(500);
      expect(consoleSpy).not.toHaveBeenCalled();
    } finally {
      consoleSpy.mockRestore();
    }
  });

  it("sınır logu altyapı hatasını correlationId ile kaydeder", async () => {
    const boundaryLog = vi.fn().mockResolvedValue(undefined);
    const app = Fastify();
    const context = new RequestContext();
    app.addHook("onRequest", createRequestIdHook(context));
    app.setErrorHandler(
      createErrorHandler({ logger: { log: boundaryLog }, context }),
    );
    await app.register(
      async (fastify) => {
        await logRoutes(fastify, {
          logRepo: makeRepo({
            query: vi.fn().mockRejectedValue(new Error("db down")),
          }),
        });
      },
      { prefix: "/api/logs" },
    );
    await app.inject({
      method: "GET",
      url: "/api/logs/",
      headers: { "x-request-id": "corr-5" },
    });
    const input = boundaryLog.mock.calls[0][0] as LogEventInput;
    expect(input.correlationId).toBe("corr-5");
    expect(input.eventCode).toBe("request_failed");
  });
});
