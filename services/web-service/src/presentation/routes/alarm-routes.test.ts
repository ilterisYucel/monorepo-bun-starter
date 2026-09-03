import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { alarmRoutes } from "./alarm-routes";
import type { ISqlDatabase } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import type { User } from "@gd-monorepo/shared-types";


/**
 * alarm-routes sözleşmesi (Faz 0 eki):
 * - GET /alarms: aktif (çözülmemiş önce) + son kapananlar birleşik döner.
 * - POST /alarms/resolve: admin/teknik; aktif olmayan alarm → 409; audit
 *   `alarm_resolved` logu (fail-closed — audit yazılamazsa 500, DB'ye gidilmez).
 */

const mockUser = (role: User["role"]): User => ({
  id: "u-1",
  username: role === "teknik" ? "teknikci" : role,
  role,
  name: "U",
  createdAt: "",
  updatedAt: "",
});

function makeDb(overrides: Partial<ISqlDatabase> = {}): ISqlDatabase {
  return {
    connect: vi.fn(),
    disconnect: vi.fn(),
    execute: vi.fn().mockResolvedValue(undefined),
    query: vi.fn().mockImplementation((sql: string) => {
      if (sql.includes("active = TRUE")) {
        return Promise.resolve([
          {
            device_id: "bsc-1",
            alarm_name: "BSC Fault",
            severity: "error",
            active: true,
            resolved: false,
            last_changed_at: "2026-08-24T10:00:00Z",
          },
        ]);
      }
      if (sql.includes("active = FALSE")) {
        return Promise.resolve([
          {
            device_id: "bsc-1",
            alarm_name: "Eski Alarm",
            severity: "warning",
            active: false,
            resolved: true,
            resolved_by: "teknikci",
            last_changed_at: "2026-08-24T09:00:00Z",
          },
        ]);
      }
      return Promise.resolve([]);
    }),
    queryOne: vi.fn().mockResolvedValue({ alarm_name: "BSC Fault" }),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function mockLogger(): { logger: TamperLogger; log: ReturnType<typeof vi.fn> } {
  const log = vi.fn().mockResolvedValue(undefined);
  return { logger: { log } as unknown as TamperLogger, log };
}

async function buildApp(opts: {
  db?: ISqlDatabase;
  logger?: TamperLogger;
  user?: User;
}) {
  const app = Fastify();
  app.addHook("onRequest", (request, _reply, done) => {
    if (opts.user) {
      (request as unknown as { user: User }).user = opts.user;
    }
    done();
  });
  await app.register(
    async (fastify) => {
      await alarmRoutes(fastify, {
        postgres: opts.db ?? makeDb(),
        logger: opts.logger ?? mockLogger().logger,
      });
    },
    { prefix: "/api/unified" },
  );
  return app;
}

describe("alarm-routes (Faz 0 eki)", () => {
  it("GET /alarms — aktif + kapananlar birleşik döner", async () => {
    const app = await buildApp({ user: mockUser("teknik") });
    const res = await app.inject({ method: "GET", url: "/api/unified/alarms" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.alarms).toHaveLength(2);
    expect(body.alarms[0].alarmName).toBe("BSC Fault");
    expect(body.alarms[0].resolved).toBe(false);
  });

  it("POST /alarms/resolve — teknik: audit log + DB güncellemesi", async () => {
    const db = makeDb();
    const { logger, log } = mockLogger();
    const app = await buildApp({ db, logger, user: mockUser("teknik") });
    const res = await app.inject({
      method: "POST",
      url: "/api/unified/alarms/resolve",
      payload: { deviceId: "bsc-1", alarmName: "BSC Fault" },
    });
    expect(res.statusCode).toBe(200);

    const audit = log.mock.calls.map((c) => c[0])[0];
    expect(audit.category).toBe("audit");
    expect(audit.eventCode).toBe("alarm_resolved");
    expect(audit.context.resolvedBy).toBe("teknikci");
    expect(audit.context.alarmName).toBe("BSC Fault");

    const update = (db.queryOne as ReturnType<typeof vi.fn>).mock.calls[0] as [string, unknown[]];
    expect(update[0]).toContain("resolved = TRUE");
    expect(update[1]).toEqual(["bsc-1", "BSC Fault", "teknikci"]);
  });

  it("POST /alarms/resolve — admin de çözebilir", async () => {
    const app = await buildApp({ user: mockUser("admin") });
    const res = await app.inject({
      method: "POST",
      url: "/api/unified/alarms/resolve",
      payload: { deviceId: "bsc-1", alarmName: "BSC Fault" },
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /alarms/resolve — guest 403", async () => {
    const app = await buildApp({ user: mockUser("guest") });
    const res = await app.inject({
      method: "POST",
      url: "/api/unified/alarms/resolve",
      payload: { deviceId: "bsc-1", alarmName: "BSC Fault" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("POST /alarms/resolve — aktif olmayan alarm 409", async () => {
    const db = makeDb({ queryOne: vi.fn().mockResolvedValue(undefined) });
    const app = await buildApp({ db, user: mockUser("teknik") });
    const res = await app.inject({
      method: "POST",
      url: "/api/unified/alarms/resolve",
      payload: { deviceId: "bsc-1", alarmName: "Yok" },
    });
    expect(res.statusCode).toBe(409);
  });

  it("POST /alarms/resolve — audit log fail-closed: yazılamazsa 500 + DB'ye GİDİLMEZ", async () => {
    const db = makeDb();
    const logger = {
      log: vi.fn().mockRejectedValue(new Error("audit sink down")),
    } as unknown as TamperLogger;
    const app = await buildApp({ db, logger, user: mockUser("teknik") });
    const res = await app.inject({
      method: "POST",
      url: "/api/unified/alarms/resolve",
      payload: { deviceId: "bsc-1", alarmName: "BSC Fault" },
    });
    expect(res.statusCode).toBe(500);
    expect(db.queryOne).not.toHaveBeenCalled();
  });

  it("POST /alarms/resolve — eksik gövde 400", async () => {
    const app = await buildApp({ user: mockUser("teknik") });
    const res = await app.inject({
      method: "POST",
      url: "/api/unified/alarms/resolve",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });
});
