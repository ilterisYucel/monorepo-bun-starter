import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import type { INotificationReader } from "../../domain/ports/event-feed";
import { NotificationsUseCase } from "../../application/notifications/notifications-use-case";
import { notificationRoutes } from "./notification-routes";

/**
 * notification-routes sözleşmesi (Boss Faz 5):
 * - GET / → liste (limit 1-500 arası sınırlanır)
 * - GET /unread-count?since → { count }; since yoksa 400
 */

function makeReader(
  overrides: Partial<INotificationReader> = {},
): INotificationReader {
  return {
    list: vi.fn(async () => []),
    countSince: vi.fn(async () => 3),
    ...overrides,
  };
}

async function buildApp(reader: INotificationReader | undefined) {
  const app = Fastify();
  await app.register(
    async (fastify) => {
      await notificationRoutes(fastify, {
        ...(reader ? { notifications: new NotificationsUseCase(reader) } : {}),
      });
    },
    { prefix: "/api/notifications" },
  );
  return app;
}

describe("notification-routes (Faz 5)", () => {
  it("GET / → 200 liste", async () => {
    const reader = makeReader({
      list: vi.fn(async () => [
        {
          fieldId: "f-1",
          fieldName: "İstanbul-1",
          eventId: "f-1:42",
          eventCode: "device_alarm",
          level: "error",
          category: "app",
          message: "x",
          context: {},
          occurredAt: "2026-09-07T10:00:00Z",
        },
      ]),
    });
    const app = await buildApp(reader);
    const res = await app.inject({ method: "GET", url: "/api/notifications/" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toHaveLength(1);
    expect(res.json()[0]).toMatchObject({
      fieldName: "İstanbul-1",
      occurredAt: "2026-09-07T10:00:00.000Z",
    });
  });

  it("limit 500 üstü sınıra çekilir", async () => {
    const reader = makeReader();
    const app = await buildApp(reader);
    await app.inject({ method: "GET", url: "/api/notifications?limit=9999" });
    expect(reader.list).toHaveBeenCalledWith({ limit: 500 });
  });

  it("after parametresi aktarılır (son görülme sınırı)", async () => {
    const reader = makeReader();
    const app = await buildApp(reader);
    await app.inject({
      method: "GET",
      url: "/api/notifications?after=2026-09-07T00:00:00Z",
    });
    expect(reader.list).toHaveBeenCalledWith({
      limit: 100,
      after: "2026-09-07T00:00:00Z",
    });
  });

  it("GET /unread-count?since → { count }", async () => {
    const app = await buildApp(makeReader());
    const res = await app.inject({
      method: "GET",
      url: "/api/notifications/unread-count?since=2026-09-07T00:00:00Z",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ count: 3 });
  });

  it("since yoksa 400", async () => {
    const app = await buildApp(makeReader());
    const res = await app.inject({
      method: "GET",
      url: "/api/notifications/unread-count",
    });
    expect(res.statusCode).toBe(400);
  });
});
