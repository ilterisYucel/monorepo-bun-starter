import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { makeHealthRoute } from "./health-route";
import { TamperLogger } from "@gd-monorepo/tamper-logger";

import type { ILogSink } from "@gd-monorepo/tamper-logger";

import type { LogEvent } from "@gd-monorepo/tamper-logger";


/**
 * T0.10 — /health log pipeline yansıması kontratı:
 * - Sağlıklı logger → 200 { status:"ok", log:{ status:"healthy", ... } }.
 * - error drop sonrası → status:"degraded" + drop sayaçları görünür.
 * - Mevcut alanlar (timestamp, uptime) korunur.
 */

class FailSink implements ILogSink {
  name(): string {
    return "fail";
  }
  async write(_events: LogEvent[]): Promise<void> {
    throw new Error("disk full");
  }
  async close(): Promise<void> {}
}

async function buildApp(logger: TamperLogger) {
  const app = Fastify();
  app.get("/health", makeHealthRoute({ logger }));
  return app;
}

describe("health-route (T0.10)", () => {
  it("sağlıklı logger → status ok + log yansıması", async () => {
    const logger = new TamperLogger({
      signingKey: "k",
      service: "t",
      sinks: [
        {
          name: () => "mem",
          write: async () => {},
          close: async () => {},
        },
      ],
    });
    const app = await buildApp(logger);
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeDefined();
    expect(body.uptime).toBeDefined();
    expect(body.log.status).toBe("healthy");
    expect(body.log.dropped.total).toBe(0);
  });

  it("error drop sonrası → status degraded + sayaç", async () => {
    const logger = new TamperLogger({
      signingKey: "k",
      service: "t",
      sinks: [new FailSink()],
      batchSize: 1,
    });
    await logger.log({
      level: "error",
      category: "app",
      eventCode: "modbus_read_failed",
      message: "x",
    });
    const app = await buildApp(logger);
    const res = await app.inject({ method: "GET", url: "/health" });
    const body = res.json();
    expect(body.status).toBe("degraded");
    expect(body.log.status).toBe("degraded");
    expect(body.log.dropped.error).toBe(1);
  });
});
