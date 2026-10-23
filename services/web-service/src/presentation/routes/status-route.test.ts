import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import { makeStatusRoute } from "./status-route";

/**
 * GET /api/status sözleşmesi (SPEC BOSS-FIELD-UPLINK-ARINDIRMA K4):
 * - Web-service tunnel connector taşımaz; endpoint her zaman offline döner.
 * - Shape sabit: `{ connected:false, state:"offline" }`, `lastHeartbeatAt` yok.
 */
describe("status-route", () => {
  it("her zaman offline durum bildirir", async () => {
    const app = Fastify();
    app.get("/api/status", makeStatusRoute());
    const res = await app.inject({ method: "GET", url: "/api/status" });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ connected: false, state: "offline" });
  });
});
