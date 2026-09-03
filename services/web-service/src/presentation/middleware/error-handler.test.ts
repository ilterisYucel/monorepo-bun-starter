import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { ZodError, z } from "zod";
import { DomainError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, TransientError, FatalError } from "@gd-monorepo/result";

import type { LogEventInput } from "@gd-monorepo/tamper-logger";

import { RequestContext, createRequestIdHook } from "./request-context";
import { createErrorHandler } from "./error-handler";

/**
 * T0.6 — setErrorHandler kontratı (TESTING.md §8.1; tasarım Faz 0 T0.6):
 *
 * - Sınırın TEK log noktası: her hata bir kez loglanır (BoundaryLogger.log).
 * - DomainError eşlemesi: validation→400, not_found→404, unauthorized→401,
 *   forbidden→403, conflict→409, transient→503, fatal→500.
 * - ZodError→400 (mevcut davranış korunur).
 * - Bilinmeyen hata→500 genel mesaj — iç yapı (stack) yanıta sızmaz.
 * - Kategori eşlemesi: unauthorized/forbidden→security; diğerleri→app.
 * - correlationId: request.correlationId öncelikli, yoksa context.current().
 */

function buildTestApp(logger: { log: ReturnType<typeof vi.fn> }) {
  const app = Fastify();
  const context = new RequestContext();
  app.addHook("onRequest", createRequestIdHook(context));
  app.setErrorHandler(
    createErrorHandler({
      logger: logger as unknown as { log: (i: LogEventInput) => Promise<void> },
      context,
    }),
  );
  return { app, context };
}

function loggerStub() {
  return { log: vi.fn().mockResolvedValue(undefined) };
}

describe("error-handler (T0.6)", () => {
  describe("DomainError eşlemesi", () => {
    const cases: Array<{
      name: string;
      build: () => DomainError;
      status: number;
    }> = [
      { name: "ValidationError", build: () => new ValidationError("bad", "geçersiz"), status: 400 },
      { name: "NotFoundError", build: () => new NotFoundError("nope", "yok"), status: 404 },
      { name: "UnauthorizedError", build: () => new UnauthorizedError("auth", "yetki yok"), status: 401 },
      { name: "ForbiddenError", build: () => new ForbiddenError("forb", "yasak"), status: 403 },
      { name: "ConflictError", build: () => new ConflictError("conf", "çakışma"), status: 409 },
      { name: "TransientError", build: () => new TransientError("tmp", "geçici"), status: 503 },
      { name: "FatalError", build: () => new FatalError("fat", "kalıcı"), status: 500 },
    ];

    for (const c of cases) {
      it(`${c.name} → ${c.status}`, async () => {
        const { app } = buildTestApp(loggerStub());
        app.get("/boom", () => {
          throw c.build();
        });
        const res = await app.inject({ method: "GET", url: "/boom" });
        expect(res.statusCode).toBe(c.status);
        const body = res.json();
        expect(body.code).toBeDefined();
        expect(body.error).toBeDefined();
      });
    }
  });

  it("ZodError → 400 (mevcut davranış korunur)", async () => {
    const { app } = buildTestApp(loggerStub());
    app.get("/boom", () => {
      z.object({ a: z.number() }).parse({ a: "x" });
    });
    const res = await app.inject({ method: "GET", url: "/boom" });
    expect(res.statusCode).toBe(400);
  });

  it("bilinmeyen hata → 500 genel mesaj — stack sızmaz", async () => {
    const { app } = buildTestApp(loggerStub());
    app.get("/boom", () => {
      throw new Error("sekret-detay: password=abc");
    });
    const res = await app.inject({ method: "GET", url: "/boom" });
    expect(res.statusCode).toBe(500);
    const body = res.json();
    expect(body.error).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toContain("sekret-detay");
    expect(JSON.stringify(body)).not.toContain("password");
  });

  describe("sınır logu — bir kez", () => {
    it("beklenen hata app kanalında warn ile loglanır", async () => {
      const logger = loggerStub();
      const { app } = buildTestApp(logger);
      app.get("/boom", () => {
        throw new ValidationError("bad_input", "geçersiz girdi");
      });
      const res = await app.inject({
        method: "GET",
        url: "/boom",
        headers: { "x-request-id": "corr-77" },
      });
      expect(res.statusCode).toBe(400);
      expect(logger.log).toHaveBeenCalledTimes(1);
      const input = logger.log.mock.calls[0][0] as LogEventInput;
      expect(input.category).toBe("app");
      expect(input.eventCode).toBe("request_rejected");
      expect(input.level).toBe("warn");
      expect(input.correlationId).toBe("corr-77");
      expect(input.context).toMatchObject({ code: "bad_input" });
    });

    it("unauthorized güvenlik kanalında loglanır", async () => {
      const logger = loggerStub();
      const { app } = buildTestApp(logger);
      app.get("/boom", () => {
        throw new UnauthorizedError("bad_token", "sahte token");
      });
      await app.inject({ method: "GET", url: "/boom" });
      const input = logger.log.mock.calls[0][0] as LogEventInput;
      expect(input.category).toBe("security");
      expect(input.eventCode).toBe("request_rejected");
    });

    it("beklenmeyen hata app kanalında error ile loglanır", async () => {
      const logger = loggerStub();
      const { app } = buildTestApp(logger);
      app.get("/boom", () => {
        throw new TransientError("db_down", "db yok");
      });
      await app.inject({ method: "GET", url: "/boom" });
      const input = logger.log.mock.calls[0][0] as LogEventInput;
      expect(input.category).toBe("app");
      expect(input.eventCode).toBe("request_failed");
      expect(input.level).toBe("error");
      expect(input.context).toMatchObject({ code: "db_down" });
    });

    it("log() hatası istemciye yansımaz (yanıt yine de gönderilir)", async () => {
      const logger = { log: vi.fn().mockRejectedValue(new Error("sink down")) };
      const { app } = buildTestApp(logger);
      app.get("/boom", () => {
        throw new FatalError("fat", "kalıcı");
      });
      const res = await app.inject({ method: "GET", url: "/boom" });
      expect(res.statusCode).toBe(500);
    });
  });
});
