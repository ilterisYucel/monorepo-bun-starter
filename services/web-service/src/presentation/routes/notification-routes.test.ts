import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { notificationRoutes } from "./notification-routes";
import type { FieldEventCollector } from "../../infrastructure/field-uplink/field-event-collector";

/**
 * notification-routes sözleşmesi (Boss Faz 5):
 * - GET / → liste (limit 1-500 arası sınırlanır)
 * - GET /unread-count?since → { count }; since yoksa 400
 */

function makeCollector(overrides: Partial<FieldEventCollector> = {}): FieldEventCollector {
  return {
    list: vi.fn().mockResolvedValue([]),
    countSince: vi.fn().mockResolvedValue(3),
    ensureSchema: vi.fn(),
    attach: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  } as unknown as FieldEventCollector;
}

async function buildApp(collector: FieldEventCollector) {
  const app = Fastify();
  await app.register(
    async (fastify) => {
      await notificationRoutes(fastify, { collector });
    },
    { prefix: "/api/notifications" },
  );
  return app;
}

describe("notification-routes (Faz 5)", () => {
  it("GET / → 200 liste", async () => {
    const collector = makeCollector({
      list: vi.fn().mockResolvedValue([
        { fieldId: "f-1", fieldName: "İstanbul-1", eventCode: "device_alarm" },
      ]),
    });
    const app = await buildApp(collector);
    const res = await app.inject({ method: "GET", url: "/api/notifications/" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
  });

  it("limit 500 üstü sınıra çekilir", async () => {
    const collector = makeCollector();
    const app = await buildApp(collector);
    await app.inject({ method: "GET", url: "/api/notifications?limit=9999" });
    expect(collector.list).toHaveBeenCalledWith({ limit: 500, after: undefined });
  });

  it("after parametresi aktarılır (son görülme sınırı)", async () => {
    const collector = makeCollector();
    const app = await buildApp(collector);
    await app.inject({
      method: "GET",
      url: "/api/notifications?after=2026-09-07T00:00:00Z",
    });
    expect(collector.list).toHaveBeenCalledWith({
      limit: 100,
      after: "2026-09-07T00:00:00Z",
    });
  });

  it("GET /unread-count?since → { count }", async () => {
    const app = await buildApp(makeCollector());
    const res = await app.inject({
      method: "GET",
      url: "/api/notifications/unread-count?since=2026-09-07T00:00:00Z",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ count: 3 });
  });

  it("since yoksa 400", async () => {
    const app = await buildApp(makeCollector());
    const res = await app.inject({
      method: "GET",
      url: "/api/notifications/unread-count",
    });
    expect(res.statusCode).toBe(400);
  });
});
