import { describe, it, expect } from "vitest";
import { DebugInjector } from "./debug-injector";
import type { InjectionTarget } from "./debug-injector";

/**
 * KAPANIŞ — DebugInjector: dev-only enjeksiyon HTTP ucu.
 * Gerçek loopback soketi üzerinde `POST /inject` / `GET /health` doğrulanır.
 */
function base(port: number) {
  return `http://127.0.0.1:${port}`;
}

const noopLog = { info: () => {}, warn: () => {} };

describe("DebugInjector", () => {
  it("start → /health 200, bilinmeyen yol 404, stop idempotent", async () => {
    const seen: Array<[string, string]> = [];
    const target: InjectionTarget = {
      inject: (deviceId, scenario) => {
        seen.push([deviceId, scenario]);
        return scenario === "overheat";
      },
    };
    const injector = new DebugInjector(target, { port: 0, host: "127.0.0.1" }, noopLog);
    await injector.start();
    const port = injector.port();
    expect(port).toBeGreaterThan(0);

    const health = await fetch(`${base(port)}/health`);
    expect(health.status).toBe(200);

    const body = { deviceId: "BSC-1", scenario: "overheat" };
    const ok = await fetch(`${base(port)}/inject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ applied: true });
    expect(seen).toEqual([["BSC-1", "overheat"]]);

    const missing = await fetch(`${base(port)}/inject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: "BSC-1", scenario: "bilinmeyen" }),
    });
    expect(missing.status).toBe(404);

    const bad = await fetch(`${base(port)}/inject`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ deviceId: "BSC-1" }),
    });
    expect(bad.status).toBe(400);

    await injector.stop();
    await injector.stop();
  });
});
