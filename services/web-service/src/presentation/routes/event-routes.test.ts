import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import type { ISqlDatabase } from "@gd-monorepo/core";
import type { User } from "@gd-monorepo/shared-types";
import { eventRoutes, UPLINK_EVENT_WHITELIST } from "./event-routes";

/**
 * eventRoutes sözleşmesi (SPEC UC-5):
 * - Yetki: admin/teknik (Bearer) veya iç token; yoksa 403.
 * - `after` yoksa epoch; geçersizse 400; limit 1..1000 (varsayılan 200).
 * - Yalnız whitelist'li `log_events` satırları, `ts` ARTAN; yanıt
 *   `{ events }` + `eventId = <fieldId>:<corr|seq>`.
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

function makeSql(rows: unknown[] = []): ISqlDatabase {
  return {
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockResolvedValue(rows),
    queryOne: vi.fn().mockResolvedValue(undefined),
    health: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn().mockResolvedValue(undefined),
  } as unknown as ISqlDatabase;
}

async function inject(
  sql: ISqlDatabase,
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
        sql,
        fieldId: "f-1",
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

describe("eventRoutes (UC-5)", () => {
  it("yetkisiz istek → 403", async () => {
    const res = await inject(makeSql());
    expect(res.statusCode).toBe(403);
  });

  it("whitelist + after + limit ile sorgular; eventId/level/category eşler", async () => {
    const sql = makeSql([
      {
        ts: "2026-10-22T09:58:00.000Z",
        level: "warn",
        category: "security",
        event_code: "device_alarm",
        message: "Voltage alarmi",
        context: { deviceId: "bsc-1", retries: 2, nested: { x: 1 } },
        seq: 42,
        correlation_id: "corr-9",
      },
    ]);
    const res = await inject(sql, { after: "2026-10-22T09:50:00.000Z", limit: "50" }, {
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

    const [sqlText, params] = (sql.query as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string, unknown[]];
    expect(sqlText).toContain("event_code = ANY($2::text[])");
    expect(sqlText).toContain("ORDER BY ts ASC");
    expect(params[0]).toBe("2026-10-22T09:50:00.000Z");
    expect(params[1]).toEqual([...UPLINK_EVENT_WHITELIST]);
    expect(params[2]).toBe(50);
  });

  it("after yoksa epoch; correlation yoksa seq kullanılır", async () => {
    const sql = makeSql([
      {
        ts: "2026-10-22T09:58:00.000Z",
        level: "info",
        category: "app",
        event_code: "session_open",
        message: "oturum",
        context: {},
        seq: 7,
        correlation_id: null,
      },
    ]);
    const res = await inject(sql, {}, { user: ADMIN });

    expect(res.statusCode).toBe(200);
    expect(res.json().events[0].eventId).toBe("f-1:7");
    const params = (sql.query as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as unknown[];
    expect(params[0]).toBe("1970-01-01T00:00:00.000Z");
    expect(params[2]).toBe(200);
  });

  it("geçersiz after → 400", async () => {
    const res = await inject(makeSql(), { after: "dun" }, { user: ADMIN });
    expect(res.statusCode).toBe(400);
  });

  it("limit 1..1000 aralığına kırpılır", async () => {
    const sql = makeSql();
    await inject(sql, { limit: "5000" }, { user: ADMIN });
    expect(
      (sql.query as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.[2],
    ).toBe(1000);

    const sql2 = makeSql();
    await inject(sql2, { limit: "0" }, { user: ADMIN });
    expect(
      (sql2.query as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]?.[2],
    ).toBe(1);
  });

  it("iç token ile erişir (hub programatik yolu)", async () => {
    const res = await inject(makeSql(), {}, { internalToken: "secret-token" });
    expect(res.statusCode).toBe(200);
  });
});
