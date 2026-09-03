import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { RequestContext, createRequestIdHook } from "./request-context";

/**
 * T0.6 — RequestContext kontratı (TESTING.md §8.1):
 *
 * - `run(correlationId, fn)`: fn'i correlationId bağlamında çalıştırır;
 *   dönüş değeri (sync/async) aynen iletilir.
 * - `current()`: run içinde id'yi, dışında undefined döner.
 * - `createRequestIdHook(context, generateId?)`: onRequest kancası —
 *   `X-Request-Id` başlığı varsa aynen kullanır ve yankılar; yoksa üretir.
 *   İstek işleyicisinin tamamı üretilen id bağlamında çalışır; id
 *   `request.correlationId` üzerinde de durur.
 */

describe("RequestContext (T0.6)", () => {
  it("run içinde current() id'yi döner", () => {
    const ctx = new RequestContext();
    ctx.run("corr-1", () => {
      expect(ctx.current()).toBe("corr-1");
    });
  });

  it("run dışında current() undefined döner", () => {
    const ctx = new RequestContext();
    expect(ctx.current()).toBeUndefined();
  });

  it("run dönüş değerini aynen iletir", () => {
    const ctx = new RequestContext();
    expect(ctx.run("c", () => 42)).toBe(42);
  });

  it("run async fn'i destekler", async () => {
    const ctx = new RequestContext();
    const out = await ctx.run("c", async () => {
      await Promise.resolve();
      return ctx.current();
    });
    expect(out).toBe("c");
  });

  it("iç içe run içteki id'yi kullanır, dışarıda dıştaki geçerli kalır", () => {
    const ctx = new RequestContext();
    ctx.run("outer", () => {
      ctx.run("inner", () => {
        expect(ctx.current()).toBe("inner");
      });
      expect(ctx.current()).toBe("outer");
    });
  });
});

describe("createRequestIdHook (T0.6)", () => {
  async function buildApp(ctx: RequestContext, generateId?: () => string) {
    const app = Fastify();
    app.addHook("onRequest", createRequestIdHook(ctx, generateId));
    app.get("/who", (request, reply) => {
      const correlationId = (
        request as unknown as { correlationId?: string }
      ).correlationId;
      return reply.send({ current: ctx.current(), correlationId });
    });
    await app.ready();
    return app;
  }

  it("başlık yoksa id üretir, yanıta yazar ve bağlama kurar", async () => {
    const ctx = new RequestContext();
    const app = await buildApp(ctx, () => "gen-1");
    const res = await app.inject({ method: "GET", url: "/who" });
    const body = res.json();
    expect(res.headers["x-request-id"]).toBe("gen-1");
    expect(body.current).toBe("gen-1");
    expect(body.correlationId).toBe("gen-1");
  });

  it("gelen X-Request-Id başlığını kullanır ve yankılar", async () => {
    const ctx = new RequestContext();
    const app = await buildApp(ctx, () => "gen-x");
    const res = await app.inject({
      method: "GET",
      url: "/who",
      headers: { "x-request-id": "incoming-9" },
    });
    expect(res.headers["x-request-id"]).toBe("incoming-9");
    expect(res.json().current).toBe("incoming-9");
  });

  it("boş başlık üretilmiş id ile değiştirilir", async () => {
    const ctx = new RequestContext();
    const app = await buildApp(ctx, () => "gen-2");
    const res = await app.inject({
      method: "GET",
      url: "/who",
      headers: { "x-request-id": "   " },
    });
    expect(res.headers["x-request-id"]).toBe("gen-2");
  });

  it("üretim fonksiyonu yoksa UUID formatı üretir", async () => {
    const ctx = new RequestContext();
    const app = await buildApp(ctx);
    const res = await app.inject({ method: "GET", url: "/who" });
    const id = res.headers["x-request-id"] as string;
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
