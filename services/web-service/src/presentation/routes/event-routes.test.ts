import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import type { User } from "@gd-monorepo/shared-types";
import type { FieldEventRow, IEventFeedPort } from "../../domain/ports/event-feed";
import {
  ListFieldEventsUseCase,
  UPLINK_EVENT_WHITELIST,
} from "../../application/events/list-field-events-use-case";
import { eventRoutes } from "./event-routes";

/**
 * eventRoutes sözleşmesi (SPEC UC-4):
 * - Yetki: admin/teknik (Bearer) veya iç token; yoksa 403.
 * - `after` geçersizse 400; limit kırpma + whitelist use-case'te.
 * - Yanıt `{ events }` + `eventId = <fieldId>:<corr|seq>`.
 */

const ADMIN: User = {
  id: "u-1",
  username: "admin",
  role: "admin",
  name: "admin",
  fieldIds: [],
  mustChangePassword: false,
  createdAt: "",
  updatedAt: "",
};

const ROW: FieldEventRow = {
  ts: "2026-10-22T09:58:00.000Z",
  level: "warn",
  category: "security",
  eventCode: "device_alarm",
  message: "Voltage alarmi",
  context: { deviceId: "bsc-1", retries: 2 },
  seq: 42,
  correlationId: "corr-9",
};

function makeFeed(rows: FieldEventRow[] = []): {
  feed: IEventFeedPort;
  calls: Array<Parameters<IEventFeedPort["listAfter"]>[0]>;
} {
  const calls: Array<Parameters<IEventFeedPort["listAfter"]>[0]> = [];
  const feed = {
    listAfter: vi.fn(async (query: Parameters<IEventFeedPort["listAfter"]>[0]) => {
      calls.push(query);
      return rows;
    }),
  };
  return { feed, calls };
}

async function inject(
  feed: IEventFeedPort | undefined,
  query: Record<string, string> = {},
  options: { user?: User; internalToken?: string } = {},
) {
  const app = Fastify();
  await app.register(
    async (fastify) => {
      if (options.user) {
        fastify.addHook("onRequest", async (request) => {
          (request as unknown as { user?: User }).user = options.user;
        });
      }
      await eventRoutes(fastify, {
        ...(feed ? { feed: new ListFieldEventsUseCase(feed, "f-1") } : {}),
        internalToken: "secret-token",
      });
    },
    { prefix: "/api" },
  );
  const qs = new URLSearchParams(query).toString();
  return app.inject({
    method: "GET",
    url: `/api/events${qs ? `?${qs}` : ""}`,
    headers:
      options.internalToken !== undefined
        ? { "x-internal-token": options.internalToken }
        : {},
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("eventRoutes (UC-4)", () => {
  it("yetkisiz istek → 403", async () => {
    const { feed } = makeFeed();
    const res = await inject(feed);
    expect(res.statusCode).toBe(403);
  });

  it("after+limit geçirir; eventId/level/category bağlam eşlenir", async () => {
    const { feed, calls } = makeFeed([ROW]);
    const res = await inject(feed, { after: "2026-10-22T09:50:00.000Z", limit: "50" }, {
      user: ADMIN,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      events: [
        {
          eventId: "f-1:corr-9",
          timestamp: "2026-10-22T09:58:00.000Z",
          level: "warn",
          category: "security",
          eventCode: "device_alarm",
          message: "Voltage alarmi",
          context: { deviceId: "bsc-1", retries: "2" },
        },
      ],
    });
    expect(calls[0]).toEqual({
      after: "2026-10-22T09:50:00.000Z",
      limit: 50,
      eventCodes: [...UPLINK_EVENT_WHITELIST],
    });
  });

  it("after yoksa epoch; correlation yoksa seq kullanılır", async () => {
    const { feed, calls } = makeFeed([
      { ...ROW, correlationId: null, seq: 7, context: {} },
    ]);
    const res = await inject(feed, {}, { user: ADMIN });

    expect(res.statusCode).toBe(200);
    expect(res.json().events[0].eventId).toBe("f-1:7");
    expect(calls[0]?.after).toBe("1970-01-01T00:00:00.000Z");
    expect(calls[0]?.limit).toBe(200);
  });

  it("geçersiz after → 400", async () => {
    const { feed } = makeFeed();
    const res = await inject(feed, { after: "dun" }, { user: ADMIN });
    expect(res.statusCode).toBe(400);
  });

  it("limit 1..1000 aralığına kırpılır", async () => {
    const high = makeFeed();
    await inject(high.feed, { limit: "5000" }, { user: ADMIN });
    expect(high.calls[0]?.limit).toBe(1000);

    const low = makeFeed();
    await inject(low.feed, { limit: "0" }, { user: ADMIN });
    expect(low.calls[0]?.limit).toBe(1);
  });

  it("iç token ile erişir (hub programatik yolu)", async () => {
    const { feed } = makeFeed();
    const res = await inject(feed, {}, { internalToken: "secret-token" });
    expect(res.statusCode).toBe(200);
  });

  it("feed yoksa boş liste döner (kademeli)", async () => {
    const res = await inject(undefined, {}, { user: ADMIN });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ events: [] });
  });
});
