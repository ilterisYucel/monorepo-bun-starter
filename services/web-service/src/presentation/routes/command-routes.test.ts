import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { makeCommandRoutes } from "./command-routes";
import { RequestContext, createRequestIdHook } from "../middleware/request-context";
import { createErrorHandler } from "../middleware/error-handler";
import type { IMessageQueue } from "@gd-monorepo/core";
import { TamperLogger } from "@gd-monorepo/tamper-logger";


vi.mock("../../infrastructure/config-loader", () => ({
  loadDeviceConfig: vi.fn().mockReturnValue({
    deviceId: "bsc-1",
    name: "BSC 1",
    protocol: "modbus",
    connection: {},
    telemetry: [],
    commands: {
      charge: {
        label: "Şarj",
        telemetries: [{ name: "Request", value: "Charge" }],
        params: {
          powerKw: { type: "number", min: 0, max: 100, default: 50, required: true, label: "Güç" },
        },
      },
    },
  }),
}));

/**
 * command-routes sözleşmesi (Faz 0 T0.6):
 * - zod parse hataları sınıra ulaşır (400).
 * - execute: bilinmeyen cihaz/komut 404; mq başarısız → 422; başarı → 200.
 * - execute-multi: parallel/sequential; onFailure=stop ilk hatada durur.
 * - Zamanlı stop planlama: logger varsa audit loglanır, yoksa console
 *   (geriye uyumlu).
 */

function mockMq(overrides: Partial<IMessageQueue> = {}): IMessageQueue {
  return {
    addJob: vi.fn().mockResolvedValue(undefined),
    executeAndWait: vi.fn().mockResolvedValue({ success: true }),
    addRepeatableJob: vi.fn(),
    addRepeatableJobEvery: vi.fn(),
    registerWorker: vi.fn(),
    registerWorkerFor: vi.fn(),
    close: vi.fn(),
    queueStatus: vi.fn(),
    queueStats: vi.fn(),
    health: vi.fn().mockResolvedValue(true),
    ...overrides,
  };
}

async function buildApp(
  mq: IMessageQueue,
  logger?: TamperLogger,
) {
  const app = Fastify();
  const context = new RequestContext();
  app.addHook("onRequest", createRequestIdHook(context));
  app.setErrorHandler(
    createErrorHandler({
      logger: { log: vi.fn().mockResolvedValue(undefined) },
      context,
    }),
  );
  await app.register(
    async (fastify) => {
      await makeCommandRoutes(fastify, { mq, configDir: "./config", logger });
    },
    { prefix: "/api/commands" },
  );
  return app;
}

describe("command-routes (T0.6)", () => {
  it("POST /execute — geçersiz gövde → 400 (zod)", async () => {
    const app = await buildApp(mockMq());
    const res = await app.inject({
      method: "POST",
      url: "/api/commands/execute",
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /execute — bilinmeyen cihaz → 404", async () => {
    vi.mocked(
      (await import("../../infrastructure/config-loader")).loadDeviceConfig,
    ).mockReturnValueOnce(null);
    const app = await buildApp(mockMq());
    const res = await app.inject({
      method: "POST",
      url: "/api/commands/execute",
      payload: { deviceId: "yok", command: "charge", params: { powerKw: 10 } },
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /execute — zorunlu param eksik → 400", async () => {
    const app = await buildApp(mockMq());
    const res = await app.inject({
      method: "POST",
      url: "/api/commands/execute",
      payload: { deviceId: "bsc-1", command: "charge", params: {} },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /execute — başarılı → 200", async () => {
    const app = await buildApp(mockMq());
    const res = await app.inject({
      method: "POST",
      url: "/api/commands/execute",
      payload: { deviceId: "bsc-1", command: "charge", params: { powerKw: 10 } },
    });
    expect(res.statusCode).toBe(200);
  });

  it("POST /execute — mq başarısız → 422", async () => {
    const mq = mockMq({
      executeAndWait: vi.fn().mockResolvedValue({ success: false, reason: "timeout" }),
    });
    const app = await buildApp(mq);
    const res = await app.inject({
      method: "POST",
      url: "/api/commands/execute",
      payload: { deviceId: "bsc-1", command: "charge", params: { powerKw: 10 } },
    });
    expect(res.statusCode).toBe(422);
  });

  it("POST /execute-multi — parallel başarılı → 200", async () => {
    const app = await buildApp(mockMq());
    const res = await app.inject({
      method: "POST",
      url: "/api/commands/execute-multi",
      payload: {
        commands: [
          { deviceId: "bsc-1", command: "charge", params: { powerKw: 10 } },
          { deviceId: "bsc-1", command: "charge", params: { powerKw: 20 } },
        ],
        mode: "parallel",
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().results).toHaveLength(2);
  });

  it("POST /execute-multi — onFailure=stop sequential ilk hatada durur", async () => {
    const mq = mockMq({
      executeAndWait: vi
        .fn()
        .mockResolvedValueOnce({ success: false, reason: "x" })
        .mockResolvedValueOnce({ success: true }),
    });
    const app = await buildApp(mq);
    const res = await app.inject({
      method: "POST",
      url: "/api/commands/execute-multi",
      payload: {
        commands: [
          { deviceId: "bsc-1", command: "charge", params: { powerKw: 10 } },
          { deviceId: "bsc-1", command: "charge", params: { powerKw: 20 } },
        ],
        mode: "sequential",
        onFailure: "stop",
      },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().results).toHaveLength(1);
  });

  it("GET /:deviceId/commands — config yoksa boş liste", async () => {
    vi.mocked(
      (await import("../../infrastructure/config-loader")).loadDeviceConfig,
    ).mockReturnValueOnce(null);
    const app = await buildApp(mockMq());
    const res = await app.inject({
      method: "GET",
      url: "/api/commands/yok/commands",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().commands).toEqual([]);
  });

  it("GET /:deviceId/commands → 200 {commands}", async () => {
    const app = await buildApp(mockMq());
    const res = await app.inject({
      method: "GET",
      url: "/api/commands/bsc-1/commands",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().commands).toHaveLength(1);
  });

  describe("zamanlı stop audit (T0.11)", () => {
    const timedStep = {
      deviceId: "bsc-1",
      command: "charge",
      params: { powerKw: 10, _durationSeconds: 5 },
    };

    it("logger varsa zamanlı stop planlaması audit loglanır", async () => {
      const log = vi.fn().mockResolvedValue(undefined);
      const app = await buildApp(mockMq(), { log } as unknown as TamperLogger);
      const res = await app.inject({
        method: "POST",
        url: "/api/commands/execute-multi",
        payload: { commands: [timedStep], mode: "parallel" },
      });
      expect(res.statusCode).toBe(200);
      const auditEvents = log.mock.calls
        .map((c) => c[0])
        .filter((e: { category: string }) => e.category === "audit");
      expect(auditEvents).toHaveLength(1);
      expect(auditEvents[0].eventCode).toBe("command_executed");
      expect(auditEvents[0].context.deviceId).toBe("bsc-1");
      expect(auditEvents[0].context.timerSeconds).toBe(5);
    });

    it("logger yoksa console bilgi çıktısı (geriye uyumlu)", async () => {
      const info = vi.spyOn(console, "log").mockImplementation(() => {});
      try {
        const app = await buildApp(mockMq());
        await app.inject({
          method: "POST",
          url: "/api/commands/execute-multi",
          payload: { commands: [timedStep], mode: "parallel" },
        });
        expect(info).toHaveBeenCalled();
      } finally {
        info.mockRestore();
      }
    });

    it("planlama hatası logger varsa audit command_rejected", async () => {
      const log = vi.fn().mockResolvedValue(undefined);
      const mq = mockMq({
        addJob: vi.fn().mockRejectedValue(new Error("queue down")),
      });
      const app = await buildApp(mq, { log } as unknown as TamperLogger);
      await app.inject({
        method: "POST",
        url: "/api/commands/execute-multi",
        payload: { commands: [timedStep], mode: "parallel" },
      });
      const rejected = log.mock.calls
        .map((c) => c[0])
        .find((e: { eventCode: string }) => e.eventCode === "command_rejected");
      expect(rejected).toBeDefined();
      expect(rejected.category).toBe("audit");
    });
  });
});
